<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTicketStore } from '../stores/ticket.store';
import TicketCard from '../components/TicketCard.vue';
import LoaderSpinner from '../components/LoaderSpinner.vue';
import ErrorState from '../components/ErrorState.vue';
import EmptyState from '../components/EmptyState.vue';

const store = useTicketStore();
const router = useRouter();

onMounted(() => {
  store.getAll();
});

function retryLoad() {
  store.getAll();
}

function goToDetail(id: string) {
  router.push('/tickets/' + id);
}

function goToCreate() {
  router.push('/tickets/new');
}
</script>

<template>
  <div class="list-view">
    <header>
      <h1>Tickets</h1>

      <button @click="goToCreate" class="btn-primary" aria-label="Create new Ticket">
        + New Ticket
      </button>
    </header>

    <div aria-live="polite">
      <LoaderSpinner v-if="store.loading" />
      <ErrorState v-else-if="store.error" :message="store.error" :retry-fn="retryLoad" />
      <EmptyState v-else-if="store.tickets.length === 0" :entity-name="'Ticket'" />
      <div v-else class="card-grid">
        <TicketCard v-for="item in store.tickets" :key="item.id" :item="item" @click="goToDetail" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md, 12px);
}
@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
