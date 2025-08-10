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

    $: if ($hoveredItem) {
    console.log('hoveredItem', $hoveredItem);
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


  // No localStorage: always use defaults
  let initialLocation = locations[0].id;
  let initialPeriod: string | null = null;
  let initialDay: 'today' | 'tomorrow' = 'today';

  const selectedLocation = writable<string>(initialLocation);
  const menuData = writable<any>(null);
  const loading = writable(true);
  const error = writable<string | null>(null);
  const periods = writable<any[]>([]);
  const selectedPeriod = writable<string | null>(initialPeriod);

  // Prefetched menus: { [locationId]: { periods, menus: { [periodId]: menuData } } }
  let prefetchedMenus: Record<string, { periods: any[]; menus: Record<string, any> }> = {};


  // Add day selection: "today" or "tomorrow"
  const day = writable<'today' | 'tomorrow'>(initialDay);
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const apiBase = isLocal ? 'https://corsproxy.io/?url=https://a0dash.pages.dev/api/menu' : '/api/menu';

  // Prefetch all menus for all locations and periods for both days, no localStorage caching
  async function prefetchAllMenus() {
    loading.set(true);
    error.set(null);
    const now = new Date();
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
    loading.set(false);
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
    const hoveredItem = writable<any>(null);

</script>



<div class="space-y-2 h-full flex flex-col">
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
    <div>
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
        </div>
  {#if $loading}
    <div>Loading...</div>
  {:else if $error}
    <div class="text-red-500">Error: {$error}</div>
  {:else if $menuData && $menuData.menu && $menuData.menu.period && Array.isArray($menuData.menu.period.categories)}
    <div class="space-y-2 flex-1 overflow-y-auto">
      {#if Array.isArray($menuData.menu.period.categories)}
        {#each $menuData.menu.period.categories as category}
          {#if Array.isArray(category.items) && category.items.length > 0}
            <div class="compact-menu-category">
              <h3 class="font-semibold text-base">{category.name}</h3>
              <div class="flex items-start relative min-h-[1.5rem]">
                <div class="absolute left-[3px] top-1 bottom-2 w-0.5 bg-slate-300 z-0"></div>
                <ul class="list-none p-0 m-0 ml-[14px] flex-1 z-10">
                  {#each category.items as item (item.id || item.name)}
                    <li class="flex items-start mb-2 group relative"
                        on:mouseenter={() => hoveredItem.set(item)}
                        on:focus={() => hoveredItem.set(item)}
                        tabindex="0"
                    >
                      <div class="font-medium min-w-[110px] mr-2 whitespace-nowrap cursor-pointer">
                        {item.name}
                      </div>
                      <div class="text-sm mr-2 text-slate-500 flex-1 break-words">
                          {#if item.portion}
                              <span class="text-xs text-gray-400">({item.portion})</span>
                          {/if}
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </div>
        <div class="mt-1 w-full max-w-xl mx-auto bg-white border border-gray-300 rounded shadow px-4 py-2 text-sm text-gray-700 min-h-[90px] flex flex-col ">
      {#if $hoveredItem}
        <div class="flex gap-2 items-center">
            <div class="font-semibold text-base mb-0">{$hoveredItem.name}</div>
            {#if $hoveredItem.portion}
            <div class="text-xs text-gray-400 mb-0">({$hoveredItem.portion})</div>
            {/if}
        </div>
        {#if $hoveredItem.desc}
          <div class="mb-1 text-xs text-gray-500 truncate">{$hoveredItem.desc}</div>
        {/if}
        {#if $hoveredItem.nutrients && Array.isArray($hoveredItem.nutrients)}
          {@const n = $hoveredItem.nutrients}
          <div class="flex flex-wrap gap-x-3 gap-y-1 items-center">
            {#if n.find(x => x.name === 'Calories')}
              <span class="ml-0">{n.find(x => x.name === 'Calories').value} kcal</span>
            {/if}
            {#if n.find(x => x.name.startsWith('Protein')) || n.find(x => x.name.startsWith('Total Carbohydrates')) || n.find(x => x.name.startsWith('Total Fat'))}
              <span>
                P/C/F:
                <span class="font-semibold">
                  {(() => {
                    const v = n.find(x => x.name.startsWith('Protein'))?.value || '-';
                    return typeof v === 'string' && v.trim().startsWith('less than') ? '0' : v;
                  })()}
                  /
                  {(() => {
                    const v = n.find(x => x.name.startsWith('Total Carbohydrates'))?.value || '-';
                    return typeof v === 'string' && v.trim().startsWith('less than') ? '0' : v;
                  })()}
                  /
                  {(() => {
                    const v = n.find(x => x.name.startsWith('Total Fat'))?.value || '-';
                    return typeof v === 'string' && v.trim().startsWith('less than') ? '0' : v;
                  })()}g
                </span>
              </span>
            {/if}
            {#if n.find(x => x.name.startsWith('Sugar'))}
              <span class="ml-0">Sugar: <span class="font-semibold">{(() => {
                    const v = n.find(x => x.name.startsWith('Sugar'))?.value || '-';
                    return typeof v === 'string' && v.trim().startsWith('less than') ? '0' : v;
                  })()}g</span></span>
            {/if}
            {#if n.find(x => x.name.startsWith('Dietary Fiber'))}
              <span class="ml-0">Fiber: <span class="font-semibold">{(() => {
                    const v = n.find(x => x.name.startsWith('Dietary Fiber'))?.value || '-';
                    return typeof v === 'string' && v.trim().startsWith('less than') ? '0' : v;
                  })()}g</span></span>
            {/if}
          </div>
        {/if}
      {:else}
        <div class="text-gray-400 text-center">Hover or tap a menu item to see details.</div>
      {/if}
    </div>
  {:else}
    <div>No menu available for { $day }.</div>
  {/if}
</div>
