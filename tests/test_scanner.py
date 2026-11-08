import os
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


class ScannerTests(unittest.TestCase):
    def test_no_signal_with_insufficient_4h_data(self):
        self.assertIsNone(scanner.confirmed_signal(candles(120, 15), candles(100, 60), candles(94, 240)))

    def test_no_signal_on_opposing_4h_trend(self):
        self.assertIsNone(scanner.confirmed_signal(candles(120, 15), candles(100, 60), candles(100, 240, rising=False)))

    def test_no_signal_without_volume_confirmation(self):
        self.assertIsNone(scanner.confirmed_signal(candles(120, 15), candles(100, 60), candles(100, 240)))

    def test_min_volume_ratio(self):
        self.assertGreaterEqual(scanner.MIN_VOLUME_RATIO, 1.5)


if __name__ == "__main__":
    unittest.main()
