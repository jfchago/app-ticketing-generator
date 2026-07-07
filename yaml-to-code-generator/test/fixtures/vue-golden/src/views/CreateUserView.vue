

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user.store';
import UserForm from '../components/UserForm.vue';
import type { User } from '../domain/user/user.types';

const store = useUserStore();
const router = useRouter();

async function handleSubmit(data: Partial<User>) {
  try {

    const result = await store.create(data as Omit<User, 'id' | 'createdAt'>);
    router.push('/users/' + result?.id);

  } catch (e) {
    console.error('Failed to create', e);
  }
}
</script>

<template>
  <div class="create-view">
    <button @click="router.back()" class="btn-back" aria-label="Go back">← Back</button>
    <h1>Create User</h1>
    <UserForm @submit="handleSubmit" />
  </div>
</template>
