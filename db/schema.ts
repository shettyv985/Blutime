import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accessRoles = ["employee", "lead", "hr_ops", "boss"] as const;
export type AccessRole = (typeof accessRoles)[number];

export const taskSources = ["basecamp", "unplanned", "leave_cover"] as const;
export type TaskSource = (typeof taskSources)[number];

export const timerStatuses = ["running", "paused", "abandoned"] as const;
export type TimerStatus = (typeof timerStatuses)[number];

export const auditActions = ["create", "update", "delete"] as const;
export type AuditAction = (typeof auditActions)[number];

export const clientServiceTypes = ["unset", "social", "performance", "both", "seo", "website"] as const;
export type ClientServiceType = (typeof clientServiceTypes)[number];

export const clientTeamRoles = ["writer", "designer", "editor"] as const;
export type ClientTeamRole = (typeof clientTeamRoles)[number];

export const productionPodNames = ["ROBISH", "RELSA", "RESHMA"] as const;
export type ProductionPodName = (typeof productionPodNames)[number];

export const productionServiceLabels = ["PM", "SM", "PM+SM"] as const;
export type ProductionServiceLabel = (typeof productionServiceLabels)[number];

export const plannerServiceLines = ["social", "performance"] as const;
export type PlannerServiceLine = (typeof plannerServiceLines)[number];

export const plannerDeliverableTypes = ["static", "carousel", "reel_edit", "ai_video"] as const;
export type PlannerDeliverableType = (typeof plannerDeliverableTypes)[number];

export const plannerAssignmentStatuses = ["suggested", "assigned", "in_progress", "completed", "skipped"] as const;
export type PlannerAssignmentStatus = (typeof plannerAssignmentStatuses)[number];

function timestamps() {
  return {
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  };
}

function taskSnapshotColumns() {
  return {
    taskSource: text("task_source").notNull().$type<TaskSource>(),
    taskTitle: text("task_title").notNull(),
    basecampTaskId: text("basecamp_task_id"),
    basecampTaskType: text("basecamp_task_type"),
    basecampTaskUrl: text("basecamp_task_url"),
    basecampParentId: text("basecamp_parent_id"),
    basecampParentTitle: text("basecamp_parent_title"),
    basecampDueOn: text("basecamp_due_on"),
  };
}

export const departments = sqliteTable(
  "departments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("departments_name_unique").on(table.name),
    uniqueIndex("departments_slug_unique").on(table.slug),
    index("departments_is_active_idx").on(table.isActive),
  ]
);

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    basecampProjectId: text("basecamp_project_id"),
    basecampProjectUrl: text("basecamp_project_url"),
    serviceType: text("service_type").notNull().default("unset").$type<ClientServiceType>(),
    leadUserId: text("lead_user_id").references(() => users.id),
    accountManagerUserId: text("account_manager_user_id").references(() => users.id),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    index("clients_name_idx").on(table.name),
    uniqueIndex("clients_basecamp_project_id_unique").on(table.basecampProjectId),
    index("clients_service_type_idx").on(table.serviceType),
    index("clients_lead_user_id_idx").on(table.leadUserId),
    index("clients_account_manager_user_id_idx").on(table.accountManagerUserId),
    index("clients_is_active_idx").on(table.isActive),
  ]
);

export const clientTeamMembers = sqliteTable(
  "client_team_members",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    teamRole: text("team_role").notNull().$type<ClientTeamRole>(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("client_team_members_unique").on(table.clientId, table.userId, table.teamRole),
    index("client_team_members_client_id_idx").on(table.clientId),
    index("client_team_members_user_id_idx").on(table.userId),
    index("client_team_members_team_role_idx").on(table.teamRole),
  ]
);

export const monthlyPlans = sqliteTable(
  "monthly_plans",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    monthKey: text("month_key").notNull(),
    socialStaticCount: integer("social_static_count").notNull().default(10),
    socialCarouselCount: integer("social_carousel_count").notNull().default(0),
    socialReelEditCount: integer("social_reel_edit_count").notNull().default(5),
    socialAiVideoCount: integer("social_ai_video_count").notNull().default(0),
    performanceStaticCount: integer("performance_static_count").notNull().default(10),
    performanceCarouselCount: integer("performance_carousel_count").notNull().default(0),
    performanceReelEditCount: integer("performance_reel_edit_count").notNull().default(5),
    performanceAiVideoCount: integer("performance_ai_video_count").notNull().default(0),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("monthly_plans_client_month_unique").on(table.clientId, table.monthKey),
    index("monthly_plans_client_id_idx").on(table.clientId),
    index("monthly_plans_month_key_idx").on(table.monthKey),
  ]
);

export const productionWorkbookPlans = sqliteTable(
  "production_workbook_plans",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    monthKey: text("month_key").notNull(),
    podName: text("pod_name").notNull().$type<ProductionPodName>(),
    serviceLabel: text("service_label").notNull().$type<ProductionServiceLabel>(),
    videoCount: integer("video_count").notNull().default(0),
    staticCount: integer("static_count").notNull().default(0),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("production_workbook_plans_client_month_unique").on(table.clientId, table.monthKey),
    index("production_workbook_plans_month_idx").on(table.monthKey),
    index("production_workbook_plans_pod_idx").on(table.podName),
  ]
);

export const monthlyPlanDeliverables = sqliteTable(
  "monthly_plan_deliverables",
  {
    id: text("id").primaryKey(),
    monthlyPlanId: text("monthly_plan_id")
      .notNull()
      .references(() => monthlyPlans.id),
    serviceLine: text("service_line").notNull().$type<PlannerServiceLine>(),
    deliverableType: text("deliverable_type").notNull().$type<PlannerDeliverableType>(),
    sequence: integer("sequence").notNull(),
    title: text("title").notNull(),
    shootRequired: integer("shoot_required", { mode: "boolean" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("monthly_plan_deliverables_unique").on(
      table.monthlyPlanId,
      table.serviceLine,
      table.deliverableType,
      table.sequence
    ),
    index("monthly_plan_deliverables_plan_id_idx").on(table.monthlyPlanId),
    index("monthly_plan_deliverables_service_line_idx").on(table.serviceLine),
    index("monthly_plan_deliverables_type_idx").on(table.deliverableType),
  ]
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("categories_name_unique").on(table.name),
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_display_order_idx").on(table.displayOrder),
    index("categories_is_active_idx").on(table.isActive),
  ]
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    accessRole: text("access_role").notNull().$type<AccessRole>(),
    departmentId: text("department_id").references(() => departments.id),
    basecampPersonId: text("basecamp_person_id"),
    photoUrl: text("photo_url"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_access_role_idx").on(table.accessRole),
    index("users_department_id_idx").on(table.departmentId),
    index("users_basecamp_person_id_idx").on(table.basecampPersonId),
    index("users_is_active_idx").on(table.isActive),
  ]
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ]
);

export const leadClientAccess = sqliteTable(
  "lead_client_access",
  {
    id: text("id").primaryKey(),
    leadUserId: text("lead_user_id")
      .notNull()
      .references(() => users.id),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("lead_client_access_unique").on(table.leadUserId, table.clientId),
    index("lead_client_access_lead_user_id_idx").on(table.leadUserId),
    index("lead_client_access_client_id_idx").on(table.clientId),
  ]
);

export const basecampConnection = sqliteTable(
  "basecamp_connection",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    clientIdEncrypted: text("client_id_encrypted"),
    clientSecretEncrypted: text("client_secret_encrypted"),
    accessTokenEncrypted: text("access_token_encrypted"),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    tokenExpiresAt: text("token_expires_at"),
    connectedByUserId: text("connected_by_user_id").references(() => users.id),
    ...timestamps(),
  },
  (table) => [
    index("basecamp_connection_account_id_idx").on(table.accountId),
    index("basecamp_connection_connected_by_user_id_idx").on(table.connectedByUserId),
  ]
);

export const activeTimers = sqliteTable(
  "active_timers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    ...taskSnapshotColumns(),
    startedAt: text("started_at").notNull(),
    runningSince: text("running_since"),
    elapsedBeforePauseSeconds: integer("elapsed_before_pause_seconds").notNull().default(0),
    status: text("status").notNull().$type<TimerStatus>(),
    lastHeartbeatAt: text("last_heartbeat_at").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("active_timers_user_id_idx").on(table.userId),
    index("active_timers_status_idx").on(table.status),
    index("active_timers_client_id_idx").on(table.clientId),
    index("active_timers_category_id_idx").on(table.categoryId),
    index("active_timers_last_heartbeat_at_idx").on(table.lastHeartbeatAt),
    index("active_timers_basecamp_task_id_idx").on(table.basecampTaskId),
  ]
);

export const timeEntries = sqliteTable(
  "time_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    ...taskSnapshotColumns(),
    startedAt: text("started_at").notNull(),
    endedAt: text("ended_at").notNull(),
    totalSeconds: integer("total_seconds").notNull(),
    workSlotsJson: text("work_slots_json"),
    outputSummary: text("output_summary").notNull(),
    nokkScore: integer("nokk_score"),
    simultaneousNote: text("simultaneous_note"),
    deletedAt: text("deleted_at"),
    deletedByUserId: text("deleted_by_user_id").references(() => users.id),
    ...timestamps(),
  },
  (table) => [
    index("time_entries_user_id_idx").on(table.userId),
    index("time_entries_client_id_idx").on(table.clientId),
    index("time_entries_category_id_idx").on(table.categoryId),
    index("time_entries_started_at_idx").on(table.startedAt),
    index("time_entries_ended_at_idx").on(table.endedAt),
    index("time_entries_basecamp_task_id_idx").on(table.basecampTaskId),
    index("time_entries_basecamp_parent_id_idx").on(table.basecampParentId),
    index("time_entries_deleted_at_idx").on(table.deletedAt),
    index("time_entries_deleted_by_user_id_idx").on(table.deletedByUserId),
  ]
);

export const timeEntryAuditLogs = sqliteTable(
  "time_entry_audit_logs",
  {
    id: text("id").primaryKey(),
    timeEntryId: text("time_entry_id")
      .notNull()
      .references(() => timeEntries.id),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull().$type<AuditAction>(),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("time_entry_audit_logs_time_entry_id_idx").on(table.timeEntryId),
    index("time_entry_audit_logs_actor_user_id_idx").on(table.actorUserId),
    index("time_entry_audit_logs_created_at_idx").on(table.createdAt),
  ]
);

export const plannerAssignments = sqliteTable(
  "planner_assignments",
  {
    id: text("id").primaryKey(),
    deliverableId: text("deliverable_id")
      .notNull()
      .references(() => monthlyPlanDeliverables.id),
    status: text("status").notNull().default("suggested").$type<PlannerAssignmentStatus>(),
    plannedWeek: integer("planned_week").notNull(),
    writerUserId: text("writer_user_id").references(() => users.id),
    writerDate: text("writer_date"),
    writerCompletedAt: text("writer_completed_at"),
    designerUserId: text("designer_user_id").references(() => users.id),
    designerDate: text("designer_date"),
    designerCompletedAt: text("designer_completed_at"),
    productionUserId: text("production_user_id").references(() => users.id),
    productionDate: text("production_date"),
    productionCompletedAt: text("production_completed_at"),
    editorUserId: text("editor_user_id").references(() => users.id),
    editorDate: text("editor_date"),
    editorCompletedAt: text("editor_completed_at"),
    basecampTaskId: text("basecamp_task_id"),
    basecampTaskUrl: text("basecamp_task_url"),
    basecampTaskTitle: text("basecamp_task_title"),
    completedAt: text("completed_at"),
    completedByUserId: text("completed_by_user_id").references(() => users.id),
    completedFromTimeEntryId: text("completed_from_time_entry_id").references(() => timeEntries.id),
    overrideNote: text("override_note"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("planner_assignments_deliverable_id_unique").on(table.deliverableId),
    index("planner_assignments_status_idx").on(table.status),
    index("planner_assignments_planned_week_idx").on(table.plannedWeek),
    index("planner_assignments_writer_user_id_idx").on(table.writerUserId),
    index("planner_assignments_designer_user_id_idx").on(table.designerUserId),
    index("planner_assignments_production_user_id_idx").on(table.productionUserId),
    index("planner_assignments_editor_user_id_idx").on(table.editorUserId),
    index("planner_assignments_completed_at_idx").on(table.completedAt),
    index("planner_assignments_basecamp_task_id_idx").on(table.basecampTaskId),
  ]
);

export const leaveRecords = sqliteTable(
  "leave_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    startsOn: text("starts_on").notNull(),
    endsOn: text("ends_on").notNull(),
    reason: text("reason"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    cancelledAt: text("cancelled_at"),
    ...timestamps(),
  },
  (table) => [
    index("leave_records_user_id_idx").on(table.userId),
    index("leave_records_starts_on_idx").on(table.startsOn),
    index("leave_records_ends_on_idx").on(table.endsOn),
    index("leave_records_cancelled_at_idx").on(table.cancelledAt),
  ]
);

export const basecampTaskCache = sqliteTable(
  "basecamp_task_cache",
  {
    id: text("id").primaryKey(),
    basecampPersonId: text("basecamp_person_id").notNull(),
    fetchedAt: text("fetched_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    payloadJson: text("payload_json").notNull(),
  },
  (table) => [
    index("basecamp_task_cache_basecamp_person_id_idx").on(table.basecampPersonId),
    index("basecamp_task_cache_expires_at_idx").on(table.expiresAt),
  ]
);

export const aiSheetSources = sqliteTable(
  "ai_sheet_sources",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    sheetUrl: text("sheet_url").notNull(),
    spreadsheetId: text("spreadsheet_id").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("ai_sheet_sources_spreadsheet_id_unique").on(table.spreadsheetId),
    index("ai_sheet_sources_is_active_idx").on(table.isActive),
    index("ai_sheet_sources_created_by_user_id_idx").on(table.createdByUserId),
  ]
);

export const aiFileSources = sqliteTable(
  "ai_file_sources",
  {
    id: text("id").primaryKey(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageBase64: text("storage_base64").notNull(),
    extractedText: text("extracted_text"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    ...timestamps(),
  },
  (table) => [
    index("ai_file_sources_is_active_idx").on(table.isActive),
    index("ai_file_sources_created_by_user_id_idx").on(table.createdByUserId),
    index("ai_file_sources_filename_idx").on(table.filename),
  ]
);

export const aiChatSessions = sqliteTable(
  "ai_chat_sessions",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    provider: text("provider").notNull().default("manus"),
    activeTaskId: text("active_task_id"),
    activeTaskUrl: text("active_task_url"),
    messagesJson: text("messages_json").notNull().default("[]"),
    selectedSourceIdsJson: text("selected_source_ids_json").notNull().default("[]"),
    selectedFileIdsJson: text("selected_file_ids_json").notNull().default("[]"),
    attachedLinksJson: text("attached_links_json").notNull().default("[]"),
    includeContextOnNextMessage: integer("include_context_on_next_message", { mode: "boolean" }).notNull().default(true),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    index("ai_chat_sessions_owner_user_id_idx").on(table.ownerUserId),
    index("ai_chat_sessions_updated_at_idx").on(table.updatedAt),
    index("ai_chat_sessions_is_archived_idx").on(table.isArchived),
  ]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  sessions: many(sessions),
  activeTimers: many(activeTimers),
  timeEntries: many(timeEntries),
  writerPlannerAssignments: many(plannerAssignments, { relationName: "plannerWriter" }),
  designerPlannerAssignments: many(plannerAssignments, { relationName: "plannerDesigner" }),
  productionPlannerAssignments: many(plannerAssignments, { relationName: "plannerProduction" }),
  editorPlannerAssignments: many(plannerAssignments, { relationName: "plannerEditor" }),
  completedPlannerAssignments: many(plannerAssignments, { relationName: "plannerCompletedBy" }),
  leaveRecords: many(leaveRecords, { relationName: "leaveUser" }),
  createdLeaveRecords: many(leaveRecords, { relationName: "leaveCreator" }),
  leadClientAccess: many(leadClientAccess),
  ledClients: many(clients, { relationName: "clientLead" }),
  accountManagedClients: many(clients, { relationName: "clientAccountManager" }),
  clientTeamMemberships: many(clientTeamMembers),
  createdMonthlyPlans: many(monthlyPlans),
  createdProductionWorkbookPlans: many(productionWorkbookPlans),
  aiSheetSources: many(aiSheetSources),
  aiFileSources: many(aiFileSources),
  aiChatSessions: many(aiChatSessions),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  lead: one(users, {
    fields: [clients.leadUserId],
    references: [users.id],
    relationName: "clientLead",
  }),
  accountManager: one(users, {
    fields: [clients.accountManagerUserId],
    references: [users.id],
    relationName: "clientAccountManager",
  }),
  activeTimers: many(activeTimers),
  timeEntries: many(timeEntries),
  leadClientAccess: many(leadClientAccess),
  teamMembers: many(clientTeamMembers),
  monthlyPlans: many(monthlyPlans),
  productionWorkbookPlans: many(productionWorkbookPlans),
}));

export const clientTeamMembersRelations = relations(clientTeamMembers, ({ one }) => ({
  client: one(clients, {
    fields: [clientTeamMembers.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [clientTeamMembers.userId],
    references: [users.id],
  }),
}));

export const monthlyPlansRelations = relations(monthlyPlans, ({ one, many }) => ({
  client: one(clients, {
    fields: [monthlyPlans.clientId],
    references: [clients.id],
  }),
  createdBy: one(users, {
    fields: [monthlyPlans.createdByUserId],
    references: [users.id],
  }),
  deliverables: many(monthlyPlanDeliverables),
}));

export const productionWorkbookPlansRelations = relations(productionWorkbookPlans, ({ one }) => ({
  client: one(clients, {
    fields: [productionWorkbookPlans.clientId],
    references: [clients.id],
  }),
  createdBy: one(users, {
    fields: [productionWorkbookPlans.createdByUserId],
    references: [users.id],
  }),
}));

export const monthlyPlanDeliverablesRelations = relations(monthlyPlanDeliverables, ({ one }) => ({
  monthlyPlan: one(monthlyPlans, {
    fields: [monthlyPlanDeliverables.monthlyPlanId],
    references: [monthlyPlans.id],
  }),
  assignment: one(plannerAssignments, {
    fields: [monthlyPlanDeliverables.id],
    references: [plannerAssignments.deliverableId],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  activeTimers: many(activeTimers),
  timeEntries: many(timeEntries),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const leadClientAccessRelations = relations(leadClientAccess, ({ one }) => ({
  lead: one(users, {
    fields: [leadClientAccess.leadUserId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [leadClientAccess.clientId],
    references: [clients.id],
  }),
}));

export const activeTimersRelations = relations(activeTimers, ({ one }) => ({
  user: one(users, {
    fields: [activeTimers.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [activeTimers.clientId],
    references: [clients.id],
  }),
  category: one(categories, {
    fields: [activeTimers.categoryId],
    references: [categories.id],
  }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one, many }) => ({
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [timeEntries.clientId],
    references: [clients.id],
  }),
  category: one(categories, {
    fields: [timeEntries.categoryId],
    references: [categories.id],
  }),
  auditLogs: many(timeEntryAuditLogs),
  completedPlannerAssignments: many(plannerAssignments),
}));

export const timeEntryAuditLogsRelations = relations(timeEntryAuditLogs, ({ one }) => ({
  timeEntry: one(timeEntries, {
    fields: [timeEntryAuditLogs.timeEntryId],
    references: [timeEntries.id],
  }),
  actor: one(users, {
    fields: [timeEntryAuditLogs.actorUserId],
    references: [users.id],
  }),
}));

export const plannerAssignmentsRelations = relations(plannerAssignments, ({ one }) => ({
  deliverable: one(monthlyPlanDeliverables, {
    fields: [plannerAssignments.deliverableId],
    references: [monthlyPlanDeliverables.id],
  }),
  writer: one(users, {
    fields: [plannerAssignments.writerUserId],
    references: [users.id],
    relationName: "plannerWriter",
  }),
  designer: one(users, {
    fields: [plannerAssignments.designerUserId],
    references: [users.id],
    relationName: "plannerDesigner",
  }),
  production: one(users, {
    fields: [plannerAssignments.productionUserId],
    references: [users.id],
    relationName: "plannerProduction",
  }),
  editor: one(users, {
    fields: [plannerAssignments.editorUserId],
    references: [users.id],
    relationName: "plannerEditor",
  }),
  completedBy: one(users, {
    fields: [plannerAssignments.completedByUserId],
    references: [users.id],
    relationName: "plannerCompletedBy",
  }),
  completedFromTimeEntry: one(timeEntries, {
    fields: [plannerAssignments.completedFromTimeEntryId],
    references: [timeEntries.id],
  }),
}));

export const leaveRecordsRelations = relations(leaveRecords, ({ one }) => ({
  user: one(users, {
    fields: [leaveRecords.userId],
    references: [users.id],
    relationName: "leaveUser",
  }),
  createdBy: one(users, {
    fields: [leaveRecords.createdByUserId],
    references: [users.id],
    relationName: "leaveCreator",
  }),
}));

export const aiSheetSourcesRelations = relations(aiSheetSources, ({ one }) => ({
  createdBy: one(users, {
    fields: [aiSheetSources.createdByUserId],
    references: [users.id],
  }),
}));

export const aiFileSourcesRelations = relations(aiFileSources, ({ one }) => ({
  createdBy: one(users, {
    fields: [aiFileSources.createdByUserId],
    references: [users.id],
  }),
}));

export const aiChatSessionsRelations = relations(aiChatSessions, ({ one }) => ({
  owner: one(users, {
    fields: [aiChatSessions.ownerUserId],
    references: [users.id],
  }),
}));

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type ClientTeamMember = typeof clientTeamMembers.$inferSelect;
export type NewClientTeamMember = typeof clientTeamMembers.$inferInsert;
export type MonthlyPlan = typeof monthlyPlans.$inferSelect;
export type NewMonthlyPlan = typeof monthlyPlans.$inferInsert;
export type ProductionWorkbookPlan = typeof productionWorkbookPlans.$inferSelect;
export type NewProductionWorkbookPlan = typeof productionWorkbookPlans.$inferInsert;
export type MonthlyPlanDeliverable = typeof monthlyPlanDeliverables.$inferSelect;
export type NewMonthlyPlanDeliverable = typeof monthlyPlanDeliverables.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ActiveTimer = typeof activeTimers.$inferSelect;
export type NewActiveTimer = typeof activeTimers.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
export type PlannerAssignment = typeof plannerAssignments.$inferSelect;
export type NewPlannerAssignment = typeof plannerAssignments.$inferInsert;
export type LeaveRecord = typeof leaveRecords.$inferSelect;
export type NewLeaveRecord = typeof leaveRecords.$inferInsert;
export type AiSheetSource = typeof aiSheetSources.$inferSelect;
export type NewAiSheetSource = typeof aiSheetSources.$inferInsert;
export type AiFileSource = typeof aiFileSources.$inferSelect;
export type NewAiFileSource = typeof aiFileSources.$inferInsert;
export type AiChatSession = typeof aiChatSessions.$inferSelect;
export type NewAiChatSession = typeof aiChatSessions.$inferInsert;
