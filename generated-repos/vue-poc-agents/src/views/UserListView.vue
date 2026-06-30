<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user.store';
import UserCard from '../components/UserCard.vue';
import LoaderSpinner from '../components/LoaderSpinner.vue';
import ErrorState from '../components/ErrorState.vue';
import EmptyState from '../components/EmptyState.vue';

const store = useUserStore();
const router = useRouter();

onMounted(() => {
  store.loadUsers();
});

function retryLoad() {
  store.loadUsers();
}

function goToDetail(id: string) {
  router.push('/users/' + id);
}
</script>

<template>
  <div class="list-view">
    <header>
      <h1>Users</h1>
    </header>

    <div aria-live="polite">
      <LoaderSpinner v-if="store.loading" />
      <ErrorState v-else-if="store.error" :message="store.error" :retry-fn="retryLoad" />
      <EmptyState v-else-if="store.users.length === 0" :entity-name="'User'" />
      <div v-else class="card-grid">
        <UserCard v-for="item in store.users" :key="item.id" :item="item" @click="goToDetail" />
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
