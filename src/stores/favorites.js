import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'webtv-favorites'

export const useFavoritesStore = defineStore('favorites', () => {
  const items = ref([])

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) items.value = JSON.parse(raw)
    } catch {}
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
    } catch {}
  }

  function toggle(channel) {
    const idx = items.value.findIndex(i => i.url === channel.url)
    if (idx >= 0) {
      items.value.splice(idx, 1)
    } else {
      items.value.push({ url: channel.url, name: channel.name, logo: channel.meta?.['tvg-logo'] || '', caption: channel.caption })
    }
    save()
  }

  function isFavorite(url) {
    return items.value.some(i => i.url === url)
  }

  load()
  watch(items, save, { deep: true })

  return { items, toggle, isFavorite, load }
})
