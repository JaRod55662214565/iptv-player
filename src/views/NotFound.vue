<template>
  <div class="not-found">
    <div class="not-found-content">
      <h1>404</h1>
      <p>{{ t('notFoundMessage') }}</p>
      <a href="#/" class="home-link">{{ t('goHome') }}</a>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "../i18n/index.js";
const { t } = useI18n();
</script>

<style scoped>
.not-found {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-darker);
}

.not-found-content {
  text-align: center;
}

.not-found-content h1 {
  font-size: 4rem;
  font-weight: 800;
  color: var(--primary);
  margin: 0;
}

.not-found-content p {
  color: var(--text-secondary);
  margin: 1rem 0 2rem;
  font-size: 1.1rem;
}

.home-link {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: #fff;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
}
</style>
