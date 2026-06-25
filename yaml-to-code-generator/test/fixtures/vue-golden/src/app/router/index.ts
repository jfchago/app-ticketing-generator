
import { createRouter, createWebHistory } from 'vue-router';


import UserListView from '../../views/UserListView.vue';



import TicketListView from '../../views/TicketListView.vue';






const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/users'
    },


    {
      path: '/users',
      name: 'user-list',
      component: UserListView
    },





    {
      path: '/tickets',
      name: 'ticket-list',
      component: TicketListView
    },


    {
      path: '/tickets/new',
      name: 'create-ticket',
      component: () => import('../../views/CreateTicketView.vue')
    },


    {
      path: '/tickets/:id',
      name: 'ticket-detail',
      component: () => import('../../views/TicketDetailView.vue')
    },






  ]
});

export default router;
