"""Send one labeled TEST to a uniquely matched, active Prime iPhone subscription."""
import hashlib
import json
import os
import sys
import uuid
from urllib.parse import urlencode
from urllib.request import Request, urlopen

def api(path, key, payload=None):
    req = Request("https://api.onesignal.com/" + path,
                  headers={"Authorization": "Key " + key, "Content-Type": "application/json"},
                  data=json.dumps(payload).encode() if payload else None)
    with urlopen(req, timeout=25) as response:
        return json.load(response)

def test_phone(prefix, app_id, key, run_id):
    if len(prefix) < 8 or any(c not in "0123456789abcdef" for c in prefix):
        raise ValueError("Invalid subscription prefix")
    if not key:
        raise RuntimeError("OneSignal REST key unavailable")
    matches = []
    seen = 0
    matched_ids = 0
    offset = 0
    while True:
        page = api("players?" + urlencode({"app_id":app_id,"limit":300,"offset":offset}),key)
        players = page["players"]
        seen += len(players)
        candidates = [p for p in players if p["id"].startswith(prefix) or p["id"].endswith(prefix)]
        matched_ids += len(candidates)
        matches.extend(p["id"] for p in candidates if p.get("device_type") in (7, 17) and "iphone" in str(p.get("device_model","")).lower()
                       and p.get("identifier") and not p.get("invalid_identifier")
                       and p.get("notification_types") in (None, 1))
        offset += len(players)
        if not players or offset >= page["total_count"]:
            break
    if len(matches) != 1:
        raise RuntimeError(f"Matched {matched_ids} of {seen} subscription IDs, {len(matches)} eligible iPhones")
    notification = api("notifications", key, {
        "app_id":app_id, "target_channel":"push","include_subscription_ids":matches,
        "idempotency_key":str(uuid.UUID(bytes=hashlib.sha256(("prime-phone-check/"+run_id).encode()).digest()[:16],version=4)),
        "headings":{"en":"PRIME TRADE ALERTS PRO · TEST"},
        "contents":{"en":"iPhone push delivery test. Tap to open Prime."},
        "url":"https://yadmasu.github.io/prime-trade-alerts-pro/"})
    if not notification.get("id") or notification.get("recipients") == 0:
        raise RuntimeError("OneSignal returned no deliverable notification")
    print("OneSignal accepted targeted iPhone TEST", notification["id"], flush=True)

if __name__ == "__main__":
    test_phone(sys.argv[1], os.environ["ONESIGNAL_APP_ID"],os.getenv("ONESIGNAL_REST_API_KEY"),
               os.environ["GITHUB_RUN_ID"])
