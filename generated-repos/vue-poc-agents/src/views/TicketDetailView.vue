<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTicketStore } from '../stores/ticket.store';

import Badge from '../components/Badge.vue';

import { formatDate } from '../shared/date-utils';

import LoaderSpinner from '../components/LoaderSpinner.vue';
import ErrorState from '../components/ErrorState.vue';
import EmptyState from '../components/EmptyState.vue';

const store = useTicketStore();
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
      <EmptyState v-else-if="!store.current" :entity-name="'Ticket Detail'" message="Not found" />
      <div v-else>
        <h1>{{ store.current.title }}</h1>

        <p class="description">{{ store.current.description }}</p>

        <div class="meta">
          <span>Status: <Badge type="status" :value="store.current.status" /></span>

          <span>Priority: <Badge type="priority" :value="store.current.priority" /></span>

          <span>Assigned to: <Badge type="assignee" :value="store.current.assigneeId" /></span>

          <span>CreatedAt: {{ formatDate(store.current.createdAt) }}</span>

          <span>UpdatedAt: {{ formatDate(store.current.updatedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
