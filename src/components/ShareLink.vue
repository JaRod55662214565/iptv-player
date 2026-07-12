<template>
  <div v-if="isOpen" class="share-overlay" @click.self="$emit('close')">
    <div class="share-modal">
      <div class="share-header">
        <div class="share-title-wrap">
          <svg class="share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <h2 class="share-title">{{ t('share.title') }}</h2>
        </div>
        <button class="share-close" @click="$emit('close')" aria-label="Close">&times;</button>
      </div>

      <div class="share-body">
        <p class="share-desc">{{ t('share.description') }}</p>

        <div class="share-link-row">
          <input
            ref="linkInput"
            type="text"
            :value="directLink"
            readonly
            class="share-input"
            @focus="$event.target.select()"
          />
          <button class="share-copy-btn" :class="{ 'share-copy-ok': copied }" @click="copyToClipboard">
            <svg v-if="!copied" class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <svg v-else class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {{ copied ? t('share.copied') : t('share.copy') }}
          </button>
        </div>

        <div class="share-socials">
          <a :href="whatsappUrl" target="_blank" rel="noopener" class="social-btn social-whatsapp" :title="t('share.whatsapp')">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </a>
          <a :href="telegramUrl" target="_blank" rel="noopener" class="social-btn social-telegram" :title="t('share.telegram')">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </a>
          <a :href="twitterUrl" target="_blank" rel="noopener" class="social-btn social-twitter" :title="t('share.twitter')">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a :href="emailUrl" class="social-btn social-email" :title="t('share.email')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from '../i18n/index.js';

const { t } = useI18n();

const props = defineProps({
  isOpen: Boolean,
  url: String,
  caption: String,
  mode: { type: String, default: 'home' }
});

defineEmits(['close']);

const linkInput = ref(null);
const copied = ref(false);

const directLink = computed(() => {
  if (!props.url) return '';
  const params = new URLSearchParams();
  params.set('url', props.url);
  if (props.caption) params.set('caption', props.caption);
  params.set('mode', props.mode);
  return `${window.location.origin}${window.location.pathname}#/?${params.toString()}`;
});

const encodedLink = computed(() => encodeURIComponent(directLink.value));
const shareText = computed(() => props.caption ? `${props.caption} — ${directLink.value}` : directLink.value);
const encodedText = computed(() => encodeURIComponent(shareText.value));

const whatsappUrl = computed(() => `https://wa.me/?text=${encodedText.value}`);
const telegramUrl = computed(() => `https://t.me/share/url?url=${encodedLink.value}&text=${encodedText.value}`);
const twitterUrl = computed(() => `https://twitter.com/intent/tweet?url=${encodedLink.value}&text=${encodedText.value}`);
const emailUrl = computed(() => `mailto:?subject=${encodeURIComponent(props.caption || 'Check this channel')}&body=${encodedText.value}`);

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(directLink.value);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = directLink.value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  }
};
</script>

<style scoped lang="less">
.share-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 250;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.share-modal {
  background: rgba(12, 12, 25, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  width: 92%;
  max-width: 440px;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(0, 217, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(24px) scale(0.96); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 0;
}

.share-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.share-icon {
  width: 22px;
  height: 22px;
  color: #00d9ff;
}

.share-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00d9ff, #a0e0ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.share-close {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.4rem;
  cursor: pointer;
  width: 2.2rem;
  height: 2.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: all 0.2s ease;
  line-height: 1;

  &:hover {
    background: rgba(255, 100, 100, 0.15);
    border-color: rgba(255, 100, 100, 0.3);
    color: #ff6666;
    transform: rotate(90deg);
  }
}

.share-body {
  padding: 1.5rem;
}

.share-desc {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 1.2rem;
  line-height: 1.5;
}

.share-link-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.share-input {
  flex: 1;
  min-width: 0;
  padding: 0.7rem 0.9rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #fff;
  font-size: 0.8rem;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: rgba(0, 217, 255, 0.4);
    background: rgba(0, 217, 255, 0.06);
    box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.08);
  }
}

.share-copy-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.7rem 1rem;
  background: linear-gradient(135deg, #00d9ff, #00a8cc);
  border: none;
  border-radius: 10px;
  color: #050510;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 217, 255, 0.35);
  }

  &:active {
    transform: translateY(0);
  }

  &.share-copy-ok {
    background: linear-gradient(135deg, #22c55e, #16a34a);
  }
}

.copy-icon {
  width: 16px;
  height: 16px;
}

.share-socials {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #fff;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;

  svg {
    width: 22px;
    height: 22px;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
}

.social-whatsapp {
  background: rgba(37, 211, 102, 0.12);
  border-color: rgba(37, 211, 102, 0.2);

  &:hover {
    background: rgba(37, 211, 102, 0.25);
    color: #25d366;
    box-shadow: 0 8px 24px rgba(37, 211, 102, 0.25);
  }
}

.social-telegram {
  background: rgba(0, 136, 204, 0.12);
  border-color: rgba(0, 136, 204, 0.2);

  &:hover {
    background: rgba(0, 136, 204, 0.25);
    color: #0088cc;
    box-shadow: 0 8px 24px rgba(0, 136, 204, 0.25);
  }
}

.social-twitter {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    box-shadow: 0 8px 24px rgba(255, 255, 255, 0.1);
  }
}

.social-email {
  background: rgba(255, 165, 0, 0.1);
  border-color: rgba(255, 165, 0, 0.2);

  &:hover {
    background: rgba(255, 165, 0, 0.2);
    color: #ffa500;
    box-shadow: 0 8px 24px rgba(255, 165, 0, 0.2);
  }
}
</style>
