import { defineStore } from 'pinia'

export const useToast = defineStore('toast', {
  state: () => ({
    visible: false,
    message: '',
    type: 'error',
    timer: null,
  }),
  actions: {
    show(message, type = 'error', duration = 4000) {
      this.message = message
      this.type = type
      this.visible = true
      if (this.timer) clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.visible = false
      }, duration)
    },
    hide() {
      this.visible = false
      if (this.timer) clearTimeout(this.timer)
    },
  },
})
