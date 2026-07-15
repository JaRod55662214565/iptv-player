import { ref, watch, nextTick, onUnmounted } from 'vue';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModal(visible, onClose) {
  const modalRef = ref(null);
  let previousFocus = null;

  function getFocusableEls() {
    if (!modalRef.value) return [];
    return Array.from(modalRef.value.querySelectorAll(FOCUSABLE));
  }

  function trapFocus(e) {
    if (!modalRef.value) return;
    const focusable = getFocusableEls();
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
    trapFocus(e);
  }

  async function activate() {
    previousFocus = document.activeElement;
    document.addEventListener('keydown', handleKeydown);
    await nextTick();
    const focusable = getFocusableEls();
    if (focusable.length) {
      focusable[0].focus();
    }
  }

  function deactivate() {
    document.removeEventListener('keydown', handleKeydown);
    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
    }
    previousFocus = null;
  }

  watch(() => visible.value, async (open) => {
    if (open) {
      await activate();
    } else {
      deactivate();
    }
  });

  onUnmounted(() => {
    deactivate();
  });

  return { modalRef };
}
