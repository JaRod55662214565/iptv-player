<template>
  <div v-if="showAds" class="ads-container">
    <div :id="containerId" class="ad-wrapper">
      <div class="ad-placeholder">💰 Publicité</div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, onMounted, onUnmounted, computed, ref } from 'vue'
import { showAd } from '../services/monetagService.js'

const props = defineProps({
  position: {
    type: String,
    default: 'top'
  }
})

const monetagEnabled = import.meta.env.VITE_MONETAG_ENABLED === 'true'
const showAds = ref(false)
const isPremium = ref(false)
const containerId = computed(() => `monetag-ad-${props.position}`)

function updatePremium() {
  showAds.value = monetagEnabled && !isPremium.value
}

let premiumWatcher = null

async function checkPremium() {
  try {
    const res = await fetch('/api/check-premium')
    const data = await res.json()
    isPremium.value = data.isPremium
    updatePremium()
  } catch {}
}

onMounted(async () => {
  await checkPremium()
  if (showAds.value) {
    setTimeout(() => showAd(props.position), 500)
  }
  premiumWatcher = setInterval(async () => {
    const was = showAds.value
    await checkPremium()
    if (was && !showAds.value) {
      const el = document.getElementById(containerId.value)
      if (el) el.style.display = 'none'
    }
  }, 2000)
})

onUnmounted(() => {
  if (premiumWatcher) clearInterval(premiumWatcher)
})
</script>

<style scoped lang="less">
.ads-container {
  width: 100%;
  margin: 10px 0;
  display: flex;
  justify-content: center;
  
  @media (max-width: 768px) {
    margin: 8px 0;
  }
}

.ad-wrapper {
  width: 100%;
  min-height: 50px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.ad-placeholder {
  color: #999;
  font-size: 12px;
  text-align: center;
}
</style>
