<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../stores/user.store';

import LoaderSpinner from '../components/LoaderSpinner.vue';
import ErrorState from '../components/ErrorState.vue';
import EmptyState from '../components/EmptyState.vue';

const store = useUserStore();
const route = useRoute();
const router = useRouter();

onMounted(() => {
  store.getById(route.params.id as string);
});

function retryLoad() {
  store.getById(route.params.id as string);
}
</script>

<template>
  <div class="detail-view">
    <button @click="router.back()" class="btn-back" aria-label="Go back">← Back</button>

    <div aria-live="polite">
      <LoaderSpinner v-if="store.loading" />
      <ErrorState v-else-if="store.error" :message="store.error" :retry-fn="retryLoad" />
      <EmptyState v-else-if="!store.current" :entity-name="'User Detail'" message="Not found" />
      <div v-else>
        <div class="meta">
          <span>Name: {{ store.current.name }}</span>

          <span>Avatar: {{ store.current.avatar }}</span>

          <span>Role: {{ store.current.role }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-view {
  max-width: var(--content-max-width, 800px);
  margin: 0 auto;
  padding: var(--space-xl, 20px);
}
.btn-back {
  padding: var(--space-sm, 8px) var(--space-lg, 16px);
  background: transparent;
  border: 1px solid var(--color-border, #ddd);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  margin-bottom: var(--space-lg, 16px);
}
.description {
  color: var(--color-text-secondary, #666);
  margin: var(--space-md, 12px) 0;
}
.meta {
  display: flex;
  gap: var(--space-lg, 16px);
  margin: var(--space-lg, 16px) 0;
  flex-wrap: wrap;
}
.error {
  color: var(--color-danger, #dc3545);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Status transition dropdown */
.status-transition {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
  margin-top: var(--space-md, 12px);
}
.status-transition label {
  font-weight: var(--font-weight-semibold, 600);
}
.status-transition select {
  padding: var(--space-sm, 8px);
  border: 1px solid var(--color-border, #ddd);
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-base, 1em);
  min-height: 44px;
  min-width: 44px;
}
.status-transition select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.transition-error {
  color: var(--color-danger, #dc3545);
  font-size: var(--font-size-sm, 0.85em);
  margin: 0;
}
</style>
