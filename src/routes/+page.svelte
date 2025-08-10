<script lang="ts">
  import { writable } from 'svelte/store';
  import Section1 from '$lib/Section1.svelte';
  import Section2 from '$lib/Section2.svelte';
  import Section3 from '$lib/Section3.svelte';
  import Section4 from '$lib/Section4.svelte';
  import Section5 from '$lib/Section5.svelte';

  // Section names
  const sections = [
    { id: 'a1', label: 'Section 1', component: Section1 },
    { id: 'a2', label: 'Webservice Status', component: Section2 },
    { id: 'b1', label: 'Strava', component: Section3 },
    { id: 'b2', label: 'Laundry', component: Section4 },
    { id: 'c', label: 'Menus', component: Section5 }
  ];

  // For mobile: which section is active
  const activeSection = writable('a1');

  import { browser } from '$app/environment';
  let isMobile = false;
  if (browser) {
    const mql = window.matchMedia('(max-width: 767px)');
    isMobile = mql.matches;
    mql.addEventListener('change', (e) => {
      isMobile = e.matches;
    });
  }
</script>



{#if isMobile}
  <div class="flex flex-wrap gap-2 mb-4">
    {#each sections as section}
      <button
        class="flex-1 min-w-[40%] px-4 py-2 rounded-t-lg font-bold transition bg-gray-200 border-none cursor-pointer { $activeSection === section.id ? 'bg-white shadow' : '' }"
        on:click={() => activeSection.set(section.id)}
        type="button"
      >
        {section.label}
      </button>
    {/each}
  </div>
  {#each sections as section}
    <div class="mb-4 bg-white rounded-lg shadow p-4" style="display: { $activeSection === section.id ? 'block' : 'none' }">
      <svelte:component this={section.component} />
    </div>
  {/each}
{:else}
  <div class="grid grid-cols-3 grid-rows-2 gap-4 h-screen p-4 box-border">
    <div class="bg-white rounded-lg shadow p-4 flex flex-col justify-start min-w-0 min-h-0 row-start-1 col-start-1"><Section1 /></div>
    <div class="bg-white rounded-lg shadow p-4 flex flex-col justify-start min-w-0 min-h-0 row-start-2 col-start-1"><Section2 /></div>
    <div class="bg-white rounded-lg shadow p-4 flex flex-col justify-start min-w-0 min-h-0 row-start-1 col-start-2"><Section3 /></div>
    <div class="bg-white rounded-lg shadow p-4 flex flex-col justify-start min-w-0 min-h-0 row-start-2 col-start-2"><Section4 /></div>
    <div class="bg-white rounded-lg shadow p-4 flex flex-col justify-start min-w-0 min-h-0 row-span-2 col-start-3 row-start-1"><Section5 /></div>
  </div>
{/if}
