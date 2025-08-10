export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const location = searchParams.get("location");
  const date = searchParams.get("date");
  const period = searchParams.get("period"); // optional

  if (!location || !date) {
    return new Response("Missing location or date", { status: 400 });
  }

  // Compose cache key
  const cacheKey = period
    ? `menu:${location}:${period}:${date}`
    : `periods:${location}:${date}`;

  // Try to get from KV
  let cached = await context.env.UMN_MENUS.get(cacheKey, "json");
  if (cached) {
    return Response.json(cached);
  }

  // Build API URL
  let apiUrl = `https://apiv4.dineoncampus.com/locations/${location}/periods/`;
  if (period) apiUrl += `${period}`;
  apiUrl += `?date=${encodeURIComponent(date)}`;

  // Fetch from API
  const apiRes = await fetch(apiUrl, {
    headers: { accept: "application/json, text/plain, */*" },
  });
  if (!apiRes.ok) {
    return new Response("Failed to fetch menu", { status: 502 });
  }
  const data = await apiRes.json();


  // Store in KV until the end of the current day (local time)
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const secondsUntilEndOfDay = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
  await context.env.UMN_MENUS.put(cacheKey, JSON.stringify(data), { expirationTtl: secondsUntilEndOfDay });

  return Response.json(data);
}
