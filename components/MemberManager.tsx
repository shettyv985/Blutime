import type { TeamMember } from "../types";

const roles = ["writer", "designer", "editor", "production", "account_manager"] as const;
const pods = ["Reshma", "Relsa", "Robish", "All"] as const;

type MemberManagerProps = {
  members: TeamMember[];
  newMemberName: string;
  newMemberEmail: string;
  newMemberRole: TeamMember["role"];
  newMemberPod: string;
  newMemberWeekdayCapacity: number;
  newMemberSaturdayCapacity: number;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: TeamMember["role"]) => void;
  onPodChange: (value: string) => void;
  onWeekdayCapacityChange: (value: number) => void;
  onSaturdayCapacityChange: (value: number) => void;
  onAddMember: () => void;
  onDeactivateMember: (member: TeamMember) => void;
  onUpdateMemberEmail: (member: TeamMember, email: string) => void;
  onUpdateMemberRole: (member: TeamMember, role: TeamMember["role"]) => void;
  onUpdateMemberPod: (member: TeamMember, pod: string) => void;
  onUpdateMemberWeekdayCapacity: (member: TeamMember, value: number) => void;
  onUpdateMemberSaturdayCapacity: (member: TeamMember, value: number) => void;
};

export function MemberManager({
  members,
  newMemberName,
  newMemberEmail,
  newMemberRole,
  newMemberPod,
  newMemberWeekdayCapacity,
  newMemberSaturdayCapacity,
  onNameChange,
  onEmailChange,
  onRoleChange,
  onPodChange,
  onWeekdayCapacityChange,
  onSaturdayCapacityChange,
  onAddMember,
  onDeactivateMember,
  onUpdateMemberEmail,
  onUpdateMemberRole,
  onUpdateMemberPod,
  onUpdateMemberWeekdayCapacity,
  onUpdateMemberSaturdayCapacity,
}: MemberManagerProps) {
  return (
    <div className="card" style={{ borderRadius: "var(--radius-xl)", padding: "1.375rem 1.5rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h3 className="section-title">Team members</h3>
        <p className="section-desc">Add and manage employee profiles and capacity.</p>
      </div>

      {/* Add form */}
      <div className="inset-surface" style={{ marginBottom: "1.25rem" }}>
        <p
          style={{
            marginBottom: "0.75rem",
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Add new member
        </p>
        <div className="member-add-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.5rem" }}>
          <input className="field" placeholder="Full name" value={newMemberName} onChange={(e) => onNameChange(e.target.value)} />
          <input className="field" placeholder="Email (optional)" value={newMemberEmail} onChange={(e) => onEmailChange(e.target.value)} />
          <select className="field" value={newMemberRole} onChange={(e) => onRoleChange(e.target.value as TeamMember["role"])}>
            {roles.map((role) => <option key={role}>{role}</option>)}
          </select>
          <select className="field" value={newMemberPod} onChange={(e) => onPodChange(e.target.value)}>
            {pods.map((pod) => <option key={pod}>{pod}</option>)}
          </select>
          <input
            className="field"
            type="number"
            min={0}
            value={newMemberWeekdayCapacity}
            onChange={(e) => onWeekdayCapacityChange(Number(e.target.value))}
            placeholder="Weekday cap"
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              className="field"
              type="number"
              min={0}
              value={newMemberSaturdayCapacity}
              onChange={(e) => onSaturdayCapacityChange(Number(e.target.value))}
              placeholder="Sat cap"
              style={{ minWidth: 0, flex: 1 }}
            />
            <button
              onClick={onAddMember}
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
                whiteSpace: "nowrap",
              }}
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ maxHeight: "22rem", overflowY: "auto" }} className="scroll-area">
        <table className="data-table" style={{ minWidth: "980px" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Pod</th>
              <th>Weekday cap</th>
              <th>Sat cap</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{member.name}</td>
                <td>
                  <input
                    className="field"
                    style={{ minWidth: "200px", fontSize: "0.8rem" }}
                    placeholder="email@company.com"
                    defaultValue={member.email ?? ""}
                    onBlur={(e) => onUpdateMemberEmail(member, e.target.value)}
                  />
                </td>
                <td>
                  <select
                    className="field"
                    style={{ fontSize: "0.8rem" }}
                    defaultValue={member.role}
                    onBlur={(e) => onUpdateMemberRole(member, e.target.value as TeamMember["role"])}
                  >
                    {roles.map((role) => <option key={role}>{role}</option>)}
                  </select>
                </td>
                <td>
                  <select
                    className="field"
                    style={{ fontSize: "0.8rem" }}
                    defaultValue={member.pod}
                    onBlur={(e) => onUpdateMemberPod(member, e.target.value)}
                  >
                    {pods.map((pod) => <option key={pod}>{pod}</option>)}
                  </select>
                </td>
                <td>
                  <input
                    className="field"
                    style={{ width: "5rem", fontSize: "0.8rem" }}
                    type="number"
                    min={0}
                    defaultValue={member.weekday_capacity}
                    onBlur={(e) => onUpdateMemberWeekdayCapacity(member, Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    className="field"
                    style={{ width: "5rem", fontSize: "0.8rem" }}
                    type="number"
                    min={0}
                    defaultValue={member.saturday_capacity}
                    onBlur={(e) => onUpdateMemberSaturdayCapacity(member, Number(e.target.value))}
                  />
                </td>
                <td>
                  <button className="btn-danger" onClick={() => onDeactivateMember(member)}>Remove</button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .member-add-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .member-add-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}