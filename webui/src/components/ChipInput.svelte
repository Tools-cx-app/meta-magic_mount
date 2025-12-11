<script>
  // Added default value for onChange to make it optional
  let { values = $bindable([]), placeholder = "Add item...", onChange = () => {} } = $props();
  let inputValue = $state("");

  function handleKeydown(e) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addChip();
    } else if (e.key === 'Backspace' && inputValue === '' && values.length > 0) {
      removeChip(values.length - 1);
    }
  }

  function addChip() {
    const val = inputValue.trim();
    if (val) {
      if (!values.includes(val)) {
        values = [...values, val];
        onChange();
      }
      inputValue = "";
    }
  }

  function removeChip(index) {
    values = values.filter((_, i) => i !== index);
    onChange();
  }
</script>

<div class="chip-input-container">
  {#each values as val, i}
    <span class="chip">
      {val}
      <button class="chip-remove" onclick={() => removeChip(i)} tabindex="-1" aria-label="Remove {val}">
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
      </button>
    </span>
  {/each}
  
  <input 
    type="text" 
    class="chip-input-field" 
    bind:value={inputValue} 
    onkeydown={handleKeydown}
    onblur={addChip}
    {placeholder}
    enterkeyhint="done"
  />

  {#if inputValue.trim().length > 0}
    <button class="chip-add-btn" onclick={addChip} tabindex="-1" aria-label="Add chip">
      <svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/></svg>
    </button>
  {/if}
</div>

<style>
  .chip-input-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
    min-height: 56px;
    max-height: 120px;
    overflow-y: auto;
    
    background: transparent;
    border: 1px solid var(--md-sys-color-outline);
    border-radius: 8px;
    align-items: center;
    transition: border-color 0.2s;
  }

  .chip-input-container:focus-within {
    border-color: var(--md-sys-color-primary);
    border-width: 2px;
    padding: 7px 11px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    background-color: var(--md-sys-color-secondary-container);
    color: var(--md-sys-color-on-secondary-container);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    gap: 6px;
    font-family: var(--md-ref-typeface-mono);
    animation: scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes scaleIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .chip-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    border-radius: 50%;
    width: 18px;
    height: 18px;
  }

  .chip-remove:hover {
    opacity: 1;
    background-color: rgba(0,0,0,0.1);
  }

  .chip-input-field {
    flex: 1;
    min-width: 80px;
    border: none;
    background: transparent;
    font-size: 16px;
    color: var(--md-sys-color-on-surface);
    outline: none;
    height: 32px;
    font-family: var(--md-ref-typeface-plain);
  }
  
  .chip-input-field::placeholder {
    color: var(--md-sys-color-on-surface-variant);
    opacity: 0.7;
  }

  .chip-add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    border: none;
    padding: 4px;
    cursor: pointer;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    animation: scaleIn 0.15s ease-out;
  }
  
  .chip-add-btn:active {
    transform: scale(0.9);
  }
</style>