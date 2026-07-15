<template>
  <div class="not-found">
    <div class="not-found-content">
      <div class="not-found-code">404</div>
      <p class="not-found-text">{{ t('notFoundMessage') }}</p>
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
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-darker);
}

.not-found-content {
  text-align: center;
  animation: fadeIn 400ms var(--ease-out);
}

.not-found-code {
  font-size: 5rem;
  font-weight: 800;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  margin: 0;
  background: linear-gradient(135deg, var(--primary-neon) 0%, var(--accent-silver) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 40px rgba(0, 217, 255, 0.3);
  line-height: 1;
}

.not-found-text {
  color: var(--text-secondary);
  margin: 1rem 0 2rem;
  font-size: 1.1rem;
}

.home-link {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: var(--primary-neon);
  color: var(--bg-darker);
  border-radius: 10px;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.9rem;
  transition: box-shadow 200ms var(--ease-out), transform 200ms var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .home-link:hover {
    box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
    transform: translateY(-1px);
  }
}

.home-link:active {
  transform: scale(0.97);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
