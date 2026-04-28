import type { Holiday, MemberAvailability, TeamMember } from "../types";

type HolidayLeaveManagerProps = {
  holidays: Holiday[];
  availability: MemberAvailability[];
  members: TeamMember[];
  newHolidayDate: string;
  newHolidayName: string;
  leaveMemberId: string;
  leaveDate: string;
  leaveCapacity: number;
  leaveReason: string;
  onHolidayDateChange: (value: string) => void;
  onHolidayNameChange: (value: string) => void;
  onLeaveMemberChange: (value: string) => void;
  onLeaveDateChange: (value: string) => void;
  onLeaveCapacityChange: (value: number) => void;
  onLeaveReasonChange: (value: string) => void;
  onAddHoliday: () => void;
  onRemoveHoliday: (id: string) => void;
  onAddAvailability: () => void;
  onRemoveAvailability: (id: string) => void;
};

const addBtnStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: "var(--radius-md)",
  background: "linear-gradient(135deg, var(--primary), var(--primary-dim))",
  color: "white",
  fontWeight: 700,
  fontSize: "0.8rem",
  border: "none",
  boxShadow: "0 2px 10px var(--primary-glow-strong)",
  whiteSpace: "nowrap",
};

const listItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  borderRadius: "var(--radius-md)",
  padding: "0.625rem 0.875rem",
  background: "var(--surface-soft)",
  border: "1px solid var(--border-soft)",
};

export function HolidayLeaveManager({
  holidays,
  availability,
  members,
  newHolidayDate,
  newHolidayName,
  leaveMemberId,
  leaveDate,
  leaveCapacity,
  leaveReason,
  onHolidayDateChange,
  onHolidayNameChange,
  onLeaveMemberChange,
  onLeaveDateChange,
  onLeaveCapacityChange,
  onLeaveReasonChange,
  onAddHoliday,
  onRemoveHoliday,
  onAddAvailability,
  onRemoveAvailability,
}: HolidayLeaveManagerProps) {
  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(2, 1fr)" }} className="holiday-grid">
      {/* Holidays */}
      <div className="card" style={{ borderRadius: "var(--radius-xl)", padding: "1.25rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h3 className="section-title">Holidays</h3>
          <p className="section-desc">Set company-wide holidays.</p>
        </div>

        <div className="inset-surface" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.5rem" }} className="holiday-form">
            <input className="field" type="date" value={newHolidayDate} onChange={(e) => onHolidayDateChange(e.target.value)} />
            <input className="field" placeholder="Holiday name" value={newHolidayName} onChange={(e) => onHolidayNameChange(e.target.value)} />
            <button style={addBtnStyle} onClick={onAddHoliday}>+ Add</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {holidays.length === 0 && (
            <p style={{ padding: "1.25rem 0", textAlign: "center", fontSize: "0.83rem", color: "var(--muted)" }}>
              No holidays set.
            </p>
          )}
          {holidays.map((holiday) => (
            <div key={holiday.id} style={listItemStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <span style={{ fontSize: "1.1rem" }}>🗓</span>
                <div>
                  <p style={{ fontSize: "0.83rem", fontWeight: 600, margin: 0 }}>{holiday.name}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: 0 }}>{holiday.holiday_date}</p>
                </div>
              </div>
              <button className="btn-danger" onClick={() => onRemoveHoliday(holiday.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      {/* Leave / Availability */}
      <div className="card" style={{ borderRadius: "var(--radius-xl)", padding: "1.25rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h3 className="section-title">Leave / availability</h3>
          <p className="section-desc">Override member capacity for specific dates.</p>
        </div>

        <div className="inset-surface" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }} className="leave-form">
            <select className="field" value={leaveMemberId} onChange={(e) => onLeaveMemberChange(e.target.value)}>
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
            <input className="field" type="date" value={leaveDate} onChange={(e) => onLeaveDateChange(e.target.value)} />
            <input
              className="field"
              type="number"
              min={0}
              placeholder="Capacity override"
              value={leaveCapacity}
              onChange={(e) => onLeaveCapacityChange(Number(e.target.value))}
            />
            <input className="field" placeholder="Reason" value={leaveReason} onChange={(e) => onLeaveReasonChange(e.target.value)} />
          </div>
          <button style={{ ...addBtnStyle, marginTop: "0.625rem", width: "100%" }} onClick={onAddAvailability}>
            Save leave / capacity
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {availability.length === 0 && (
            <p style={{ padding: "1.25rem 0", textAlign: "center", fontSize: "0.83rem", color: "var(--muted)" }}>
              No leave entries.
            </p>
          )}
          {availability.map((item) => (
            <div key={item.id} style={listItemStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <span style={{ fontSize: "1.1rem" }}>👤</span>
                <div>
                  <p style={{ fontSize: "0.83rem", fontWeight: 600, margin: 0 }}>{item.member_name}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: 0 }}>
                    {item.unavailable_date} · cap {item.capacity_override ?? 0}
                    {item.reason ? ` · ${item.reason}` : ""}
                  </p>
                </div>
              </div>
              <button className="btn-danger" onClick={() => onRemoveAvailability(item.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .holiday-grid { grid-template-columns: 1fr !important; }
          .holiday-form { grid-template-columns: 1fr 1fr !important; }
          .leave-form { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .holiday-form { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}