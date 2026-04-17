import DefaultTheme from 'vitepress/theme'
import HomePage from './HomePage.vue'
import DocLayout from './DocLayout.vue'
import TagCloud from './TagCloud.vue'
import QuestionList from './QuestionList.vue'
import './tokens.css'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: DocLayout,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
    app.component('TagCloud', TagCloud)
    app.component('QuestionList', QuestionList)
  },
}
