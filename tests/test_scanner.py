from datetime import datetime
import unittest
from unittest.mock import patch

import scanner


def candles(count, minutes, rising=True):
    base = 100.0
    rows = []
    for i in range(count):
        price = base + (i * 0.1 if rising else -i * 0.1)
        rows.append({"t": i * minutes * 60_000, "o": price - .02, "h": price + .2,
                     "l": price - .2, "c": price, "v": 100.0})
    return rows


class MarketDiscoveryTests(unittest.IsolatedAsyncioTestCase):
    async def test_null_default_marker_preserves_named_dexes(self):
        metadata = [{"universe": [{"name": "TEST", "szDecimals": 2}]},
                    [{"midPx": "100", "dayNtlVlm": "2000000"}]]
        with patch("scanner.post", side_effect=[[None, {"name": "xyz"}], metadata, metadata]) as post:
            markets = await scanner.discover_markets(None)
        self.assertEqual([market.coin for market in markets], ["TEST", "xyz:TEST"])
        self.assertEqual(post.await_args.args[1]["dex"], "xyz")


class ScannerTests(unittest.TestCase):
    def test_no_signal_with_insufficient_4h_data(self):
        self.assertIsNone(scanner.confirmed_signal(candles(120, 15), candles(100, 60), candles(94, 240)))

    def test_no_signal_on_opposing_4h_trend(self):
        self.assertIsNone(scanner.confirmed_signal(candles(120, 15), candles(100, 60), candles(100, 240, rising=False)))

    def test_no_signal_without_volume_confirmation(self):
        self.assertIsNone(scanner.confirmed_signal(candles(120, 15), candles(100, 60), candles(100, 240)))

    def test_confirmed_breakouts_in_both_directions(self):
        end = int(datetime(2026, 11, 23, 11, tzinfo=scanner.NY).timestamp() * 1000)
        for side, direction in (("LONG", 1), ("SHORT", -1)):
            with self.subTest(side=side), patch("scanner.time.time", return_value=end / 1000 + 901):
                rows = [{"t": end - (119 - i) * 900_000, "o": 100, "c": 100,
                         "h": 100.1, "l": 99.9, "v": 100} for i in range(120)]
                price = 100 + direction * 2
                rows[-1].update(c=price, h=max(price, 100.1), l=min(price, 99.9), v=220)
                signal = scanner.confirmed_signal(rows, candles(100, 60, direction > 0),
                                                  candles(100, 240, direction > 0))
                self.assertIsNotNone(signal)
                self.assertEqual(signal["side"], side)
                self.assertEqual((signal["orh"], signal["orl"]), (100.1, 99.9))
                self.assertGreater(direction * (price - signal["anchored_vwap"]), 0)

    def test_min_volume_ratio(self):
        self.assertGreaterEqual(scanner.MIN_VOLUME_RATIO, 1.5)



class SessionAndParityTests(unittest.TestCase):
    def test_ema_sma_seed(self):
        import math
        result = scanner.ema([1, 2, 3, 4, 5], 3)
        self.assertTrue(math.isnan(result[0]))
        self.assertEqual(result[2:], [2.0, 3.0, 4.0])

    def test_weekend_midnight_and_dst(self):
        from datetime import timezone
        cases = [
            ("2026-11-28T05:00:00+00:00", "2026-11-28T00:00:00+00:00"),
            ("2026-11-28T08:15:00+00:00", "2026-11-28T00:00:00+00:00"),
            ("2026-11-28T08:30:00+00:00", "2026-11-28T08:00:00+00:00"),
            ("2026-11-29T15:00:00+00:00", "2026-11-29T14:30:00+00:00"),
            ("2026-07-12T07:30:00+00:00", "2026-07-12T07:00:00+00:00"),
        ]
        for stamp, expected in cases:
            with self.subTest(stamp=stamp):
                end = int(datetime.fromisoformat(stamp).timestamp()*1000)
                anchor = int(datetime.fromisoformat(expected).timestamp()*1000)
                self.assertEqual(scanner.session_anchor(end), anchor)
                rows = [{"t": t, "o": 100, "h": 101, "l": 99, "c": 100, "v": 10}
                        for t in range(anchor, end+1, 900000)]
                self.assertEqual(scanner.opening_range_and_vwap(rows), (101,99,100))
                self.assertIsNone(scanner.opening_range_and_vwap(rows[1:]))

    def test_volume_uses_previous_twenty(self):
        rows = [{"v": 10000}] + [{"v": 100}]*20 + [{"v": 150}]
        self.assertEqual(scanner.volume_ratio(rows), 1.5)


class FreshPriceTests(unittest.IsolatedAsyncioTestCase):
    async def test_fresh_price_and_rejections(self):
        market = scanner.Market("TEST", 2000000, 100, 2)
        signal = {"side":"LONG","entry":100,"stop":98,"max_drift":0.5,"candle":1000000}
        for px, notional, now, expected in [
            (100,2000000,1901,True), (101,2000000,1901,False),
            (100,500000,1901,False), (100,2000000,1800,False),
            (100,2000000,4000,False),
        ]:
            data = [{"universe":[{"name":"TEST"}]},[{"midPx":str(px),"dayNtlVlm":str(notional)}]]
            with patch("scanner.post",return_value=data), patch("scanner.time.time",return_value=now):
                self.assertEqual(await scanner.verify_fresh_signal(None,market,signal),expected)


if __name__ == "__main__":
    unittest.main()
