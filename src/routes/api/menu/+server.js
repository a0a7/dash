// @ts-ignore
export async function GET({ url, platform }) {
  const searchParams = url.searchParams;
  const location = searchParams.get("location");
  const date = searchParams.get("date");
  const period = searchParams.get("period"); // optional
  const day = searchParams.get("day") || "today"; // "today" or "tomorrow"

  if (!location || !date) {
    return new Response("Missing location or date", { status: 400 });
  }

  // KV binding is available as locals.env.UMN_MENUS in SvelteKit on Cloudflare
  const env = platform?.env;

  const todayKey = period
    ? `menu:${location}:${period}:${date}`
    : `periods:${location}:${date}`;
  const dateObj = new Date(date);
  const tomorrowObj = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);
  const tomorrowKey = period
    ? `menu:${location}:${period}:${tomorrowStr}`
    : `periods:${location}:${tomorrowStr}`;

  let todayCached = await env?.UMN_MENUS.get(todayKey, "json");
  let tomorrowCached = await env?.UMN_MENUS.get(tomorrowKey, "json");

  if (!todayCached) {
    let apiUrl = `https://apiv4.dineoncampus.com/locations/${location}/periods/`;
    if (period) apiUrl += `${period}`;
    apiUrl += `?date=${encodeURIComponent(date)}`;
    const apiRes = await fetch(apiUrl, {
      headers: { accept: "application/json, text/plain, */*" },
    });
    if (apiRes.ok) {
      todayCached = await apiRes.json();
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const secondsUntilEndOfDay = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
      await env?.UMN_MENUS.put(todayKey, JSON.stringify(todayCached), { expirationTtl: secondsUntilEndOfDay });
    }
  }
  if (!tomorrowCached) {
    let apiUrl = `https://apiv4.dineoncampus.com/locations/${location}/periods/`;
    if (period) apiUrl += `${period}`;
    apiUrl += `?date=${encodeURIComponent(tomorrowStr)}`;
    const apiRes = await fetch(apiUrl, {
      headers: { accept: "application/json, text/plain, */*" },
    });
    if (apiRes.ok) {
      tomorrowCached = await apiRes.json();
      const now = new Date();
      const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0, 0);
      const secondsUntilEndOfTomorrow = Math.floor((endOfTomorrow.getTime() - now.getTime()) / 1000);
      await env?.UMN_MENUS.put(tomorrowKey, JSON.stringify(tomorrowCached), { expirationTtl: secondsUntilEndOfTomorrow });
    }
  }

  if (day === "tomorrow") {
    if (tomorrowCached) return new Response(JSON.stringify(tomorrowCached), { headers: { 'content-type': 'application/json' } });
    return new Response("Failed to fetch tomorrow's menu", { status: 502 });
  } else {
    if (todayCached) return new Response(JSON.stringify(todayCached), { headers: { 'content-type': 'application/json' } });
    return new Response("Failed to fetch today's menu", { status: 502 });
  }
}
