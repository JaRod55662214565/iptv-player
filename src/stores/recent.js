import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'webtv-recent'
const MAX = 20

export const useRecentStore = defineStore('recent', () => {
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

  function add(channel) {
    items.value = items.value.filter(i => i.url !== channel.url)
    items.value.unshift({ url: channel.url, name: channel.name, logo: channel.meta?.['tvg-logo'] || '', caption: channel.caption, time: Date.now() })
    if (items.value.length > MAX) items.value = items.value.slice(0, MAX)
    save()
  }

  load()
  return { items, add, load }
})
