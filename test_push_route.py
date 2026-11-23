import time
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
import scanner as s

class PrimeTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.market = s.Market("ETH", 2e6, 80, 2)
        self.sig = dict(side="LONG", entry=100., stop=98., tp1=104., tp2=106., tp3=108.,
                        volume=2., candle=int(time.time()*1000)-900010, max_drift=.5,
                        chart_id="a"*32)

    async def cycle(self, price):
        with patch.object(s,"discover_markets",AsyncMock(return_value=[self.market])), \
             patch.object(s,"scan_market",AsyncMock(return_value=(self.market,self.sig))), \
             patch.object(s,"post",AsyncMock(return_value={"ETH":price})), \
             patch.object(s,"load_state",return_value={}),patch.object(s,"save_state"), \
             patch.object(s,"send_push",AsyncMock()) as send:
            await s.run_cycle()
            return send.await_count

    async def test_fresh_mid(self):
        self.assertEqual(await self.cycle("100.01"),1)
        for mid in ("nan",0,101,None):
            self.assertEqual(await self.cycle(mid),0)
        self.sig["candle"] -= 3600000
        self.assertEqual(await self.cycle(100),0)

    async def test_device_routing(self):
        device="12345678-1234-4123-8123-123456789012"
        session=MagicMock()
        res=session.post.return_value.__aenter__.return_value
        res.status=200
        res.json=AsyncMock(return_value={"id":"test-receipt"})
        with patch.dict(s.os.environ,ONESIGNAL_SUBSCRIPTION_ID=device), \
             patch.object(s,"REST_KEY","test"),patch.object(s,"DRY_RUN",False):
            await s.send_push(session,self.market,self.sig)
            payload=session.post.call_args.kwargs["json"]
            self.assertEqual(payload["include_subscription_ids"],[device])
            self.assertNotIn("included_segments",payload)
            self.assertIn(self.sig["chart_id"],payload["web_url"])
            res.json.return_value={"id":"","recipients":0}
            with self.assertRaises(RuntimeError):
                await s.send_push(session,self.market,self.sig)
