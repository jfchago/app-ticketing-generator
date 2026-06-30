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
