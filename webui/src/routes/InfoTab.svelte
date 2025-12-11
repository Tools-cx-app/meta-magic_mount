<script>
  import { onMount } from 'svelte';
  import { store } from '../lib/store.svelte';
  import { API } from '../lib/api';
  import { ICONS } from '../lib/constants';
  import './InfoTab.css';
  import Skeleton from '../components/Skeleton.svelte';

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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="magic-wand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#FF8C00;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="magic-mount-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#4B0082;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#00BFFF;stop-opacity:1" />
          </linearGradient>
          <radialGradient id="glow-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.6" />
            <stop offset="100%" style="stop-color:#00BFFF;stop-opacity:0" />
          </radialGradient>
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="50" cy="50" r="48" fill="#1a1a2e" stroke="url(#magic-mount-gradient)" stroke-width="2" />
        <circle cx="50" cy="50" r="40" fill="url(#glow-gradient)" opacity="0.2" filter="url(#soft-glow)"/>

        <path d="M 25,80 Q 50,95 75,80 L 85,85 L 15,85 Z" fill="url(#magic-mount-gradient)" />
        <path d="M 30,75 Q 50,60 70,75 L 75,80 Q 50,90 25,80 Z" fill="#2c2c54" />
        <path d="M 50,55 L 35,75 L 65,75 Z" fill="url(#magic-mount-gradient)" filter="url(#soft-glow)"/>

        <path d="M 47,25 L 47,70 Q 50,75 53,70 L 53,25 Z" fill="url(#magic-wand-gradient)" />
        <circle cx="50" cy="25" r="8" fill="url(#magic-wand-gradient)" filter="url(#soft-glow)" />
        <path d="M 50,15 L 52.5,22.5 L 60,25 L 52.5,27.5 L 50,35 L 47.5,27.5 L 40,25 L 47.5,22.5 Z" fill="#FFFACD" filter="url(#soft-glow)" />

        <path d="M 50,33 C 30,45 70,60 50,75" stroke="url(#magic-mount-gradient)" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8" filter="url(#soft-glow)" />
        <path d="M 45,38 C 35,50 65,55 55,70" stroke="url(#magic-wand-gradient)" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.7" filter="url(#soft-glow)" />

        <circle cx="30" cy="30" r="2" fill="#FFFACD" filter="url(#soft-glow)" ><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" /></circle>
        <circle cx="70" cy="30" r="2" fill="#FFFACD" filter="url(#soft-glow)" ><animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" /></circle>
        <circle cx="40" cy="60" r="1.5" fill="#00BFFF" filter="url(#soft-glow)" ><animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" /></circle>
        <circle cx="60" cy="65" r="1.5" fill="#00BFFF" filter="url(#soft-glow)" ><animate attributeName="opacity" values="0;1;0" dur="2.2s" repeatCount="indefinite" /></circle>
        <circle cx="50" cy="82" r="1" fill="#FFF" filter="url(#soft-glow)" ><animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" /></circle>
      </svg>
    </div>
    <span class="app-name">{store.L.common.appName}</span>
    <span class="app-version">{version}</span>
  </div>

  <div class="action-grid">
    <a href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`} 
       class="action-card" 
       onclick={(e) => handleLink(e, `https://github.com/${REPO_OWNER}/${REPO_NAME}`)}>
        <svg viewBox="0 0 24 24" class="action-icon"><path d={ICONS.github} /></svg>
        <span class="action-label">{store.L.info.projectLink}</span>
    </a>
  </div>

  <div>
    <div class="section-title">{store.L.info.contributors}</div>
    <div class="contributors-list">
        {#if loading}
            {#each Array(3) as _}
                <div class="contributor-bar">
                    <Skeleton width="48px" height="48px" borderRadius="50%" />
                    <div class="c-info">
                        <div class="skeleton-spacer">
                             <Skeleton width="120px" height="16px" />
                        </div>
                        <Skeleton width="200px" height="12px" />
                    </div>
                </div>
            {/each}
        {:else if error}
            <div class="error-message">
                {store.L.info.loadFail}
            </div>
        {:else}
            {#each contributors as user}
                <a href={user.html_url} 
                   class="contributor-bar"
                   onclick={(e) => handleLink(e, user.html_url)}>
                    <img src={user.avatar_url} alt={user.login} class="c-avatar" />
                    <div class="c-info">
                        <span class="c-name">{user.name || user.login}</span>
                        <span class="c-bio">
                            {user.bio || store.L.info.noBio}
                        </span>
                    </div>
                    <svg viewBox="0 0 24 24" class="c-link-icon"><path d={ICONS.share} /></svg>
                </a>
            {/each}
        {/if}
    </div>
  </div>

</div>