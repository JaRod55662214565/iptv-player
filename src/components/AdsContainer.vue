<template>
  <div v-if="showAds" class="ads-container">
    <div :id="containerId" class="ad-wrapper">
      <div class="ad-placeholder">💰 Publicité</div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, onMounted, computed, ref } from 'vue'
import { showAd, refreshMonetag } from '../services/monetagService.js'

const props = defineProps({
  position: {
    type: String,
    default: 'top'
  }
})

const showAds = ref(import.meta.env.VITE_MONETAG_ENABLED === 'true')
const containerId = computed(() => `monetag-ad-${props.position}`)

onMounted(() => {
  if (showAds.value) {
    setTimeout(() => {
      refreshMonetag()
      fetch('/api/ads/shown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName: '', streamUrl: '' }),
      }).catch(() => {})
    }, 500)
  }
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
