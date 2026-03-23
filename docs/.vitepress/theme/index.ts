import DefaultTheme from 'vitepress/theme'
import HomePage from './HomePage.vue'
import DocLayout from './DocLayout.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: DocLayout,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
  },
}
