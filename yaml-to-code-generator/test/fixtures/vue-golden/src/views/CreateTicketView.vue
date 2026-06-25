<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useTicketStore } from '../stores/ticket.store';
import TicketForm from '../components/TicketForm.vue';
import type { Ticket } from '../domain/ticket/ticket.types';

import type { TicketStatus } from '../domain/ticket/ticket.types';

import type { TicketPriority } from '../domain/ticket/ticket.types';

const store = useTicketStore();
const router = useRouter();

async function handleSubmit(data: Partial<Ticket>) {
  try {
    const result = await store.create(
      data.title ?? '',
      data.description ?? '',
      data.priority ?? '',
    );
    router.push('/tickets/' + result.id);
  } catch (e) {
    console.error('Failed to create', e);
  }
}
</script>

<template>
  <div class="create-view">
    <button @click="router.back()" class="btn-back">← Back</button>
    <h1>Create Ticket</h1>
    <TicketForm @submit="handleSubmit" />
  </div>
</template>

<style scoped>
.create-view {
  max-width: 600px;
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
</style>
