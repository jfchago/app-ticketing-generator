// fixture-ir.ts — creates minimal IR fixtures for generator snapshot tests

import type {
  IR,
  EntityDef,
  EnumDef,
  AttributeDef,
  RelationshipDef,
  UseCaseDef,
  StateMachineDef,
  StateDef,
} from "../../src/ir/types.js";

export function minimalIR(overrides?: Partial<IR>): IR {
  return {
    application: {
      name: "TestApp",
      namePascal: "TestApp",
      nameCamel: "testApp",
      basePackage: "com.testapp",
      appClassName: "TestApp",
    },
    entities: [ticketEntity()],
    enums: [ticketStatusEnum(), ticketPriorityEnum()],
    relationships: [],
    ...overrides,
  };
}

export function ticketEntity(overrides?: Partial<EntityDef>): EntityDef {
  return {
    name: "Ticket",
    namePascal: "Ticket",
    nameCamel: "ticket",
    namePlural: "tickets",
    nameKebab: "ticket",
    attributes: [
      {
        name: "id",
        type: "number",
        primary: true,
        nullable: false,
        isEnum: false,
      },
      {
        name: "title",
        type: "string",
        primary: false,
        nullable: false,
        isEnum: false,
      },
      {
        name: "description",
        type: "string",
        primary: false,
        nullable: true,
        isEnum: false,
      },
      {
        name: "status",
        type: "TicketStatus",
        primary: false,
        nullable: false,
        isEnum: true,
      },
    ],
    relationships: [
      {
        name: "assignee",
        type: "manyToOne",
        targetEntity: "User",
        targetAttribute: "id",
        required: false,
      },
    ],
    useCases: [
      {
        name: "get_all",
        method: "GET",
        path: "/api/tickets",
        description: "List all tickets",
        entityMethod: "getAll",
      },
      {
        name: "get_by_id",
        method: "GET",
        path: "/api/tickets/:id",
        description: "Get ticket by ID",
        entityMethod: "getById",
      },
      {
        name: "create",
        method: "POST",
        path: "/api/tickets",
        description: "Create ticket",
        entityMethod: "create",
      },
    ],
    hasGetAll: true,
    hasGetById: true,
    hasCreate: true,
    hasUpdate: false,
    hasDelete: false,
    displayAttribute: "title",
    ...overrides,
  };
}

export function ticketStatusEnum(): EnumDef {
  return {
    name: "TicketStatus",
    namePascal: "TicketStatus",
    nameCamel: "ticketStatus",
    values: [
      { name: "OPEN", label: "Open" },
      { name: "IN_PROGRESS", label: "In Progress" },
      { name: "CLOSED", label: "Closed" },
    ],
  };
}

export function ticketPriorityEnum(): EnumDef {
  return {
    name: "TicketPriority",
    namePascal: "TicketPriority",
    nameCamel: "ticketPriority",
    values: [
      { name: "LOW", label: "Low" },
      { name: "MEDIUM", label: "Medium" },
      { name: "HIGH", label: "High" },
    ],
  };
}
