<template>
  <Teleport to="body">
    <div v-if="toast.visible" :class="['toast', toast.type]" @click="toast.hide()">
      <span>{{ toast.message }}</span>
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
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  max-width: 90vw;
  text-align: center;
  animation: toastIn 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
.toast.error {
  background: #c0392b;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.toast.success {
  background: #27ae60;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.toast.info {
  background: #2980b9;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
