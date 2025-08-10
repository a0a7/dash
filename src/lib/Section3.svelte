<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  type Stats = {
    recentActivities: any;
    activityCount: number;
    totalTime: number;
    totalDistance: number;
    totalSets: number;
    totalReps: number;
    totalVolume: number;
  };

  type StatsResponse = {
    success: boolean;
    stats: {
      week: Stats;
      two_weeks: Stats;
      four_weeks: Stats;
      year: Stats;
    };
  };

  const stats = writable<StatsResponse | null>(null);
  const loading = writable(true);
  const error = writable<string | null>(null);

  // Derived stat variables for template use
  let week: Stats | null = null;
  let fourWeeks: Stats | null = null;
  let year: Stats | null = null;
  let recentActivities: any[] = [];
  $: if ($stats && $stats.success) {
    week = $stats.stats.week;
    fourWeeks = $stats.stats.four_weeks;
    year = $stats.stats.year;
    recentActivities = Array.isArray(week?.recentActivities) ? week.recentActivities.slice(0, 3) : [];
  } else {
    week = fourWeeks = year = null;
    recentActivities = [];
  }

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  } else {
    return `${m}m`;
  }
}

function formatHours1dp(seconds: number) {
  // Show hours with 1 decimal, no minutes
  return (seconds / 3600).toFixed(1) + 'h';
}
  function formatDistance(meters: number) {
    return (meters / 1000).toPrecision(3) + ' km';
  }
  function formatNumber(n: number) {
    return n.toLocaleString();
  }
function formatDateTime(dt: string) {
  // dt: "2025-08-09 17:13:24"
  // Parse as UTC, then convert to local time
  const utc = new Date(dt.replace(' ', 'T') + 'Z');
  // Get local time components
  const month = utc.toLocaleString(undefined, { month: 'short' });
  const day = utc.getDate();
  const hour = utc.getHours().toString().padStart(2, '0');
  const minute = utc.getMinutes().toString().padStart(2, '0');
  return `${month} ${day}, ${hour}:${minute}`;
}

  async function fetchStats() {
    loading.set(true);
    error.set(null);
    try {
      const res = await fetch('https://garmin-sync-worker.lev-s-cloudflare.workers.dev/activity-stats');
      if (!res.ok) throw new Error('API error: ' + res.status);
      const data = await res.json();
      stats.set(data);
    } catch (e: any) {
      error.set(e.message || 'Unknown error');
    }
    loading.set(false);
  }

  onMount(() => {
    fetchStats();
  });
</script>

<div class="w-full max-w-xl mx-auto">
  <div class="mb-2 text-lg font-bold">Strava Stats</div>
  {#if $loading}
    <div class="text-gray-400">Loading...</div>
  {:else if $error}
    <div class="text-red-500">Error: {$error}</div>
  {:else if week && fourWeeks && year}
    {#if recentActivities.length > 0}
      <div class="flex flex-col gap-2 mb-2">
        {#each recentActivities as act}
          <div class="bg-white border border-gray-200 rounded shadow px-4 py-3 flex flex-row items-center gap-2 min-w-[170px] flex-1 overflow-x-auto">
                <span class="text-xs text-gray-400">{formatDateTime(act.start_time)}</span>
            <span class="font-semibold text-base truncate flex-1 flex-shrink overflow-ellipsis" title={act.name}>{act.name}</span>
            <span class="text-sm">{formatTime(act.duration)}</span>
            {#if act.distance > 0}
              <span class="text-sm">{formatDistance(act.distance)}</span>
            {/if}
            {#if act.total_sets}
              <span class="text-sm">{act.total_sets} sets</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white border border-gray-200 rounded shadow px-5 py-4 flex flex-col items-start">
        <div class="text-base font-semibold mb-1">This Week - <div class="inline text-md font-bold">{formatNumber(week.activityCount)}</div></div>
        <div class="text-gray-600 text-sm mb-1">{formatHours1dp(week.totalTime)} • {formatNumber(week.totalSets)} sets • {formatDistance(week.totalDistance)}</div>
      </div>
      <div class="bg-white border border-gray-200 rounded shadow px-5 py-4 flex flex-col items-start">
        <div class="text-base font-semibold mb-1">Last 4 Weeks - <div class="inline text-md font-bold">{formatNumber(fourWeeks.activityCount)}</div></div>
        <div class="text-gray-600 text-sm mb-1">{formatHours1dp(fourWeeks.totalTime)} • {formatNumber(fourWeeks.totalSets)} sets • {formatDistance(fourWeeks.totalDistance)}</div>
      </div>
    </div>
  {:else}
    <div>No data available.</div>
  {/if}
</div>
