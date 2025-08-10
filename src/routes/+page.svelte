<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  
  // Section names
  const sections = [
    { id: 'a1', label: 'Section 1' },
    { id: 'a2', label: 'Section 2' },
    { id: 'b1', label: 'Section 3' },
    { id: 'b2', label: 'Section 4' },
    { id: 'c', label: 'Section 5' }
  ];

  // For mobile: which section is active
  const activeSection = writable('a1');

  let isMobile = false;
  function checkMobile() {
    isMobile = window.innerWidth < 768;
  }
  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });
</script>

<style>
  .dashboard {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 1rem;
    height: 100vh;
    padding: 1rem;
    box-sizing: border-box;
  }
  .section {
    background: #fff;
    border-radius: 0.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    padding: 1rem;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }
  .section-title {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  /* Mosaic layout */
  .a1 { grid-column: 1; grid-row: 1; }
  .a2 { grid-column: 1; grid-row: 2; }
  .b1 { grid-column: 2; grid-row: 1; }
  .b2 { grid-column: 2; grid-row: 2; }
  .c  { grid-column: 3 / span 1; grid-row: 1 / span 2; }

  /* Mobile styles */
  @media (max-width: 767px) {
    .dashboard {
      display: block;
      height: auto;
      padding: 0.5rem;
    }
    .mobile-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .mobile-tab {
      flex: 1 1 40%;
      padding: 0.5rem 1rem;
      background: #eee;
      border-radius: 0.5rem 0.5rem 0 0;
      border: none;
      cursor: pointer;
      font-weight: bold;
      transition: background 0.2s;
    }
    .mobile-tab.active {
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
    .section {
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
  }
</style>

{#if isMobile}
  <div class="mobile-tabs">
    {#each sections as section}
      <button
        class="mobile-tab { $activeSection === section.id ? 'active' : '' }"
        on:click={() => activeSection.set(section.id)}
      >
        {section.label}
      </button>
    {/each}
  </div>
  {#each sections as section}
    {#if $activeSection === section.id}
      <div class="section {section.id}">
        <div class="section-title">{section.label}</div>
        <div>Content for {section.label}</div>
      </div>
    {/if}
  {/each}
{:else}
  <div class="dashboard">
    <div class="section a1">
      <div class="section-title">Section 1</div>
      <div>Content for Section 1</div>
    </div>
    <div class="section a2">
      <div class="section-title">Section 2</div>
      <div>Content for Section 2</div>
    </div>
    <div class="section b1">
      <div class="section-title">Section 3</div>
      <div>Content for Section 3</div>
    </div>
    <div class="section b2">
      <div class="section-title">Section 4</div>
      <div>Content for Section 4</div>
    </div>
    <div class="section c">
      <div class="section-title">Section 5</div>
      <div>Content for Section 5</div>
    </div>
  </div>
{/if}
