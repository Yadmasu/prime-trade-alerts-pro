#!/usr/bin/env python3
"""YOYO 24/7 confirmed-signal scanner for Hyperliquid perpetual markets."""
from __future__ import annotations

import asyncio
import json
import math
import os
import time
from dataclasses import dataclass
from pathlib import Path

import aiohttp

HL_API = "https://api.hyperliquid.xyz/info"
ONESIGNAL_API = "https://api.onesignal.com/notifications"
APP_URL = "https://yadmasu.github.io/prime-trade-alerts-pro/"
APP_ID = os.getenv("ONESIGNAL_APP_ID", "79e44e90-939e-4b66-ab64-4012c91d044a")
REST_KEY = os.getenv("ONESIGNAL_REST_API_KEY", "")
STATE_FILE = Path(os.getenv("STATE_FILE", "signal_state.json"))
SCAN_CONCURRENCY = int(os.getenv("SCAN_CONCURRENCY", "16"))
MIN_VOLUME_RATIO = float(os.getenv("MIN_VOLUME_RATIO", "1.2"))
MIN_24H_NOTIONAL = float(os.getenv("MIN_24H_NOTIONAL", "1000000"))
MAX_SIGNAL_AGE = int(os.getenv("MAX_SIGNAL_AGE_SECONDS", "1800"))
BTC_EXCLUDED = os.getenv("BTC_EXCLUDED", "true").lower() == "true"
DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"
RUN_ONCE = os.getenv("RUN_ONCE", "false").lower() == "true"


@dataclass
class Market:
    coin: str
    notional: float
    mid: float


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
    for attempt in range(4):
        try:
            async with session.post(HL_API, json=body, timeout=20) as response:
                if response.status == 429:
                    await asyncio.sleep(2 ** attempt)
                    continue
                response.raise_for_status()
                return await response.json()
        except (aiohttp.ClientError, asyncio.TimeoutError):
            if attempt == 3:
                raise
            await asyncio.sleep(1 + attempt)
    raise RuntimeError("Hyperliquid request failed")


async def discover_markets(session: aiohttp.ClientSession) -> list[Market]:
    dexes = [""]
    try:
        rows = await post(session, {"type": "perpDexs"})
        for row in rows or []:
            name = row if isinstance(row, str) else row[0] if isinstance(row, list) else row.get("name")
            if name and name != "default" and name not in dexes:
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
                markets.append(Market(coin, notional, mid))
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
    duration = 900_000 if interval == "15m" else 3_600_000
    unique = {}
    for item in raw or []:
        row = {key: float(item[key]) for key in ("o", "h", "l", "c", "v")}
        row["t"] = int(item["t"])
        if row["t"] + duration <= now and row["c"] > 0 and row["o"] > 0:
            unique[row["t"]] = row
    return sorted(unique.values(), key=lambda row: row["t"])


def confirmed_signal(rows15: list[dict], rows1h: list[dict]) -> dict | None:
    if len(rows15) < 110 or len(rows1h) < 95:
        return None
    close15 = [row["c"] for row in rows15]
    close1h = [row["c"] for row in rows1h]
    fast15, slow15 = ema(close15, 21), ema(close15, 89)
    fast1h, slow1h = ema(close1h, 21), ema(close1h, 89)
    last, hour = rows15[-1], rows1h[-1]
    long_aligned = last["c"] > fast15[-1] > slow15[-1] and hour["c"] > fast1h[-1] > slow1h[-1]
    short_aligned = last["c"] < fast15[-1] < slow15[-1] and hour["c"] < fast1h[-1] < slow1h[-1]
    if not long_aligned and not short_aligned:
        return None
    side = "LONG" if long_aligned else "SHORT"
    average_range = atr(rows15)
    vr = volume_ratio(rows15)
    if not math.isfinite(average_range) or not math.isfinite(vr) or vr < MIN_VOLUME_RATIO:
        return None
    if time.time() * 1000 - (last["t"] + 900_000) > MAX_SIGNAL_AGE * 1000:
        return None

    previous = rows15[-5:-1]
    start = len(rows15) - 5
    touch = any(
        row["l"] <= fast15[start + offset] + average_range * .15
        and row["h"] >= fast15[start + offset] - average_range * .15
        for offset, row in enumerate(previous)
    )
    breakout = (
        last["c"] > max(row["h"] for row in previous)
        if side == "LONG"
        else last["c"] < min(row["l"] for row in previous)
    )
    strong_close = (
        last["c"] > last["o"] and last["c"] > fast15[-1] and last["c"] - last["o"] >= average_range * .20
        if side == "LONG"
        else last["c"] < last["o"] and last["c"] < fast15[-1] and last["o"] - last["c"] >= average_range * .20
    )
    if not (touch and breakout and strong_close):
        return None

    entry = last["c"]
    structure = min(row["l"] for row in rows15[-6:]) if side == "LONG" else max(row["h"] for row in rows15[-6:])
    stop = (
        min(structure - average_range * .15, entry - average_range * 1.35)
        if side == "LONG"
        else max(structure + average_range * .15, entry + average_range * 1.35)
    )
    risk = abs(entry - stop)
    if risk <= 0 or risk / entry > .07:
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
    }


async def scan_market(session: aiohttp.ClientSession, semaphore: asyncio.Semaphore, market: Market):
    async with semaphore:
        try:
            rows15, rows1h = await asyncio.gather(
                candles(session, market.coin, "15m", 13),
                candles(session, market.coin, "1h", 17),
            )
            return market, confirmed_signal(rows15, rows1h)
        except Exception:
            return market, None


def fmt(value: float) -> str:
    if value >= 100:
        return f"{value:.2f}"
    if value >= 1:
        return f"{value:.4f}"
    return f"{value:.6f}"


async def send_push(session: aiohttp.ClientSession, market: Market, signal: dict) -> None:
    title = f"YOYO · {signal['side']} · {market.coin}"
    body = (
        f"ENTRY {fmt(signal['entry'])} | SL {fmt(signal['stop'])} | "
        f"TP1 {fmt(signal['tp1'])} | TP2 {fmt(signal['tp2'])} | "
        f"TP3 {fmt(signal['tp3'])} | VOL {signal['volume']:.2f}×"
    )
    if DRY_RUN:
        print(title, body, flush=True)
        return
    if not REST_KEY:
        raise RuntimeError("ONESIGNAL_REST_API_KEY is missing")
    headers = {"Authorization": f"Key {REST_KEY}", "Content-Type": "application/json"}
    payload = {
        "app_id": APP_ID,
        "included_segments": ["Subscribed Users"],
        "headings": {"en": title},
        "contents": {"en": body},
        "url": f"{APP_URL}?market={market.coin}",
        "web_url": f"{APP_URL}?market={market.coin}",
        "data": {"market": market.coin, **signal},
    }
    async with session.post(ONESIGNAL_API, headers=headers, json=payload, timeout=20) as response:
        if response.status >= 300:
            raise RuntimeError(f"OneSignal {response.status}: {await response.text()}")


def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text())
    except Exception:
        return {}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, separators=(",", ":")))


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
        for market, signal in results:
            if not signal:
                continue
            key = f"{market.coin}:{signal['side']}:{signal['candle']}"
            if key in state:
                continue
            await send_push(session, market, signal)
            state[key] = now
            save_state(state)


async def main() -> None:
    while True:
        try:
            await run_cycle()
        except Exception as error:
            print(f"Scan failed: {error}", flush=True)
        if RUN_ONCE:
            return
        now = time.time()
        next_run = (math.floor(now / 900) + 1) * 900 + 35
        await asyncio.sleep(max(30, next_run - now))


if __name__ == "__main__":
    asyncio.run(main())
