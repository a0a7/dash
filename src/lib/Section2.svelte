
<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  type Service = {
    label: string;
    url: string;
    expect?: string; // expected response text for OK
  };

  const services: Service[] = [
    { label: 'GARMIN SYNC', url: 'https://garmin-sync-worker.lev-s-cloudflare.workers.dev/health', expect: 'OK' },
    { label: 'JELLYFIN', url: 'https://jellyfin.abraham.africa', expect: 'OK' },
    { label: 'OVERSEERR', url: 'https://overseerr.abraham.africa', expect: 'OK' },
    { label: 'QBITTORRENT', url: 'https://qbittorrent.abraham.africa', expect: 'OK' },
    { label: 'RADARR', url: 'https://radarr.abraham.africa', expect: 'OK' },
    { label: 'SONARR', url: 'https://sonarr.abraham.africa', expect: 'OK' },
    { label: 'BAZARR', url: 'https://bazarr.abraham.africa', expect: 'OK' },
    { label: 'FLARESOLVERR', url: 'https://flaresolverr.abraham.africa', expect: 'OK' },
    { label: 'PROWLARR', url: 'https://prowlarr.abraham.africa', expect: 'OK' },
    { label: 'TUBESYNC', url: 'https://tubesync.abraham.africa', expect: 'OK' },
    { label: 'DOZZLE', url: 'https://dozzle.abraham.africa', expect: 'OK' },
  ];

  type Status = 'ok' | string | null;
  const statusMap = writable<Record<string, Status>>({});
  const loadingMap = writable<Record<string, boolean>>({});

  async function fetchServiceStatus(service: Service) {
    loadingMap.update(m => ({ ...m, [service.label]: true }));
    // Try /health and /, return OK if either succeeds
    const urls = [service.url + '/health', service.url + '/'];
    let ok = false;
    let errorCode = '';
    for (const url of urls) {
      try {
        const res = await fetch('https://corsproxy.io/?url=' + encodeURIComponent(url));
        if (res.ok) {
          if (url.endsWith('/health')) {
            const text = await res.text();
            if (service.expect && text.trim() === service.expect) {
              ok = true;
              break;
            } else {
              errorCode = text.trim();
            }
          } else {
            ok = true;
            break;
          }
        } else {
          errorCode = res.status.toString();
        }
      } catch (e: any) {
        errorCode = 'ERR';
      }
    }
    if (ok) {
      statusMap.update(m => ({ ...m, [service.label]: 'ok' }));
    } else {
      statusMap.update(m => ({ ...m, [service.label]: errorCode || 'ERR' }));
    }
    loadingMap.update(m => ({ ...m, [service.label]: false }));
  }

  onMount(() => {
    for (const service of services) {
      fetchServiceStatus(service);
    }
  });
</script>

<div class="font-mono font-bold text-lg">
  <div class="mb-1 text-sm">Service Statuses</div>
  <div class="space-y-0 leading-6">
    {#each services as service}
      <div>
        {service.label} [
        {#if $loadingMap[service.label]}
          <span class="text-gray-400"> ... </span>
        {:else if $statusMap[service.label] === 'ok'}
          <span class="text-green-500"> OK </span>
        {:else if $statusMap[service.label]}
          <span class="text-red-500"> {$statusMap[service.label]} </span>
        {:else}
          <span class="text-gray-400"> ... </span>
        {/if}
        ]
      </div>
    {/each}
  </div>
</div>
