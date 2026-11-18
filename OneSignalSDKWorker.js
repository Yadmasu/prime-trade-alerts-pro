importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Keep the received event on this installation so a delayed tap opens its own chart.
self.addEventListener("push", event => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
    const custom = typeof payload.custom === "string" ? JSON.parse(payload.custom) : payload.custom;
    const signal = custom?.a ?? payload.data;
    if (!signal || typeof signal.chart_id !== "string" || !/^[a-f0-9]{32}$/.test(signal.chart_id)) return;
    const key = new URL("signal-cache/" + signal.chart_id, self.registration.scope);
    event.waitUntil(caches.open("prime-confirmed-v1").then(cache =>
      cache.put(key.href, new Response(JSON.stringify(signal), {headers:{"Content-Type":"application/json"}}))));
  } catch { /* Other OneSignal payloads still follow the existing SDK handler. */ }
});
