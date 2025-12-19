<script>
  import { onMount } from 'svelte';
  import { store } from '../lib/store.svelte';
  import { API } from '../lib/api';
  import { ICONS } from '../lib/constants';
  import './InfoTab.css';
  import Skeleton from '../components/Skeleton.svelte';
  import MagicLogo from '../components/MagicLogo.svelte';

  import '@material/web/button/filled-tonal-button.js';
  import '@material/web/icon/icon.js';
  import '@material/web/list/list.js';
  import '@material/web/list/list-item.js';

  const REPO_OWNER = 'Tools-cx-app';
  const REPO_NAME = 'meta-magic_mount';
  const CACHE_KEY = 'mm_contributors_cache';
  const CACHE_DURATION = 1000 * 60 * 60;

  let contributors = $state([]);
  let loading = $state(true);
  let error = $state(false);
  let version = $state(store.version);

  onMount(async () => {
    try {
        const v = await API.getVersion();
        if (v) version = v;
    } catch (e) {
        console.error("Failed to fetch version", e);
    }
    await fetchContributors();
  });
  async function fetchContributors() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          contributors = data;
          loading = false;
          return;
        }
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contributors`);
      if (!res.ok) throw new Error('Failed to fetch list');
      
      const basicList = await res.json();
      const filteredList = basicList.filter((user) => {
        const isBotType = user.type === 'Bot';
        const hasBotName = user.login.toLowerCase().includes('bot');
        return !isBotType && !hasBotName;
      });
      const detailPromises = filteredList.map(async (user) => {
        try {
            const detailRes = await fetch(user.url);
            if (detailRes.ok) {
                const detail = await detailRes.json();
                return { ...user, bio: detail.bio, name: detail.name || user.login };
          
            }
        } catch (e) {
            console.warn('Failed to fetch detail for', user.login);
        }
        return user;
      });
      contributors = await Promise.all(detailPromises);
      
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: contributors,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error(e);
      error = true;
    } finally {
      loading = false;
    }
  }

  function handleLink(e, url) {
    e.preventDefault();
    API.openLink(url);
  }
</script>

<div class="info-container">
  
  <div class="project-header">
    <div class="app-logo">
        <MagicLogo />
    </div>
    <span class="app-name">{store.L.common.appName}</span>
    <span class="app-version">{version}</span>
  </div>

  <div class="action-buttons">
    <md-filled-tonal-button 
       class="action-btn"
       onclick={(e) => handleLink(e, `https://github.com/${REPO_OWNER}/${REPO_NAME}`)}
       role="button"
       tabindex="0"
       onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLink(e, `https://github.com/${REPO_OWNER}/${REPO_NAME}`); }}
    >
        <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d={ICONS.github} /></svg></md-icon>
        {store.L.info.projectLink}
    </md-filled-tonal-button>
  </div>

  <div class="contributors-section">
   
    <div class="section-title">{store.L.info.contributors}</div>
    <div class="list-wrapper">
        {#if loading}
            {#each Array(3) as _}
                <div class="skeleton-item">
                    <Skeleton width="40px" height="40px" borderRadius="50%" />
                    <div class="skeleton-text">
       
                        <Skeleton width="120px" height="16px" />
                        <Skeleton width="180px" height="12px" />
                    </div>
                </div>
            {/each}
     
        {:else if error}
            <div class="error-message">
                {store.L.info.loadFail}
            </div>
        {:else}
            <md-list class="contributors-list">
                {#each contributors as user}
              
                     <md-list-item 
                        type="link" 
                        href={user.html_url}
                        target="_blank"
                        onclick={(e) => handleLink(e, user.html_url)}
                        role="link"
                        tabindex="0"
                        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLink(e, user.html_url); }}
                    >
                        <img slot="start" src={user.avatar_url} alt={user.login} class="c-avatar" loading="lazy" />
                        <div slot="headline">{user.name || user.login}</div>
                        <div slot="supporting-text">{user.bio || store.L.info.noBio}</div>
                    </md-list-item>
                {/each}
            </md-list>
        {/if}
    </div>
  </div>

</div>