<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { get } from 'svelte/store';

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
    { id: '627bbf3bb63f1e0fb3c1691a', name: '17th Ave.' },
    { id: '627bbf2cb63f1e10059b45a4', name: 'Sanford' },
    { id: '6262b663b63f1e1517b6e433', name: 'Pioneer' },
    { id: '62a90bbaa9f13a0e1cac2320', name: 'Comstock' },
    { id: '627bbeb6b63f1e0fa1c9fe7b', name: 'Middlebrook' },
    { id: '62b21c96a9f13a0ac1472ef1', name: 'Bailey' },
  ];


  const selectedLocation = writable<string>(locations[0].id); // Default to 17th Ave. Dining Hall
  const menuData = writable<any>(null);
  const loading = writable(true);
  const error = writable<string | null>(null);
  const periods = writable<any[]>([]);
  const selectedPeriod = writable<string | null>(null);

  // Prefetched menus: { [locationId]: { periods, menus: { [periodId]: menuData } } }
  let prefetchedMenus: Record<string, { periods: any[]; menus: Record<string, any> }> = {};


  // Add day selection: "today" or "tomorrow"
  const day = writable<'today' | 'tomorrow'>('today');
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const apiBase = isLocal ? 'https://corsproxy.io/?url=https://a0dash.pages.dev/api/menu' : '/api/menu';

  // Prefetch all menus for all locations and periods for both days
  async function prefetchAllMenus() {
    loading.set(true);
    error.set(null);
    try {
      const dateStr = getDateString();
      const tomorrowStr = (() => {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + 1);
        return d.toDateString() + ' 00:00:00 GMT' +
          (d.getTimezoneOffset() > 0 ? '-' : '+') +
          String(Math.abs(d.getTimezoneOffset() / 60)).padStart(2, '0') + '00 (Central Daylight Time)';
      })();
      const allMenus: Record<string, { periods: { today: any[]; tomorrow: any[] }, menus: Record<string, { today?: any, tomorrow?: any }> }> = {};
      for (const loc of locations) {
        // Fetch periods for today and tomorrow
        const periodsTodayUrl = `${apiBase}?location=${loc.id}&date=${encodeURIComponent(dateStr)}`;
        const periodsTomorrowUrl = `${apiBase}?location=${loc.id}&date=${encodeURIComponent(dateStr)}&day=tomorrow`;
        const [resToday, resTomorrow] = await Promise.all([
          fetch(periodsTodayUrl),
          fetch(periodsTomorrowUrl)
        ]);
        const dataToday = resToday.ok ? await resToday.json() : { periods: [] };
        const dataTomorrow = resTomorrow.ok ? await resTomorrow.json() : { periods: [] };
        const locPeriods = { today: dataToday.periods || [], tomorrow: dataTomorrow.periods || [] };
        const menus: Record<string, { today?: any, tomorrow?: any }> = {};
        // Prefetch each period's menu for today and tomorrow
        for (const period of locPeriods.today) {
          const menuTodayUrl = `${apiBase}?location=${loc.id}&period=${period.id}&date=${encodeURIComponent(dateStr)}`;
          const menuTomorrowUrl = `${apiBase}?location=${loc.id}&period=${period.id}&date=${encodeURIComponent(dateStr)}&day=tomorrow`;
          const [menuResToday, menuResTomorrow] = await Promise.all([
            fetch(menuTodayUrl),
            fetch(menuTomorrowUrl)
          ]);
          menus[period.id] = {
            today: menuResToday.ok ? await menuResToday.json() : null,
            tomorrow: menuResTomorrow.ok ? await menuResTomorrow.json() : null
          };
        }
        allMenus[loc.id] = { periods: locPeriods, menus };
      }
      prefetchedMenus = allMenus;
      // Set initial UI state
      const firstLoc = locations[0].id;
      const firstDay = get(day);
      const firstPeriods = prefetchedMenus[firstLoc]?.periods[firstDay] || [];
      periods.set(firstPeriods);
      const firstPeriodId = firstPeriods[0]?.id;
      selectedLocation.set(firstLoc);
      selectedPeriod.set(firstPeriodId);
      menuData.set(firstPeriodId ? prefetchedMenus[firstLoc].menus[firstPeriodId]?.[firstDay] : null);
    } catch (e: any) {
      error.set(e.message || 'Unknown error');
    } finally {
      loading.set(false);
    }
  }

  // Fetch menu for a specific period

  // Set menu from prefetchedMenus for the selected day
  function setMenuFromCache(locationId: string, periodId: string) {
    if (prefetchedMenus[locationId]) {
      const currentDay = get(day);
      periods.set(prefetchedMenus[locationId].periods[currentDay] || []);
      menuData.set(prefetchedMenus[locationId].menus[periodId]?.[currentDay] || null);
    }
  }


  // When selectedLocation or day changes, update periods and menu from cache
  let firstLoad = true;
  $: if (!firstLoad && $selectedLocation) {
    const locPeriods = prefetchedMenus[$selectedLocation]?.periods[$day] || [];
    periods.set(locPeriods);
    // If current selectedPeriod is not in new periods, pick first
    if (!locPeriods.find(p => p.id === $selectedPeriod)) {
      selectedPeriod.set(locPeriods[0]?.id);
    }
  }
  // When selectedPeriod or day changes, update menu from cache
  $: if (!firstLoad && $selectedLocation && $selectedPeriod) {
    setMenuFromCache($selectedLocation, $selectedPeriod);
  }
  onMount(() => {
    prefetchAllMenus();
    firstLoad = false;
  });
</script>

<div class="space-y-4">
    <div class="flex items-center mb-4">
        <h2 class="text-lg font-bold">menu at</h2>
        <select
        id="location-select"
        class="cursor-pointer text-md ml-2 py-[2px] rounded border border-gray-300 bg-white mr-[6px]"
        bind:value={$selectedLocation}
        >
        {#each locations as loc}
            <option value={loc.id}>{loc.name}</option>
        {/each}
        </select>
        <button
            class="menu-btn"
            class:selected={$day === 'today'}
            on:click={() => day.set('today')}
            type="button"
        >
            Today
        </button>
        <button
            class="menu-btn"
            class:selected={$day === 'tomorrow'}
            on:click={() => day.set('tomorrow')}
            type="button"
        >
            Tomorrow
        </button>
    </div>
        {#each $periods as period}
        <button
            class="menu-btn"
            class:selected={$selectedPeriod === period.id}
            on:click={() => selectedPeriod.set(period.id)}
            type="button"
        >
            {period.name}
        </button>
        {/each}
  {#if $loading}
    <div>Loading...</div>
  {:else if $error}
    <div class="text-red-500">Error: {$error}</div>
  {:else if $menuData && $menuData.menu && $menuData.menu.period && Array.isArray($menuData.menu.period.categories)}
    <div class="space-y-4">
      {#if Array.isArray($menuData.menu.period.categories)}
        {#each $menuData.menu.period.categories as category}
          <div class="compact-menu-category">
            <h3 class="font-semibold text-base mb-1">{category.name}</h3>
          <div class="flex items-start relative min-h-[1.5rem]">
            <div class="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-300 z-0"></div>
            <ul class="list-none p-0 m-0 ml-8 flex-1 z-10">
              {#if Array.isArray(category.items)}
                {#each category.items as item}
                  <li class="flex items-start mb-1">
                    <div class="font-medium min-w-[110px] mr-4 whitespace-nowrap">{item.name}</div>
                    <div class="text-sm text-slate-500 flex-1 break-words">
                      {#if item.desc}
                        <span class="text-gray-500">{item.desc}</span>
                      {/if}
                      {#if item.portion}
                        <span class="ml-2 text-xs text-gray-400">({item.portion})</span>
                      {/if}
                    </div>
                  </li>
                {/each}
              {/if}
            </ul>
          </div>
          </div>
        {/each}
      {/if}
    </div>
  {:else}
    <div>No menu available for { $day }.</div>
  {/if}
</div>

