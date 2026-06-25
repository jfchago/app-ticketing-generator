<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTicketStore } from "../stores/ticket.store";

import StatusBadge from "../components/TicketStatusBadge.vue";

import PriorityBadge from "../components/TicketPriorityBadge.vue";

import AssigneeBadge from "../components/TicketAssigneeBadge.vue";

const store = useTicketStore();
const route = useRoute();
const router = useRouter();

onMounted(() => {
  store.loadTicket(route.params.id as string);
});
</script>

<template>
  <div class="detail-view">
    <button @click="router.back()" class="btn-back">← Back</button>

    <div v-if="store.loading">Loading...</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>
    <div v-else-if="store.current">
      <h1>{{ store.current.title }}</h1>
      <p class="description">{{ store.current.description }}</p>

      <div class="meta">
        <span>Status: <StatusBadge :status="store.current.status" /></span>
        <span
          >Priority: <PriorityBadge :priority="store.current.priority"
        /></span>
        <span
          >Assigned to: <AssigneeBadge :assignee-id="store.current.assigneeId"
        /></span>
        <span
          >Created:
          {{ new Date(store.current.createdAt).toLocaleDateString() }}</span
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
.btn-back {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 16px;
}
.description {
  color: var(--color-text-secondary, #666);
  margin: 12px 0;
}
.meta {
  display: flex;
  gap: 16px;
  margin: 16px 0;
}
.error {
  color: red;
}
</style>
