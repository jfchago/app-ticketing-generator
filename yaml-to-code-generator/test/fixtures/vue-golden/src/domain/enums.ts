export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export const TicketStatus_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Abierta',

  IN_PROGRESS: 'En curso',

  RESOLVED: 'Resuelta',

  CLOSED: 'Cerrada',
};

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const TicketPriority_LABELS: Record<TicketPriority, string> = {
  LOW: 'Baja',

  MEDIUM: 'Media',

  HIGH: 'Alta',

  URGENT: 'Urgente',
};

export type UserRole = 'STAFF' | 'CUSTOMER';

export const UserRole_LABELS: Record<UserRole, string> = {
  STAFF: 'Staff',

  CUSTOMER: 'Customer',
};
