<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  // Get today's date in the required format
  function getDateString() {
    const now = new Date();
    // Example: Sat Aug 09 2025 00:00:00 GMT-0500 (Central Daylight Time)
    return now.toDateString() + ' 00:00:00 GMT' +
      (now.getTimezoneOffset() > 0 ? '-' : '+') +
      String(Math.abs(now.getTimezoneOffset() / 60)).padStart(2, '0') + '00 (Central Daylight Time)';
  }


  // List of all locations (flattened from buildings)
  const locations = [
    { id: '627bbf3bb63f1e0fb3c1691a', name: '17th Ave. Dining Hall' },
    { id: '627bbf2cb63f1e10059b45a4', name: 'Sanford Dining Hall' },
    { id: '6262b663b63f1e1517b6e433', name: 'Pioneer Dining Hall' },
    { id: '62a90bbaa9f13a0e1cac2320', name: 'Comstock Dining Hall' },
    { id: '627bbeb6b63f1e0fa1c9fe7b', name: 'Middlebrook Dining Hall' },
    { id: '62b21c96a9f13a0ac1472ef1', name: 'Bailey Dining Hall' },
  ];


  const selectedLocation = writable<string>(locations[0].id); // Default to 17th Ave. Dining Hall
  const menuData = writable<any>(null);
  const loading = writable(true);
  const error = writable<string | null>(null);
  const periods = writable<any[]>([]);
  const selectedPeriod = writable<string | null>(null);

  // Prefetched menus: { [locationId]: { periods, menus: { [periodId]: menuData } } }
  let prefetchedMenus: Record<string, { periods: any[]; menus: Record<string, any> }> = {};


  // Prefetch all menus for all locations and periods using the /api/menu endpoint
  // Use production API in local dev, relative in production
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const apiBase = isLocal ? 'https://a0dash.pages.dev/api/menu' : '/api/menu';

  async function prefetchAllMenus() {
    loading.set(true);
    error.set(null);
    try {
      const dateStr = getDateString();
      const allMenus: typeof prefetchedMenus = {};
      for (const loc of locations) {
        // Fetch periods for this location
        const periodsUrl = `${apiBase}?location=${loc.id}&date=${encodeURIComponent(dateStr)}`;
        const res = await fetch(periodsUrl);
        if (!res.ok) throw new Error(`Failed to fetch periods for ${loc.name}`);
        const data = await res.json();
        const locPeriods = data.periods || [];
        const menus: Record<string, any> = {};
        // Prefetch each period's menu
        for (const period of locPeriods) {
          const menuUrl = `${apiBase}?location=${loc.id}&period=${period.id}&date=${encodeURIComponent(dateStr)}`;
          const menuRes = await fetch(menuUrl);
          if (menuRes.ok) {
            menus[period.id] = await menuRes.json();
          }
        }
        allMenus[loc.id] = { periods: locPeriods, menus };
      }
      prefetchedMenus = allMenus;
      // Set initial UI state
      const firstLoc = locations[0].id;
      const firstPeriods = prefetchedMenus[firstLoc]?.periods || [];
      periods.set(firstPeriods);
      const firstPeriodId = firstPeriods[0]?.id;
      selectedLocation.set(firstLoc);
      selectedPeriod.set(firstPeriodId);
      menuData.set(firstPeriodId ? prefetchedMenus[firstLoc].menus[firstPeriodId] : null);
    } catch (e: any) {
      error.set(e.message || 'Unknown error');
    } finally {
      loading.set(false);
    }
  }

  // Fetch menu for a specific period

  // Set menu from prefetchedMenus
  function setMenuFromCache(locationId: string, periodId: string) {
    if (prefetchedMenus[locationId]) {
      periods.set(prefetchedMenus[locationId].periods);
      menuData.set(prefetchedMenus[locationId].menus[periodId] || null);
    }
  }


  // When selectedLocation changes, update periods and menu from cache
  let firstLoad = true;
  $: if (!firstLoad && $selectedLocation) {
    const locPeriods = prefetchedMenus[$selectedLocation]?.periods || [];
    periods.set(locPeriods);
    // If current selectedPeriod is not in new periods, pick first
    if (!locPeriods.find(p => p.id === $selectedPeriod)) {
      selectedPeriod.set(locPeriods[0]?.id);
    }
  }
  // When selectedPeriod changes, update menu from cache
  $: if (!firstLoad && $selectedLocation && $selectedPeriod) {
    setMenuFromCache($selectedLocation, $selectedPeriod);
  }
  onMount(() => {
    prefetchAllMenus();
    firstLoad = false;
  });
</script>

<div class="space-y-4">
  <h2 class="text-xl font-bold">Today's Dining Menus</h2>
  <div class="flex flex-wrap gap-2 mb-2 items-center">
    <label for="location-select" class="font-semibold mr-2">Location:</label>
    <select
      id="location-select"
      class="px-3 py-2 rounded border border-gray-300 bg-white mr-4"
      bind:value={$selectedLocation}
    >
      {#each locations as loc}
        <option value={loc.id}>{loc.name}</option>
      {/each}
    </select>
    {#each $periods as period}
      <button
        class="px-4 py-2 rounded font-semibold border border-gray-300 bg-gray-100 hover:bg-white transition { $selectedPeriod === period.id ? 'bg-blue-500 text-white border-blue-500' : '' }"
        on:click={() => selectedPeriod.set(period.id)}
        type="button"
      >
        {period.name}
      </button>
    {/each}
  </div>
  {#if $loading}
    <div>Loading...</div>
  {:else if $error}
    <div class="text-red-500">Error: {$error}</div>
  {:else if $menuData && $menuData.menu && $menuData.menu.period && $menuData.menu.period.categories}
    {#each $menuData.menu.period.categories as category}
      <div class="border rounded-lg p-3 bg-gray-50">
        <h3 class="font-semibold text-lg mb-2">{category.name}</h3>
        <ul class="list-disc ml-6">
          {#each category.items as item}
            <li class="mb-1">
              <span class="font-medium">{item.name}</span>
              {#if item.desc}
                <span class="text-gray-500"> — {item.desc}</span>
              {/if}
              {#if item.portion}
                <span class="ml-2 text-xs text-gray-400">({item.portion})</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  {:else}
    <div>No menu available for today.</div>
  {/if}
</div>
