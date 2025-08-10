export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const location = searchParams.get("location");
  const date = searchParams.get("date");
  const period = searchParams.get("period"); // optional
  const day = searchParams.get("day") || "today"; // "today" or "tomorrow"

  if (!location || !date) {
    return new Response("Missing location or date", { status: 400 });
  }

  // Compose cache key
  // Compose cache keys for today and tomorrow
  const todayKey = period
    ? `menu:${location}:${period}:${date}`
    : `periods:${location}:${date}`;
  // Calculate tomorrow's date string
  const dateObj = new Date(date);
  const tomorrowObj = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);
  const tomorrowKey = period
    ? `menu:${location}:${period}:${tomorrowStr}`
    : `periods:${location}:${tomorrowStr}`;

  // Try to get from KV
  // Try to get from KV for both today and tomorrow
  let todayCached = await context.env.UMN_MENUS.get(todayKey, "json");
  let tomorrowCached = await context.env.UMN_MENUS.get(tomorrowKey, "json");

  // If either is missing, fetch and cache
  if (!todayCached) {
    let apiUrl = `https://apiv4.dineoncampus.com/locations/${location}/periods/`;
    if (period) apiUrl += `${period}`;
    apiUrl += `?date=${encodeURIComponent(date)}`;
    const apiRes = await fetch(apiUrl, {
      headers: { accept: "application/json, text/plain, */*" },
    });
    if (apiRes.ok) {
      todayCached = await apiRes.json();
      // Store in KV until end of today
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const secondsUntilEndOfDay = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
      await context.env.UMN_MENUS.put(todayKey, JSON.stringify(todayCached), { expirationTtl: secondsUntilEndOfDay });
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
      // Store in KV until end of tomorrow
      const now = new Date();
      const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0, 0);
      const secondsUntilEndOfTomorrow = Math.floor((endOfTomorrow.getTime() - now.getTime()) / 1000);
      await context.env.UMN_MENUS.put(tomorrowKey, JSON.stringify(tomorrowCached), { expirationTtl: secondsUntilEndOfTomorrow });
    }
  }

  // Return the requested day's data
  if (day === "tomorrow") {
    if (tomorrowCached) return Response.json(tomorrowCached);
    return new Response("Failed to fetch tomorrow's menu", { status: 502 });
  } else {
    if (todayCached) return Response.json(todayCached);
    return new Response("Failed to fetch today's menu", { status: 502 });
  }

  // Build API URL
  // Fetch from API
}
