// ir/use-case-resolver.ts — Maps raw use case keys to resolved UseCaseDef
// This is the central mapping table. Add new use cases here to support
// them across ALL template packs automatically.

import type { UseCaseDef, HttpMethod } from './types.js';

interface UseCaseTemplate {
  methodName: string;
  httpMethod: HttpMethod;
  needsPayload: boolean;
  needsId: boolean;
  pathSuffix: string;
  actionLabel: string;
}

const USE_CASE_MAP: Record<string, UseCaseTemplate> = {
  get_all: {
    methodName: 'getAll',
    httpMethod: 'GET',
    needsPayload: false,
    needsId: false,
    pathSuffix: '',
    actionLabel: 'List all',
  },
  get_by_id: {
    methodName: 'getById',
    httpMethod: 'GET',
    needsPayload: false,
    needsId: true,
    pathSuffix: '/{id}',
    actionLabel: 'Get by ID',
  },
  create: {
    methodName: 'create',
    httpMethod: 'POST',
    needsPayload: true,
    needsId: false,
    pathSuffix: '',
    actionLabel: 'Create',
  },
  update: {
    methodName: 'update',
    httpMethod: 'PUT',
    needsPayload: true,
    needsId: true,
    pathSuffix: '/{id}',
    actionLabel: 'Update',
  },
  update_status: {
    methodName: 'updateStatus',
    httpMethod: 'PATCH',
    needsPayload: true,
    needsId: true,
    pathSuffix: '/{id}/status',
    actionLabel: 'Update status',
  },
  update_priority: {
    methodName: 'updatePriority',
    httpMethod: 'PATCH',
    needsPayload: true,
    needsId: true,
    pathSuffix: '/{id}/priority',
    actionLabel: 'Update priority',
  },
  assign_user: {
    methodName: 'assignUser',
    httpMethod: 'PUT',
    needsPayload: true,
    needsId: true,
    pathSuffix: '/{id}/assign',
    actionLabel: 'Assign user',
  },
  unassign_user: {
    methodName: 'unassignUser',
    httpMethod: 'DELETE',
    needsPayload: false,
    needsId: true,
    pathSuffix: '/{id}/assign',
    actionLabel: 'Unassign user',
  },
  add_comment: {
    methodName: 'addComment',
    httpMethod: 'POST',
    needsPayload: true,
    needsId: true,
    pathSuffix: '/{id}/comments',
    actionLabel: 'Add comment',
  },
  delete: {
    methodName: 'delete',
    httpMethod: 'DELETE',
    needsPayload: false,
    needsId: true,
    pathSuffix: '/{id}',
    actionLabel: 'Delete',
  },
  load_users: {
    methodName: 'loadUsers',
    httpMethod: 'GET',
    needsPayload: false,
    needsId: false,
    pathSuffix: '',
    actionLabel: 'Load users',
  },
};

const KNOWN_USE_CASES = new Set(Object.keys(USE_CASE_MAP));

export function resolveUseCase(rawName: string): UseCaseDef {
  const template = USE_CASE_MAP[rawName];
  if (!template) {
    const camelName =
      rawName.charAt(0).toLowerCase() + rawName.slice(1).replace(/[^a-zA-Z0-9]/g, '');
    return {
      name: rawName,
      methodName: camelName,
      httpMethod: 'POST',
      needsPayload: true,
      needsId: false,
      pathSuffix: '',
      actionLabel: rawName,
    };
  }
  return {
    name: rawName,
    methodName: template.methodName,
    httpMethod: template.httpMethod,
    needsPayload: template.needsPayload,
    needsId: template.needsId,
    pathSuffix: template.pathSuffix,
    actionLabel: template.actionLabel,
  };
}

export function isKnownUseCase(name: string): boolean {
  return KNOWN_USE_CASES.has(name);
}

export { KNOWN_USE_CASES };
