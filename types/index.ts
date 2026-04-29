export type Client = {
  id: string;
  name: string;
};

export type ActiveTimer = {
  id: string;
  taskText: string;
  clientId: string;
  clientName: string;
  category: string;
  routineItemId?: string | null;
  routineLabel?: string | null;
  startedAt: string;
  elapsedBeforePause: number;
  runningSince: number | null;
  outputText: string;
  persisted?: boolean;
};

export type TimeLog = {
  id: string;
  user_email?: string;
  client_id?: string | null;
  routine_item_id?: string | null;
  task_text: string;
  output_text: string;
  client_name: string;
  category: string;
  started_at: string;
  ended_at: string;
  total_seconds: number;
  quality_rating?: "Excellent" | "Good" | "Acceptable" | "Bad" | null;
};

export type Category = {
  id: number;
  name: string;
};

export type AdminUser = {
  id: string;
  email: string;
};

export type AdminLog = TimeLog & {
  user_id: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email?: string | null;
  role: "writer" | "designer" | "editor" | "production" | "account_manager";
  pod: string;
  weekday_capacity: number;
  saturday_capacity: number;
  is_active: boolean;
};

export type RoutineItem = {
  id: string;
  plan_id: string;
  work_date: string;
  team_member_id: string;
  person_name: string;
  role: string;
  pod: string;
  client_name: string;
  campaign_type: string;
  output_type: string;
  planned_count: number;
  completed_count: number;
  carried_from?: string | null;
  is_unplanned: boolean;
  notes?: string | null;
};

export type CampaignRule = {
  id: string;
  pod: string;
  account_manager: string;
  client_name: string;
  campaign_type: "performance" | "social_media";
  static_count: number;
  video_count: number;
  canva_count: number;
  ai_video_count: number;
  shoot_video_count: number;
  extra_if_target_not_met: boolean;
  is_active: boolean;
};

export type MemberClientAssignment = {
  id: string;
  team_member_id: string;
  member_name: string;
  role: string;
  client_name: string;
  is_active: boolean;
};

export type Holiday = {
  id: string;
  holiday_date: string;
  name: string;
};

export type MemberAvailability = {
  id: string;
  team_member_id: string;
  member_name: string;
  unavailable_date: string;
  capacity_override: number | null;
  reason?: string | null;
};
