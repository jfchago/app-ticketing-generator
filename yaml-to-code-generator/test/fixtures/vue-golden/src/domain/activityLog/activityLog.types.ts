// activityLog.types.ts — Generated from helpdesk.yaml

export interface ActivityLog {
  id: string;
  ticketId: string;
  actionType: string;
  actorId: string;
  actorName: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  createdAt: string;
}
