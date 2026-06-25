<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "../stores/user.store";
import UserCard from "../components/UserCard.vue";

const store = useUserStore();
const router = useRouter();

onMounted(() => {
  store.loadUsers();
});

function goToDetail(id: string) {
  router.push("/users/" + id);
}
</script>

<template>
  <div class="list-view">
    <header>
      <h1>Users</h1>
    </header>

    <div v-if="store.loading">Loading...</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>
    <div v-else>
      <UserCard
        v-for="item in store.users"
        :key="item.id"
        :item="item"
        @click="goToDetail"
      />
    </div>
  </div>
</template>

<style scoped>
.list-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.btn-primary {
  padding: 8px 16px;
  background: var(--color-primary, #42b883);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.error {
  color: red;
}
</style>
