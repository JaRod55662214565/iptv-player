import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'webtv-favorites'

export const useFavoritesStore = defineStore('favorites', () => {
  const items = ref([])
  let syncTimeout = null

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) items.value = JSON.parse(raw)
    } catch {}
    loadFromServer()
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
    } catch {}
  }

  async function loadFromServer() {
    try {
      const res = await fetch('/api/favorites')
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.items) && data.items.length > 0) {
        items.value = data.items
        save()
      }
    } catch {}
  }

  async function syncToServer() {
    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.value }),
      })
    } catch {}
  }

  function scheduleSync() {
    if (syncTimeout) clearTimeout(syncTimeout)
    syncTimeout = setTimeout(syncToServer, 2000)
  }

  function toggle(channel) {
    const idx = items.value.findIndex(i => i.url === channel.url)
    if (idx >= 0) {
      items.value.splice(idx, 1)
    } else {
      items.value.push({ url: channel.url, name: channel.name, logo: channel.meta?.['tvg-logo'] || '', caption: channel.caption })
    }
    save()
    scheduleSync()
  }

  function isFavorite(url) {
    return items.value.some(i => i.url === url)
  }

  load()
  watch(items, save, { deep: true })

  return { items, toggle, isFavorite, load }
})
