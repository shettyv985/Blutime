"use client";

import { useState } from "react";
import { formatDuration } from "../lib/time";
import { AdminPerformanceReview } from "./AdminPerformanceReview";
import { MemberManager } from "./MemberManager";
import { RoutinePlanTable } from "./RoutinePlanTable";
import { CampaignRulesManager } from "./CampaignRulesManager";
import { AssignmentManager } from "./AssignmentManager";

import type {
  AdminLog,
  AdminUser,
  CampaignRule,
  Category,
  Client,
  Holiday,
  MemberAvailability,
  MemberClientAssignment,
  RoutineItem,
  TeamMember,
} from "../types";

import { WeeklyRoutineTracker } from "./WeeklyRoutineTracker";
import { HolidayLeaveManager } from "./HolidayLeaveManager";

type AdminPanelProps = {
  clients: Client[];
  categories: Category[];
  admins: AdminUser[];
  logs: AdminLog[];
  newClient: string;
  newCategory: string;
  newAdminEmail: string;
  onNewClientChange: (value: string) => void;
  onNewCategoryChange: (value: string) => void;
  onNewAdminEmailChange: (value: string) => void;
  onAddClient: () => void;
  onDeactivateClient: (client: Client) => void;
  onAddCategory: () => void;
  onDeleteCategory: (category: Category) => void;
  onAddAdmin: () => void;
  onRemoveAdmin: (admin: AdminUser) => void;
  selectedEmployee: string;
  reviewStartDate: string;
  reviewEndDate: string;
  onSelectedEmployeeChange: (value: string) => void;
  onReviewStartDateChange: (value: string) => void;
  onReviewEndDateChange: (value: string) => void;
  onRatingChange: (logId: string, rating: "Excellent" | "Good" | "Acceptable" | "Bad" | "") => void;
  onDeleteLog: (logId: string) => void;
  members: TeamMember[];
  newMemberName: string;
  newMemberEmail: string;
  newMemberRole: TeamMember["role"];
  newMemberPod: string;
  newMemberWeekdayCapacity: number;
  newMemberSaturdayCapacity: number;
  onNewMemberNameChange: (value: string) => void;
  onNewMemberEmailChange: (value: string) => void;
  onNewMemberRoleChange: (value: TeamMember["role"]) => void;
  onNewMemberPodChange: (value: string) => void;
  onNewMemberWeekdayCapacityChange: (value: number) => void;
  onNewMemberSaturdayCapacityChange: (value: number) => void;
  onAddMember: () => void;
  onDeactivateMember: (member: TeamMember) => void;
  onUpdateMemberEmail: (member: TeamMember, email: string) => void;
  onUpdateMemberRole: (member: TeamMember, role: TeamMember["role"]) => void;
  onUpdateMemberPod: (member: TeamMember, pod: string) => void;
  onUpdateMemberWeekdayCapacity: (member: TeamMember, value: number) => void;
  onUpdateMemberSaturdayCapacity: (member: TeamMember, value: number) => void;
  routineItems: RoutineItem[];
  onGenerateRoutinePlan: () => void;
  holidays: Holiday[];
  availability: MemberAvailability[];
  newHolidayDate: string;
  newHolidayName: string;
  leaveMemberId: string;
  leaveDate: string;
  leaveCapacity: number;
  leaveReason: string;
  rebalanceFromDate: string;
  onHolidayDateChange: (value: string) => void;
  onHolidayNameChange: (value: string) => void;
  onLeaveMemberChange: (value: string) => void;
  onLeaveDateChange: (value: string) => void;
  onLeaveCapacityChange: (value: number) => void;
  onLeaveReasonChange: (value: string) => void;
  onRebalanceFromDateChange: (value: string) => void;
  onAddHoliday: () => void;
  onRemoveHoliday: (id: string) => void;
  onAddAvailability: () => void;
  onRemoveAvailability: (id: string) => void;
  onRebalanceRoutinePlan: () => void;
  campaignRules: CampaignRule[];
  newCampaignClientName: string;
  newCampaignType: CampaignRule["campaign_type"];
  newCampaignPod: string;
  newCampaignAccountManager: string;
  newCampaignStaticCount: number;
  newCampaignVideoCount: number;
  newCampaignCanvaCount: number;
  newCampaignAiVideoCount: number;
  newCampaignShootVideoCount: number;
  onNewCampaignClientNameChange: (value: string) => void;
  onNewCampaignTypeChange: (value: CampaignRule["campaign_type"]) => void;
  onNewCampaignPodChange: (value: string) => void;
  onNewCampaignAccountManagerChange: (value: string) => void;
  onNewCampaignStaticCountChange: (value: number) => void;
  onNewCampaignVideoCountChange: (value: number) => void;
  onNewCampaignCanvaCountChange: (value: number) => void;
  onNewCampaignAiVideoCountChange: (value: number) => void;
  onNewCampaignShootVideoCountChange: (value: number) => void;
  onAddCampaignRule: () => void;
  onUpdateCampaignRule: (rule: CampaignRule, patch: Partial<CampaignRule>) => void;
  onDeactivateCampaignRule: (rule: CampaignRule) => void;
    assignments: MemberClientAssignment[];
  newAssignmentClientName: string;
  newAssignmentMemberId: string;
  onNewAssignmentClientNameChange: (value: string) => void;
  onNewAssignmentMemberIdChange: (value: string) => void;
  onAddAssignment: () => void;
  onDeactivateAssignment: (assignment: MemberClientAssignment) => void;

};

type Tab = "overview" | "routine" | "members" | "campaigns" | "performance" | "settings";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",    label: "Overview",     icon: "◎" },
  { id: "routine",     label: "Routine plan", icon: "📋" },
  { id: "members",     label: "Team",         icon: "👥" },
  { id: "campaigns",   label: "Campaigns",    icon: "📣" },
  { id: "performance", label: "Performance",  icon: "📊" },
  { id: "settings",    label: "Settings",     icon: "⚙" },
];

// Small reusable list card for Settings tab
function SettingsListCard({
  title,
  count,
  desc,
  inputValue,
  inputPlaceholder,
  inputType = "text",
  items,
  onInputChange,
  onAdd,
  renderItem,
}: {
  title: string;
  count: number;
  desc: string;
  inputValue: string;
  inputPlaceholder: string;
  inputType?: string;
  items: { id: string; label: string }[];
  onInputChange: (v: string) => void;
  onAdd: () => void;
  renderItem: (item: { id: string; label: string }) => React.ReactNode;
}) {
  return (
    <div className="card" style={{ borderRadius: "var(--radius-xl)", padding: "1.25rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h3 className="section-title">{title}</h3>
        <p className="section-desc">{count} {desc}</p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          className="field"
          style={{ flex: 1, minWidth: 0 }}
          placeholder={inputPlaceholder}
          type={inputType}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
        />
        <button
          onClick={onAdd}
          style={{
            flexShrink: 0,
            padding: "0 1rem",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--primary), var(--primary-dim))",
            color: "white",
            fontWeight: 700,
            fontSize: "0.8rem",
            border: "none",
            boxShadow: "0 2px 10px var(--primary-glow-strong)",
          }}
        >
          + Add
        </button>
      </div>
      <div
        className="scroll-area"
        style={{ maxHeight: "17rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.375rem" }}
      >
        {items.length === 0 && (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.83rem", color: "var(--muted)" }}>
            No {title.toLowerCase()} yet.
          </p>
        )}
        {items.map((item) => renderItem(item))}
      </div>
    </div>
  );
}

export function AdminPanel({
  clients,
  categories,
  admins,
  logs,
  newClient,
  newCategory,
  newAdminEmail,
  onNewClientChange,
  onNewCategoryChange,
  onNewAdminEmailChange,
  onAddClient,
  onDeactivateClient,
  onAddCategory,
  onDeleteCategory,
  onAddAdmin,
  onRemoveAdmin,
  selectedEmployee,
  reviewStartDate,
  reviewEndDate,
  onSelectedEmployeeChange,
  onReviewStartDateChange,
  onReviewEndDateChange,
  onRatingChange,
  onDeleteLog,
  members,
  newMemberName,
  newMemberEmail,
  newMemberRole,
  newMemberPod,
  newMemberWeekdayCapacity,
  newMemberSaturdayCapacity,
  onNewMemberNameChange,
  onNewMemberEmailChange,
  onNewMemberRoleChange,
  onNewMemberPodChange,
  onNewMemberWeekdayCapacityChange,
  onNewMemberSaturdayCapacityChange,
  onAddMember,
  onDeactivateMember,
  onUpdateMemberEmail,
  onUpdateMemberRole,
  onUpdateMemberPod,
  onUpdateMemberWeekdayCapacity,
  onUpdateMemberSaturdayCapacity,
  routineItems,
  onGenerateRoutinePlan,
  holidays,
  availability,
  newHolidayDate,
  newHolidayName,
  leaveMemberId,
  leaveDate,
  leaveCapacity,
  leaveReason,
  rebalanceFromDate,
  onHolidayDateChange,
  onHolidayNameChange,
  onLeaveMemberChange,
  onLeaveDateChange,
  onLeaveCapacityChange,
  onLeaveReasonChange,
  onRebalanceFromDateChange,
  onAddHoliday,
  onRemoveHoliday,
  onAddAvailability,
  onRemoveAvailability,
  onRebalanceRoutinePlan,
  campaignRules,
  newCampaignClientName,
  newCampaignType,
  newCampaignPod,
  newCampaignAccountManager,
  newCampaignStaticCount,
  newCampaignVideoCount,
  newCampaignCanvaCount,
  newCampaignAiVideoCount,
  newCampaignShootVideoCount,
  onNewCampaignClientNameChange,
  onNewCampaignTypeChange,
  onNewCampaignPodChange,
  onNewCampaignAccountManagerChange,
  onNewCampaignStaticCountChange,
  onNewCampaignVideoCountChange,
  onNewCampaignCanvaCountChange,
  onNewCampaignAiVideoCountChange,
  onNewCampaignShootVideoCountChange,
  onAddCampaignRule,
  onUpdateCampaignRule,
  onDeactivateCampaignRule,
    assignments,
  newAssignmentClientName,
  newAssignmentMemberId,
  onNewAssignmentClientNameChange,
  onNewAssignmentMemberIdChange,
  onAddAssignment,
  onDeactivateAssignment,

}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const totalHours = formatDuration(logs.reduce((s, l) => s + l.total_seconds, 0));
  const overviewStats = [
    { label: "Total logs", value: logs.length, color: "var(--primary)" },
    { label: "Total hours", value: totalHours, color: "var(--primary)", mono: true },
    { label: "Team members", value: members.length, color: "var(--success)" },
    { label: "Active clients", value: clients.length, color: "var(--accent)" },
    { label: "Campaign rules", value: campaignRules.length, color: "var(--warning)" },
  ];

  const listItemRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.625rem",
    borderRadius: "var(--radius-sm)",
    padding: "0.5rem 0.75rem",
    background: "var(--surface-soft)",
    border: "1px solid var(--border-soft)",
  };

  return (
    <section>
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
          marginTop: "0.5rem",
          marginBottom: "0.5rem",
          
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--primary)",
              marginBottom: "0.2rem",
            }}
          >
            Admin workspace
          </p>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              color: "var(--foreground)",
              margin: 0,
            }}
          >
            Control panel
          </h2>
        </div>
      </div>
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "1rem 1.1rem",
          marginBottom: "1rem",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
            }}
          >
            Routine actions
          </p>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.9rem", color: "var(--foreground)" }}>
            Generate or rebalance the May 2026 operational plan.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <input
            className="field"
            type="date"
            value={rebalanceFromDate}
            onChange={(event) => onRebalanceFromDateChange(event.target.value)}
            style={{ minWidth: "170px" }}
          />

          <button
            onClick={onRebalanceRoutinePlan}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-soft)",
              background: "var(--surface-soft)",
              color: "var(--foreground)",
              fontWeight: 700,
            }}
          >
            Rebalance plan
          </button>

          <button
            onClick={onGenerateRoutinePlan}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "linear-gradient(135deg, var(--primary), var(--primary-dim))",
              color: "white",
              fontWeight: 800,
              boxShadow: "0 8px 24px var(--primary-glow-strong)",
            }}
          >
            Generate routine
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="scroll-area"
        style={{
          display: "flex",
          gap: "0.25rem",
          overflowX: "auto",
          padding: "0.25rem",
          background: "var(--surface-soft)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-soft)",
          marginBottom: "1.25rem",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span style={{ marginRight: "0.3rem" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in" key={activeTab}>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.625rem" }}
              className="overview-stats"
            >
              {overviewStats.map(({ label, value, color, mono }) => (
                <div key={label} className="stat-card">
                  <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", margin: 0 }}>
                    {label}
                  </p>
                  <p
                    style={{
                      margin: "0.35rem 0 0",
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color,
                      fontFamily: mono ? "var(--font-mono)" : "var(--font-display)",
                      letterSpacing: mono ? "-0.02em" : "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <WeeklyRoutineTracker
              items={routineItems}
              campaignRules={campaignRules}
            />
          </div>
        )}

        {/* ROUTINE */}
        {activeTab === "routine" && (
          <RoutinePlanTable items={routineItems} />
        )}

        {/* MEMBERS */}
        {activeTab === "members" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <MemberManager
              members={members}
              newMemberName={newMemberName}
              newMemberEmail={newMemberEmail}
              newMemberRole={newMemberRole}
              newMemberPod={newMemberPod}
              newMemberWeekdayCapacity={newMemberWeekdayCapacity}
              newMemberSaturdayCapacity={newMemberSaturdayCapacity}
              onNameChange={onNewMemberNameChange}
              onEmailChange={onNewMemberEmailChange}
              onRoleChange={onNewMemberRoleChange}
              onPodChange={onNewMemberPodChange}
              onWeekdayCapacityChange={onNewMemberWeekdayCapacityChange}
              onSaturdayCapacityChange={onNewMemberSaturdayCapacityChange}
              onAddMember={onAddMember}
              onDeactivateMember={onDeactivateMember}
              onUpdateMemberEmail={onUpdateMemberEmail}
              onUpdateMemberRole={onUpdateMemberRole}
              onUpdateMemberPod={onUpdateMemberPod}
              onUpdateMemberWeekdayCapacity={onUpdateMemberWeekdayCapacity}
              onUpdateMemberSaturdayCapacity={onUpdateMemberSaturdayCapacity}
            />
            <HolidayLeaveManager
              holidays={holidays}
              availability={availability}
              members={members}
              newHolidayDate={newHolidayDate}
              newHolidayName={newHolidayName}
              leaveMemberId={leaveMemberId}
              leaveDate={leaveDate}
              leaveCapacity={leaveCapacity}
              leaveReason={leaveReason}
              onHolidayDateChange={onHolidayDateChange}
              onHolidayNameChange={onHolidayNameChange}
              onLeaveMemberChange={onLeaveMemberChange}
              onLeaveDateChange={onLeaveDateChange}
              onLeaveCapacityChange={onLeaveCapacityChange}
              onLeaveReasonChange={onLeaveReasonChange}
              onAddHoliday={onAddHoliday}
              onRemoveHoliday={onRemoveHoliday}
              onAddAvailability={onAddAvailability}
              onRemoveAvailability={onRemoveAvailability}
            />
          </div>
        )}

        {/* CAMPAIGNS */}
        {activeTab === "campaigns" && (
          <CampaignRulesManager
            campaignRules={campaignRules}
            newClientName={newCampaignClientName}
            newCampaignType={newCampaignType}
            newPod={newCampaignPod}
            newAccountManager={newCampaignAccountManager}
            newStaticCount={newCampaignStaticCount}
            newVideoCount={newCampaignVideoCount}
            newCanvaCount={newCampaignCanvaCount}
            newAiVideoCount={newCampaignAiVideoCount}
            newShootVideoCount={newCampaignShootVideoCount}
            onNewClientNameChange={onNewCampaignClientNameChange}
            onNewCampaignTypeChange={onNewCampaignTypeChange}
            onNewPodChange={onNewCampaignPodChange}
            onNewAccountManagerChange={onNewCampaignAccountManagerChange}
            onNewStaticCountChange={onNewCampaignStaticCountChange}
            onNewVideoCountChange={onNewCampaignVideoCountChange}
            onNewCanvaCountChange={onNewCampaignCanvaCountChange}
            onNewAiVideoCountChange={onNewCampaignAiVideoCountChange}
            onNewShootVideoCountChange={onNewCampaignShootVideoCountChange}
            onAddRule={onAddCampaignRule}
            onUpdateRule={onUpdateCampaignRule}
            onDeactivateRule={onDeactivateCampaignRule}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "1rem" }}>
              <AssignmentManager
        assignments={assignments}
        clients={clients}
        members={members}
        newAssignmentClientName={newAssignmentClientName}
        newAssignmentMemberId={newAssignmentMemberId}
        onNewAssignmentClientNameChange={onNewAssignmentClientNameChange}
        onNewAssignmentMemberIdChange={onNewAssignmentMemberIdChange}
        onAddAssignment={onAddAssignment}
        onDeactivateAssignment={onDeactivateAssignment}
      />

</div>
        {/* PERFORMANCE */}
        {activeTab === "performance" && (
          <AdminPerformanceReview
            logs={logs}
            selectedEmployee={selectedEmployee}
            startDate={reviewStartDate}
            endDate={reviewEndDate}
            onEmployeeChange={onSelectedEmployeeChange}
            onStartDateChange={onReviewStartDateChange}
            onEndDateChange={onReviewEndDateChange}
            onRatingChange={onRatingChange}
            onDeleteLog={onDeleteLog}
          />
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}
            className="settings-grid"
          >
            <SettingsListCard
              title="Clients"
              count={clients.length}
              desc="active clients"
              inputValue={newClient}
              inputPlaceholder="New client name"
              items={clients.map((c) => ({ id: c.id, label: c.name }))}
              onInputChange={onNewClientChange}
              onAdd={onAddClient}
              renderItem={(item) => (
                <div key={item.id} style={listItemRowStyle}>
                  <span style={{ fontSize: "0.83rem", fontWeight: 500, wordBreak: "break-word" }}>{item.label}</span>
                  <button
                    className="btn-danger"
                    style={{ flexShrink: 0 }}
                    onClick={() => onDeactivateClient(clients.find((c) => c.id === item.id)!)}
                  >
                    Remove
                  </button>
                </div>
              )}
            />

            <SettingsListCard
              title="Categories"
              count={categories.length}
              desc="active categories"
              inputValue={newCategory}
              inputPlaceholder="New category name"
items={categories.map((c) => ({ id: String(c.id), label: c.name }))}

              onInputChange={onNewCategoryChange}
              onAdd={onAddCategory}
              renderItem={(item) => (
                <div key={item.id} style={listItemRowStyle}>
                  <span style={{ fontSize: "0.83rem", fontWeight: 500, wordBreak: "break-word" }}>{item.label}</span>
                  <button
                    className="btn-danger"
                    style={{ flexShrink: 0 }}
                    onClick={() => onDeleteCategory(categories.find((c) => String(c.id) === item.id)!
)}
                  >
                    Remove
                  </button>
                </div>
              )}
            />

            <SettingsListCard
  title="Categories"
  count={categories.length}
  desc="active categories"
  inputValue={newCategory}
  inputPlaceholder="New category name"
  items={categories.map((c) => ({ id: String(c.id), label: c.name }))}
  onInputChange={onNewCategoryChange}
  onAdd={onAddCategory}
  renderItem={(item) => (
    <div key={item.id} style={listItemRowStyle}>
      <span style={{ fontSize: "0.83rem", fontWeight: 500, wordBreak: "break-word" }}>
        {item.label}
      </span>
      <button
        className="btn-danger"
        style={{ flexShrink: 0 }}
        onClick={() => onDeleteCategory(categories.find((c) => String(c.id) === item.id)!)}
      >
        Remove
      </button>
    </div>
  )}
/>

          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .overview-stats { grid-template-columns: repeat(3, 1fr) !important; }
          .settings-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .overview-stats { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  );
}