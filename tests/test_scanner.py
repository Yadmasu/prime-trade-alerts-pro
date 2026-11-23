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


if __name__ == "__main__":
    unittest.main()
