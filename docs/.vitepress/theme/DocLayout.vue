<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import IssueFooter from './IssueFooter.vue'
import MetaBar from './MetaBar.vue'
import { useData } from 'vitepress'

const { frontmatter } = useData()
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-before>
      <MetaBar v-if="frontmatter.layout !== 'page' && frontmatter.layout !== 'home'" />
    </template>
    <template #doc-after>
      <IssueFooter v-if="frontmatter.layout !== 'page' && frontmatter.layout !== 'home'" />
    </template>
  </DefaultTheme.Layout>
</template>
