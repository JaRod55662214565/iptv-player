<template>
  <div v-if="isBlocked" class="block-gate-overlay">
    <div class="block-gate-container">
      <div class="block-icon">🚫</div>
      <h1>{{ t('blocked.title') }}</h1>
      <p class="block-message">{{ t('blocked.message') }}</p>
      
      <div v-if="ipInfo" class="block-details">
        <div class="detail-item">
          <span class="label">{{ t('blocked.ip') }}:</span>
          <code>{{ ipInfo.ip }}</code>
        </div>
        <div class="detail-item">
          <span class="label">{{ t('blocked.isp') }}:</span>
          <span>{{ ipInfo.isp }}</span>
        </div>
        <div class="detail-item">
          <span class="label">{{ t('blocked.country') }}:</span>
          <span>{{ ipInfo.country }} - {{ ipInfo.city }}</span>
        </div>
        
        <div class="threat-details">
          <div v-if="ipInfo.isProxy" class="threat-item proxy">
            <span class="icon">⚠️</span>
            <span>{{ t('blocked.proxyDetected') }}</span>
          </div>
          <div v-if="ipInfo.isHosting" class="threat-item hosting">
            <span class="icon">⚠️</span>
            <span>{{ t('blocked.hostingDetected') }}</span>
          </div>
        </div>
      </div>
      
      <p class="block-info">{{ t('blocked.details') }}</p>
    </div>
  </div>
  
  <slot v-else />
</template>

<script setup>
import { defineProps, onMounted, ref } from 'vue'
import { useI18n } from '../i18n/index.js'
import { getStoredIpInfo } from '../services/trackingService.js'

const { t } = useI18n()

defineProps({
  isBlocked: {
    type: Boolean,
    default: false
  }
})

const ipInfo = ref(null)

onMounted(() => {
  ipInfo.value = getStoredIpInfo()
})
</script>

<style scoped lang="less">
.block-gate-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(30, 30, 50, 0.95));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(5px);
}

.block-gate-container {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 40px;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  color: #fff;
  backdrop-filter: blur(10px);
}

.block-icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

h1 {
  font-size: 28px;
  margin-bottom: 10px;
  color: #ff6b6b;
  font-weight: 600;
}

.block-message {
  font-size: 16px;
  color: #e0e0e0;
  margin-bottom: 30px;
  line-height: 1.6;
}

.block-details {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: left;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  
  .label {
    color: #b0b0b0;
    font-weight: 500;
  }
  
  code {
    background: rgba(0, 0, 0, 0.3);
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    color: #4ecdc4;
  }
}

.threat-details {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.threat-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  
  &.proxy, &.hosting {
    color: #ff9f43;
  }
  
  .icon {
    margin-right: 8px;
    font-size: 16px;
  }
}

.block-info {
  font-size: 12px;
  color: #a0a0a0;
  line-height: 1.6;
  margin-top: 0;
}
</style>
