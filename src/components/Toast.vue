<template>
  <Teleport to="body">
    <div v-if="toast.visible" :class="['toast', toast.type]" role="alert" @click="toast.hide()">
      <span class="toast-icon">
        <template v-if="toast.type === 'error'">✕</template>
        <template v-else-if="toast.type === 'success'">✓</template>
        <template v-else>ℹ</template>
      </span>
      <span class="toast-text">{{ toast.message }}</span>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../stores/toast'
const toast = useToast()
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 12px 20px;
  border-radius: var(--radius-md, 12px);
  font-size: 14px;
  font-weight: 500;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  cursor: pointer;
  max-width: 90vw;
  text-align: center;
  animation: toastIn 200ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.toast.error {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.toast.error .toast-icon {
  background: rgba(239, 68, 68, 0.25);
  color: #ef4444;
}
.toast.success {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.toast.success .toast-icon {
  background: rgba(34, 197, 94, 0.25);
  color: #22c55e;
}
.toast.info {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.3);
}
.toast.info .toast-icon {
  background: rgba(59, 130, 246, 0.25);
  color: #3b82f6;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
</style>
