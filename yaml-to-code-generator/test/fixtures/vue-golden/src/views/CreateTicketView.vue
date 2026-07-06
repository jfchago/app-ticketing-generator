

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useTicketStore } from '../stores/ticket.store';
import TicketForm from '../components/TicketForm.vue';
import type { Ticket } from '../domain/ticket/ticket.types';

const store = useTicketStore();
const router = useRouter();

async function handleSubmit(data: Partial<Ticket>) {
  try {

    const result = await store.create(data as Omit<Ticket, 'id' | 'createdAt'>);
    router.push('/tickets/' + result?.id);

  } catch (e) {
    console.error('Failed to create', e);
  }
}
</script>

<template>
  <div class="create-view">
    <button @click="router.back()" class="btn-back" aria-label="Go back">← Back</button>
    <h1>Create Ticket</h1>
    <TicketForm @submit="handleSubmit" />
  </div>
</template>

