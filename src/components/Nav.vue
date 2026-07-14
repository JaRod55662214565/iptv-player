<template>
  <div class="nav" :class="{ 'nav-open': isOpen }">
    <div class="nav-menu" @click="isOpen = true">
      <img class="logo" src="../assets/logo.svg" alt="Web TV" />
    </div>
    <div class="nav-list-warp" v-show="isOpen">
      <div class="nav-header">
        <span class="nav-title">{{ t('appTitle') }} <img v-if="currentCountryFlagUrl" class="country-indicator" :src="currentCountryFlagUrl" alt="" @error="(e) => e.target.style.display='none'" /></span>
        <div class="nav-header-actions">
          <button
            class="settings-btn share-btn"
            @click="$emit('openShareLink')"
            :aria-label="t('share.title')"
            :title="t('share.title')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
          <button
            class="settings-btn"
            @click="$emit('openSettings')"
            :aria-label="t('settings')"
            :title="t('settings')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button class="nav-close" @click="isOpen = false" aria-label="Close menu">&times;</button>
        </div>
      </div>
      <div class="nav-tabs">
        <a
          class="nav-tab"
          :class="{ 'nav-tab-active': mode === 'home' }"
          href="#/?mode=home"
          @click="$emit('switchMode', 'home')"
        >{{ t('tabHome') }}</a>
        <a
          class="nav-tab"
          :class="{ 'nav-tab-active': mode === 'iptv' }"
          href="#/?mode=iptv"
          @click="$emit('switchMode', 'iptv')"
        >{{ t('tabIptv') }}</a>
        <a
          class="nav-tab"
          :class="{ 'nav-tab-active': mode === 'radio' }"
          href="#/?mode=radio"
          @click="$emit('switchMode', 'radio')"
        >{{ t('tabRadio') }}</a>
        <a
          v-if="showCustomTab"
          class="nav-tab"
          :class="{ 'nav-tab-active': mode === 'custom' }"
          href="#/?mode=custom"
          @click="$emit('switchMode', 'custom')"
        >{{ t('tabMyIptv') }}</a>
      </div>
      <div class="nav-sub-tabs">
        <button :class="{ active: section === 'channels' }" @click="section = 'channels'">{{ t('channels') }}</button>
        <button :class="{ active: section === 'favorites' }" @click="section = 'favorites'">
          {{ t('favorites') }} <span v-if="favorites.items.length" class="badge">{{ favorites.items.length }}</span>
        </button>
        <button :class="{ active: section === 'recent' }" @click="section = 'recent'">{{ t('recent') }}</button>
      </div>
      <template v-if="section === 'channels'">
        <div class="nav-search" v-if="tvs.length > 20 || search">
          <div class="search-wrapper">
            <input
              v-model="search"
              type="text"
              :placeholder="t('searchPlaceholder')"
              class="nav-search-input"
            />
            <button
              v-if="search"
              class="search-clear"
              @click="search = ''"
              :aria-label="t('clearSearch') || 'Clear search'"
            >&#10005;</button>
          </div>
        </div>
        <div class="nav-loading" v-if="loading">
          <span class="spinner"></span>
          <span>{{ t('loadingChannels') }}</span>
        </div>
        <template v-else>
          <div class="nav-channel-count" v-if="tvChannelCount > 0 && !search">
            {{ t('channelCount', { count: tvChannelCount }) }}
          </div>
          <div class="nav-no-results" v-if="search && filteredTvs.length === 0">
            {{ t('noResults') }}
          </div>
          <ul class="nav-list">
            <li class="sub-nav" v-for="i in filteredTvs" :key="i.url + i.name">
              <img
                v-if="i.meta && i.meta['tvg-logo']"
                :src="i.meta['tvg-logo']"
                class="tv-logo"
                loading="lazy"
                alt=""
              />
              <a
                v-if="i.isTv"
                :class="{ active: i.url == active }"
                :href="'#/?url=' + encodeURIComponent(i.url) + (i.caption ? '&caption=' + encodeURIComponent(i.caption) : '') + '&mode=' + mode"
                @click="navigateToChannel(i)"
              >{{ i.name }}</a>
              <span v-else class="group-label">{{ i.name }}</span>
              <button v-if="i.isTv" class="fav-btn" :class="{ active: favorites.isFavorite(i.url) }" @click.stop="favorites.toggle(i)">★</button>
            </li>
          </ul>
        </template>
      </template>
      <template v-if="section === 'favorites'">
        <div class="nav-tab-header">{{ t('myFavorites') }}</div>
        <ul class="nav-list" v-if="favorites.items.length">
          <li class="sub-nav" v-for="i in favorites.items" :key="i.url">
            <img v-if="i.logo" :src="i.logo" class="tv-logo" loading="lazy" alt="" />
            <a
              :class="{ active: i.url == active }"
              :href="'#/?url=' + encodeURIComponent(i.url) + (i.caption ? '&caption=' + encodeURIComponent(i.caption) : '') + '&mode=' + mode"
              @click="navigateToChannel(i)"
            >{{ i.name }}</a>
            <button class="fav-btn active" @click.stop="favorites.toggle(i)">★</button>
          </li>
        </ul>
        <div v-else class="nav-empty">{{ t('noFavorites') }}</div>
      </template>
      <template v-if="section === 'recent'">
        <div class="nav-tab-header">{{ t('recentlyWatched') }}</div>
        <ul class="nav-list" v-if="recent.items.length">
          <li class="sub-nav" v-for="i in recent.items" :key="i.url">
            <img v-if="i.logo" :src="i.logo" class="tv-logo" loading="lazy" alt="" />
            <a
              :class="{ active: i.url == active }"
              :href="'#/?url=' + encodeURIComponent(i.url) + (i.caption ? '&caption=' + encodeURIComponent(i.caption) : '') + '&mode=' + mode"
              @click="navigateToChannel(i)"
            >{{ i.name }}</a>
          </li>
        </ul>
        <div v-else class="nav-empty">{{ t('noRecent') }}</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "../i18n/index.js";
import { getFlagUrl } from "../utils/geolocation.js";
import { useFavoritesStore } from "../stores/favorites.js";
import { useRecentStore } from "../stores/recent.js";

const { t } = useI18n();
const favorites = useFavoritesStore();
const recent = useRecentStore();

const props = defineProps(["tvs", "active", "mode", "loading", "currentCountry", "customIptvActive"]);
defineEmits(["switchMode", "openSettings", "openShareLink"]);

const isOpen = ref(false);
const search = ref("");
const section = ref("channels");

const showCustomTab = computed(() => props.customIptvActive);

const currentCountryFlagUrl = computed(() => {
  if (!props.currentCountry) return "";
  return getFlagUrl(props.currentCountry);
});

const tvChannelCount = computed(() => {
  return props.tvs.filter((i) => i.isTv).length;
});

const filteredTvs = computed(() => {
  if (!search.value.trim()) return props.tvs;
  const q = search.value.toLowerCase();
  return props.tvs.filter((i) => i.name && i.name.toLowerCase().includes(q));
});

function setTitle(title) {
  document.title = title + t("titleSuffix");
}

function navigateToChannel(channel) {
  setTitle(channel.name);
  recent.add(channel);
  isOpen.value = false;
}
</script>

<style scoped lang="less">
.nav {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  color: var(--text-primary);

  .nav-menu {
    width: 1.5rem;
    height: 1.5rem;
    padding: 1rem;
    margin: 1rem;
    background: rgba(0, 217, 255, 0.1);
    border: 1px solid rgba(0, 217, 255, 0.2);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: rgba(0, 217, 255, 0.2);
      border-color: var(--primary-neon);
      box-shadow: 0 0 15px rgba(0, 217, 255, 0.3);
      transform: scale(1.1);
    }

    .logo {
      width: 1.5rem;
    }
  }

  .nav-list-warp {
    display: none;
    background: linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(15, 10, 25, 0.96) 100%);
    backdrop-filter: blur(15px);
    padding: 0;
    border-radius: 0;
    width: 300px;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-color);
  }

  &:not(.nav-open) .nav-list-warp { display: none; }
  &.nav-open .nav-menu { display: none; }
  &.nav-open .nav-list-warp { display: flex; }

  .nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0.8rem 0.8rem 1.2rem;
    min-height: 2.6rem;
    border-bottom: 1px solid var(--border-light);

    .nav-title {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      white-space: nowrap;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: linear-gradient(135deg, var(--primary-neon) 0%, var(--accent-silver) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;

      .country-indicator {
        height: 1rem;
        width: auto;
        border-radius: 3px;
        vertical-align: middle;
        border: 1px solid var(--border-color);
      }
    }

    .nav-header-actions {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-shrink: 0;

      .settings-btn {
        background: rgba(0, 217, 255, 0.1);
        border: 1px solid var(--border-color);
        color: var(--primary-neon);
        padding: 0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.2rem;
        height: 2.2rem;

        svg {
          width: 1.15rem;
          height: 1.15rem;
          flex-shrink: 0;
        }

        &:hover {
          background: var(--primary-neon);
          border-color: var(--primary-neon);
          color: var(--bg-darker);
          box-shadow: 0 0 15px rgba(0, 217, 255, 0.3);
          transform: scale(1.05);
        }

        &:active { transform: scale(0.95); }
      }

      .nav-close {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-light);
        color: var(--text-primary);
        font-size: 1.4rem;
        cursor: pointer;
        padding: 0.3rem 0.5rem;
        border-radius: 6px;
        line-height: 1;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-weight: 300;

        &:hover {
          background: rgba(0, 217, 255, 0.2);
          border-color: var(--primary-neon);
          color: var(--primary-neon);
          transform: rotate(90deg);
        }
      }
    }
  }

  .nav-tabs {
    display: flex;
    gap: 0;
    padding: 0.6rem 0.8rem;
    border-bottom: 1px solid var(--border-light);
  }

  .nav-tab {
    flex: 1;
    text-align: center;
    padding: 0.5rem 0.2rem;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--text-tertiary);
    text-decoration: none;
    border-bottom: 2px solid transparent;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;

    &:hover {
      color: var(--primary-neon);
      border-bottom-color: rgba(0, 217, 255, 0.3);
    }
  }

  .nav-tab-active {
    color: var(--primary-neon);
    border-bottom-color: var(--primary-neon);
  }

  .nav-sub-tabs {
    display: flex;
    gap: 0;
    padding: 0.4rem 1rem;
    border-bottom: 1px solid var(--border-light);

    button {
      flex: 1;
      padding: 0.4rem;
      background: none;
      border: none;
      border-radius: 6px;
      color: var(--text-tertiary);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &:hover { color: var(--primary-neon); background: rgba(0,217,255,0.05); }
      &.active { color: var(--primary-neon); background: rgba(0,217,255,0.1); }

      .badge {
        display: inline-block;
        background: var(--primary-neon);
        color: var(--bg-darker);
        font-size: 0.6rem;
        padding: 0.1rem 0.4rem;
        border-radius: 8px;
        margin-left: 0.3rem;
        font-weight: 700;
      }
    }
  }

  .nav-tab-header {
    padding: 0.5rem 1.2rem 0.3rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-tertiary);
  }

  .nav-search {
    padding: 0.8rem 1rem;

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .nav-search-input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.6rem 2.5rem 0.6rem 0.8rem;
      border-radius: 8px;
      border: 1px solid var(--border-light);
      background: rgba(0, 217, 255, 0.05);
      color: var(--text-primary);
      font-size: 0.85rem;
      outline: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &::placeholder { color: var(--text-tertiary); }

      &:focus {
        border-color: var(--primary-neon);
        background: rgba(0, 217, 255, 0.1);
        box-shadow: 0 0 15px rgba(0, 217, 255, 0.2);
      }
    }

    .search-clear {
      position: absolute;
      right: 0.8rem;
      background: none;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      padding: 0.4rem;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        color: var(--primary-neon);
        transform: scale(1.2) rotate(90deg);
      }

      &:active { transform: scale(0.9) rotate(90deg); }
    }
  }

  .nav-channel-count {
    padding: 0.3rem 1.2rem 0.4rem;
    font-size: 0.7rem;
    color: var(--text-tertiary);
    letter-spacing: 0.03em;
    font-weight: 500;
  }

  .nav-no-results {
    padding: 2rem 1.2rem;
    font-size: 0.85rem;
    color: var(--text-tertiary);
    text-align: center;
  }

  .nav-empty {
    padding: 2rem 1.2rem;
    font-size: 0.85rem;
    color: var(--text-tertiary);
    text-align: center;
    font-style: italic;
  }

  .nav-loading {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 2rem 1.2rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .spinner {
    display: inline-block;
    width: 1.2rem;
    height: 1.2rem;
    border: 2px solid var(--border-light);
    border-top-color: var(--primary-neon);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .active {
    color: var(--primary-neon);
    font-weight: 600;
  }

  .nav-list {
    margin: 0;
    padding: 0;
    list-style: none;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: var(--border-color) transparent;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 3px;

      &:hover {
        background: var(--primary-neon);
      }
    }
  }

  .sub-nav {
    padding: 0 1rem 0 1.2rem;
    height: 2.3rem;
    line-height: 2.3rem;
    display: flex;
    align-items: center;
    min-width: 0;
    transition: all 0.2s;

    &:hover {
      background: rgba(0, 217, 255, 0.08);
      padding-left: 1.4rem;
    }

    .tv-logo {
      max-width: 2.5rem;
      max-height: 1.6rem;
      margin-right: 0.8rem;
      border-radius: 4px;
      flex-shrink: 0;
      border: 1px solid var(--border-light);
    }

    a {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.88rem;
      min-width: 0;
      flex: 1;
      transition: color 0.2s;

      &:hover {
        color: var(--primary-neon);
      }
    }
  }

  .fav-btn {
    background: none;
    border: none;
    color: var(--text-tertiary);
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0 0.3rem;
    flex-shrink: 0;
    transition: all 0.2s;

    &:hover { color: #facc15; transform: scale(1.2); }
    &.active { color: #facc15; }
  }

  .group-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-tertiary);
    padding-top: 0.6rem;
  }

  a {
    color: var(--text-primary);
    text-decoration: none;
  }
}

@media (max-width: 600px) {
  .nav .nav-list-warp {
    width: 100vw;
  }
}
</style>
