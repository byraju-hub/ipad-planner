<script>
  let { name, size = 22 } = $props();
</script>

<svg aria-hidden="true" width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="currentColor"
  stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  {#if name === 'pen'}
    <path d="M3.5 18.5l1-4L15 4l3 3L7.5 17.5l-4 1z" />
  {:else if name === 'eraser'}
    <rect x="3.5" y="7.5" width="15" height="7" rx="2" transform="rotate(-45 11 11)" />
    <path d="M9 7.5v7" transform="rotate(-45 11 11)" />
  {:else if name === 'undo'}
    <path d="M7 5L3.5 8.5 7 12" />
    <path d="M3.5 8.5H13a5 5 0 010 10H8" />
  {:else if name === 'touch'}
    <circle cx="11" cy="11" r="6.5" />
    <circle cx="11" cy="11" r="1.6" />
  {:else if name === 'gear'}
    <path d="M9.63 4.24 L9.81 1.88 L12.19 1.88 L12.37 4.24 L14.81 5.25 L16.61 3.71 L18.29 5.39 L16.75 7.19 L17.76 9.63 L20.12 9.81 L20.12 12.19 L17.76 12.37 L16.75 14.81 L18.29 16.61 L16.61 18.29 L14.81 16.75 L12.37 17.76 L12.19 20.12 L9.81 20.12 L9.63 17.76 L7.19 16.75 L5.39 18.29 L3.71 16.61 L5.25 14.81 L4.24 12.37 L1.88 12.19 L1.88 9.81 L4.24 9.63 L5.25 7.19 L3.71 5.39 L5.39 3.71 L7.19 5.25 Z" />
    <circle cx="11" cy="11" r="2.8" />
  {:else if name === 'plus'}
    <path d="M11 4.5v13M4.5 11h13" />
  {:else if name === 'left'}
    <path d="M13.5 4.5 7 11l6.5 6.5" />
  {:else if name === 'right'}
    <path d="M8.5 4.5 15 11l-6.5 6.5" />
  {:else if name === 'check'}
    <path d="M5 11.5l4 4L17 7" />
  {:else if name === 'close'}
    <path d="M5.5 5.5l11 11M16.5 5.5l-11 11" />
  {/if}
</svg>
