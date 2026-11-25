#!/usr/bin/env python3
"""YOYO 24/7 confirmed-signal scanner for Hyperliquid perpetual markets."""
from __future__ import annotations

import asyncio
import json
import math
import os
import time
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from dataclasses import dataclass
from pathlib import Path

import aiohttp

HL_API = "https://api.hyperliquid.xyz/info"
ONESIGNAL_API = "https://api.onesignal.com/notifications"
APP_URL = "https://yadmasu.github.io/prime-trade-alerts-pro/"
APP_ID = os.getenv("ONESIGNAL_APP_ID", "79e44e90-939e-4b66-ab64-4012c91d044a")
REST_KEY = os.getenv("ONESIGNAL_REST_API_KEY", "")
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHATS = [c.strip() for c in os.getenv("TELEGRAM_CHAT_IDS", os.getenv("TELEGRAM_CHAT_ID", "")).split(",") if c.strip()]
STATE_FILE = Path(os.getenv("STATE_FILE", "signal_state.json"))
SCAN_CONCURRENCY = int(os.getenv("SCAN_CONCURRENCY", "16"))
MIN_VOLUME_RATIO = max(1.5, float(os.getenv("MIN_VOLUME_RATIO", "1.5")))
MIN_24H_NOTIONAL = float(os.getenv("MIN_24H_NOTIONAL", "1000000"))
MAX_SIGNAL_AGE = int(os.getenv("MAX_SIGNAL_AGE_SECONDS", "1800"))
MAX_ALERTS_PER_RUN = min(1, max(0, int(os.getenv("MAX_ALERTS_PER_RUN", "1"))))
BTC_EXCLUDED = os.getenv("BTC_EXCLUDED", "false").lower() == "true"
DRY_RUN = os.getenv("DRY_RUN", "true").lower() not in ("false", "0", "no")
RUN_ONCE = os.getenv("RUN_ONCE", "false").lower() == "true"


@dataclass
class Market:
    coin: str
    notional: float
    mid: float
    size_decimals: int = 0


def ema(values: list[float], period: int) -> list[float]:
    alpha = 2 / (period + 1)
    out: list[float] = []
    current = values[0]
    for value in values:
        current = value * alpha + current * (1 - alpha)
        out.append(current)
    return out


def atr(rows: list[dict], period: int = 14) -> float:
    ranges = []
    for i in range(1, len(rows)):
        ranges.append(max(
            rows[i]["h"] - rows[i]["l"],
            abs(rows[i]["h"] - rows[i - 1]["c"]),
            abs(rows[i]["l"] - rows[i - 1]["c"]),
        ))
    return sum(ranges[-period:]) / period if len(ranges) >= period else math.nan


def volume_ratio(rows: list[dict]) -> float:
    prior = [row["v"] for row in rows[-22:-1]]
    average = sum(prior) / len(prior) if prior else 0
    return rows[-1]["v"] / average if average > 0 else math.nan


async def post(session: aiohttp.ClientSession, body: dict) -> object:
    """Retry throttled and transient API requests without relaxing signals."""
    import random
    from datetime import datetime, timezone
    from email.utils import parsedate_to_datetime

    for attempt in range(4):
        try:
            async with session.post(HL_API, json=body, timeout=20) as response:
                if response.status == 429:
                    print(f"Hyperliquid HTTP 429 request={body.get('type')} attempt={attempt + 1}", flush=True)
                if response.status in (429, 500, 502, 503, 504):
                    if attempt == 3:
                        response.raise_for_status()
                    header = response.headers.get("Retry-After", "")
                    try:
                        wait = float(header)
                    except (ValueError, TypeError):
                        try:
                            wait = (parsedate_to_datetime(header) - datetime.now(timezone.utc)).total_seconds()
                        except (ValueError, TypeError, OverflowError):
                            wait = min(60.0, 2 ** (attempt + 1)) + random.uniform(0, 1)
                    await asyncio.sleep(max(0.0, min(120.0, wait)))
                    continue
                response.raise_for_status()
                return await response.json()
        except (aiohttp.ClientError, asyncio.TimeoutError):
            if attempt == 3:
                raise
            await asyncio.sleep(min(60.0, 2 ** (attempt + 1)) + random.uniform(0, 1))
    raise RuntimeError("Hyperliquid request failed")

async def discover_markets(session: aiohttp.ClientSession) -> list[Market]:
    dexes = [""]
    try:
        rows = await post(session, {"type": "perpDexs"})
        for row in rows or []:
            if isinstance(row, dict):
                name = row.get("name")
            elif isinstance(row, list) and row:
                name = row[0]
            elif isinstance(row, str):
                name = row
            else:
                continue
            if isinstance(name, str) and name and name != "default" and name not in dexes:
                dexes.append(name)
    except Exception:
        pass

    markets: list[Market] = []
    for dex in dexes:
        body = {"type": "metaAndAssetCtxs"}
        if dex:
            body["dex"] = dex
        try:
            data = await post(session, body)
        except Exception:
            continue
        universe = (data[0] or {}).get("universe", [])
        contexts = data[1] or []
        for index, asset in enumerate(universe):
            name = asset.get("name", "")
            if asset.get("isDelisted") or (BTC_EXCLUDED and name == "BTC"):
                continue
            context = contexts[index] if index < len(contexts) else {}
            coin = f"{dex}:{name}" if dex and ":" not in name else name
            mid = float(context.get("midPx") or context.get("markPx") or 0)
            notional = float(context.get("dayNtlVlm") or 0)
            if mid > 0 and notional >= MIN_24H_NOTIONAL:
                markets.append(Market(coin, notional, mid, int(asset["szDecimals"])))
    return markets


async def candles(session: aiohttp.ClientSession, coin: str, interval: str, days: int) -> list[dict]:
    now = int(time.time() * 1000)
    raw = await post(session, {
        "type": "candleSnapshot",
        "req": {
            "coin": coin,
            "interval": interval,
            "startTime": now - days * 86_400_000,
            "endTime": now,
        },
    })
    duration = {"15m": 900_000, "1h": 3_600_000, "4h": 14_400_000}[interval]
    unique = {}
    for item in raw or []:
        row = {key: float(item[key]) for key in ("o", "h", "l", "c", "v")}
        row["t"] = int(item["t"])
        if row["t"] + duration <= now and row["c"] > 0 and row["o"] > 0:
            unique[row["t"]] = row
    return sorted(unique.values(), key=lambda row: row["t"])


NY = ZoneInfo("America/New_York")

def opening_range_and_vwap(rows: list[dict]) -> tuple[float, float, float] | None:
    """NY 09:30-10:00 ET range; VWAP anchored to 09:30, completed candles only."""
    if not rows:
        return None
    latest = datetime.fromtimestamp(rows[-1]["t"] / 1000, timezone.utc).astimezone(NY)
    if latest.weekday() >= 5 or (latest.hour, latest.minute) < (10, 0):
        return None
    session = []
    opening = []
    for row in rows:
        dt = datetime.fromtimestamp(row["t"] / 1000, timezone.utc).astimezone(NY)
        if dt.date() != latest.date():
            continue
        if (dt.hour, dt.minute) >= (9, 30):
            session.append(row)
        if (9, 30) <= (dt.hour, dt.minute) < (10, 0):
            opening.append(row)
    if len(opening) != 2 or len(session) < 3:
        return None
    volume = sum(row["v"] for row in session)
    if volume <= 0:
        return None
    vwap = sum((row["h"] + row["l"] + row["c"]) / 3 * row["v"] for row in session) / volume
    return max(row["h"] for row in opening), min(row["l"] for row in opening), vwap


def confirmed_signal(rows15: list[dict], rows1h: list[dict], rows4h: list[dict]) -> dict | None:
    if len(rows15) < 110 or len(rows1h) < 95 or len(rows4h) < 95:
        return None
    close15 = [row["c"] for row in rows15]
    close1h = [row["c"] for row in rows1h]
    ema9_15, ema21_15 = ema(close15, 9), ema(close15, 21)
    ema9_1h, ema21_1h = ema(close1h, 9), ema(close1h, 21)
    close4h = [row["c"] for row in rows4h]
    ema9_4h, ema21_4h = ema(close4h, 9), ema(close4h, 21)
    last = rows15[-1]
    opening = opening_range_and_vwap(rows15)
    if opening is None:
        return None
    orh, orl, anchored_vwap = opening
    long_aligned = (ema9_15[-1] > ema21_15[-1] and
                    rows1h[-1]["c"] > ema9_1h[-1] > ema21_1h[-1] and
                    rows4h[-1]["c"] > ema9_4h[-1] > ema21_4h[-1])
    short_aligned = (ema9_15[-1] < ema21_15[-1] and
                     rows1h[-1]["c"] < ema9_1h[-1] < ema21_1h[-1] and
                     rows4h[-1]["c"] < ema9_4h[-1] < ema21_4h[-1])
    cross_up = any(ema9_15[i-1] <= ema21_15[i-1] and ema9_15[i] > ema21_15[i]
                   for i in range(max(1, len(rows15)-8), len(rows15)))
    cross_down = any(ema9_15[i-1] >= ema21_15[i-1] and ema9_15[i] < ema21_15[i]
                     for i in range(max(1, len(rows15)-8), len(rows15)))
    long_ready = long_aligned and cross_up and last["c"] > anchored_vwap and last["c"] > orh
    short_ready = short_aligned and cross_down and last["c"] < anchored_vwap and last["c"] < orl
    if not (long_ready or short_ready):
        return None
    side = "LONG" if long_ready else "SHORT"
    average_range = atr(rows15)
    vr = volume_ratio(rows15)
    if not math.isfinite(average_range) or not math.isfinite(vr) or vr < MIN_VOLUME_RATIO:
        return None
    if time.time() * 1000 - (last["t"] + 900_000) > MAX_SIGNAL_AGE * 1000:
        return None

    previous = rows15[-6:-1]
    breakout = (last["c"] > max(row["h"] for row in previous)
                if side == "LONG" else last["c"] < min(row["l"] for row in previous))
    strong_close = (
        last["c"] > last["o"] and last["c"] > ema9_15[-1] and
        last["c"] - last["o"] >= average_range * .20
        if side == "LONG" else
        last["c"] < last["o"] and last["c"] < ema9_15[-1] and
        last["o"] - last["c"] >= average_range * .20
    )
    if not (breakout and strong_close):
        return None

    entry = last["c"]
    structure = min(row["l"] for row in rows15[-6:]) if side == "LONG" else max(row["h"] for row in rows15[-6:])
    stop = (
        min(structure - average_range * .15, entry - average_range * 1.35)
        if side == "LONG"
        else max(structure + average_range * .15, entry + average_range * 1.35)
    )
    risk = abs(entry - stop)
    if risk <= 0 or not .015 <= risk / entry <= .03:
        return None
    direction = 1 if side == "LONG" else -1
    return {
        "side": side,
        "candle": last["t"],
        "entry": entry,
        "stop": stop,
        "tp1": entry + direction * 2 * risk,
        "tp2": entry + direction * 3 * risk,
        "tp3": entry + direction * 4 * risk,
        "volume": vr,
        "orh": orh, "orl": orl, "anchored_vwap": anchored_vwap,
        "max_drift": min(entry * .005, average_range * .35),
    }


async def scan_market(session: aiohttp.ClientSession, semaphore: asyncio.Semaphore, market: Market):
    async with semaphore:
        try:
            rows15 = await candles(session, market.coin, "15m", 13)
            # These existing requirements depend only on the closed 15m bars.
            # Avoid two history requests when this market already fails them.
            if len(rows15) < 110 or not volume_ratio(rows15) >= MIN_VOLUME_RATIO:
                return market, None
            rows1h, rows4h = await asyncio.gather(
                candles(session, market.coin, "1h", 17),
                candles(session, market.coin, "4h", 45),
            )
            signal = confirmed_signal(rows15, rows1h, rows4h)
            if signal:
                import hashlib
                import struct
                stamp = datetime.fromtimestamp(signal["candle"]/1000, NY)
                anchor = stamp.replace(hour=9, minute=30, second=0, microsecond=0)
                digest = hashlib.sha256()
                for row in rows15:
                    digest.update(struct.pack(">6d", *(row[k] for k in ("t","o","h","l","c","v"))))
                signal.update(size_decimals=market.size_decimals, first=rows15[0]["t"], anchor=int(anchor.timestamp()*1000),
                              history_hash=digest.hexdigest(),
                              chart_id=hashlib.sha256(f"{market.coin}/{signal['candle']}/{signal['side']}".encode()).hexdigest()[:32])
            return market, signal
        except Exception as error:
            print(f"Market scan failed market={market.coin} error={type(error).__name__}", flush=True)
            return market, None


def fmt(value: float, size_decimals:int) -> str:
    from decimal import Decimal
    price = Decimal(str(value))
    places = max(0, min(6 - size_decimals, 4 - price.adjusted()))
    return format(price, f".{places}f")


async def send_push(session: aiohttp.ClientSession, market: Market, signal: dict) -> None:
    title = f"PRIME TRADE ALERTS PRO · {signal['side']} · {market.coin}"
    body = (
        f"ENTRY {fmt(signal['entry'], market.size_decimals)} | SL {fmt(signal['stop'], market.size_decimals)} | "
        f"TP1 {fmt(signal['tp1'], market.size_decimals)} | TP2 {fmt(signal['tp2'], market.size_decimals)} | "
        f"TP3 {fmt(signal['tp3'], market.size_decimals)} | VOL {signal['volume']:.2f}×"
    )
    if DRY_RUN:
        print(title, body, flush=True)
        return
    if not REST_KEY:
        print("Push delivery unavailable: OneSignal REST key not configured", flush=True)
        return
    headers = {"Authorization": f"Key {REST_KEY}", "Content-Type": "application/json"}
    payload = {
        "app_id": APP_ID,
        "target_channel": "push",
        "included_segments": ["Total Subscriptions"],
        "idempotency_key": str(uuid.UUID(signal["chart_id"], version=4)),
        "headings": {"en": title},
        "contents": {"en": body},
        "web_url": f"{APP_URL}confirmed.html?signal={signal['chart_id']}",
        "data": {"market": market.coin, **signal},
    }
    for attempt in range(4):
        try:
            async with session.post(ONESIGNAL_API, headers=headers, json=payload, timeout=20) as response:
                if response.status < 300:
                    receipt = await response.json(content_type=None)
                    notification_id = receipt.get("id") if isinstance(receipt, dict) else None
                    recipients = receipt.get("recipients") if isinstance(receipt, dict) else None
                    if not notification_id or recipients == 0:
                        raise RuntimeError("OneSignal accepted request without a deliverable notification (no id or zero recipients)")
                    print(f"OneSignal accepted: notification_id={notification_id} recipients={recipients if recipients is not None else 'unknown'} market={market.coin}", flush=True)
                    return
                message = await response.text()
                if response.status not in (429, 500, 502, 503, 504) or attempt == 3:
                    raise RuntimeError(f"OneSignal {response.status}: {message}")
        except (aiohttp.ClientConnectionError, asyncio.TimeoutError):
            if attempt == 3:
                raise
        await asyncio.sleep(2 ** attempt)


def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text())
    except Exception:
        return {}


def save_state(state: dict) -> None:
    temp = STATE_FILE.with_suffix(".tmp")
    temp.write_text(json.dumps(state, separators=(",", ":")))
    temp.replace(STATE_FILE)


async def run_cycle() -> None:
    connector = aiohttp.TCPConnector(limit=SCAN_CONCURRENCY)
    async with aiohttp.ClientSession(connector=connector, trust_env=True) as session:
        markets = await discover_markets(session)
        print(f"Scanning {len(markets)} liquid perpetual markets", flush=True)
        semaphore = asyncio.Semaphore(SCAN_CONCURRENCY)
        results = await asyncio.gather(*(scan_market(session, semaphore, market) for market in markets))
        state = load_state()
        now = int(time.time())
        state = {key: value for key, value in state.items() if now - int(value) < 14 * 86_400}
        candidates = []
        for market, signal in results:
            if not signal:
                continue
            key = f"{market.coin}:{signal['side']}:{signal['candle']}"
            if key in state:
                continue
            if abs(market.mid - signal["entry"]) > signal["max_drift"]:
                print(f"Skip stale price {market.coin}", flush=True)
                continue
            candidates.append((market, signal, key))

        candidates.sort(
            key=lambda item: (item[1]["volume"], item[0].notional),
            reverse=True,
        )
        print(f"Confirmed fresh signal candidates: {len(candidates)}", flush=True)
        for market, signal, key in candidates[:MAX_ALERTS_PER_RUN]:
            if not REST_KEY and not DRY_RUN:
                raise RuntimeError("No notification channel configured")
            await send_push(session, market, signal)
            if not DRY_RUN:
                state[key] = now
                save_state(state)


async def main() -> None:
    while True:
        try:
            await run_cycle()
        except Exception as error:
            print(f"Scan failed: {error}", flush=True)
            if RUN_ONCE:
                raise
        if RUN_ONCE:
            return
        now = time.time()
        next_run = (math.floor(now / 900) + 1) * 900 + 35
        await asyncio.sleep(max(30, next_run - now))


if __name__ == "__main__":
    asyncio.run(main())
