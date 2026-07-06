import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import 'video.js/dist/video-js.css'
import { createI18n } from './i18n/index.js'

const app = createApp(App)
const pinia = createPinia()
const i18n = createI18n()
app.use(pinia)
app.use(i18n)
app.mount('#app')
