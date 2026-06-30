import { createRouter, createWebHistory } from 'vue-router';

import TicketListView from '../../views/TicketListView.vue';

import UserListView from '../../views/UserListView.vue';

import AppShell from '../../components/AppShell.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/tickets',
    },
    {
      path: '/',
      component: AppShell,
      children: [
        {
          path: 'tickets',
          name: 'ticket-list',
          component: TicketListView,
          meta: { breadcrumb: 'Tickets' },
        },

        {
          path: 'tickets/new',
          name: 'create-ticket',
          component: () => import('../../views/CreateTicketView.vue'),
          meta: { breadcrumb: 'Create Ticket' },
        },

        {
          path: 'tickets/:id',
          name: 'ticket-detail',
          component: () => import('../../views/TicketDetailView.vue'),
          meta: { breadcrumb: 'Ticket Detail' },
        },

        {
          path: 'users',
          name: 'user-list',
          component: UserListView,
          meta: { breadcrumb: 'Users' },
        },

        {
          path: 'users/:id',
          name: 'user-detail',
          component: () => import('../../views/UserDetailView.vue'),
          meta: { breadcrumb: 'User Detail' },
        },
      ],
    },
  ],
});

export default router;
