import type { Client, MemberClientAssignment, TeamMember } from "../types";

type AssignmentManagerProps = {
  assignments: MemberClientAssignment[];
  clients: Client[];
  members: TeamMember[];
  newAssignmentClientName: string;
  newAssignmentMemberId: string;
  onNewAssignmentClientNameChange: (value: string) => void;
  onNewAssignmentMemberIdChange: (value: string) => void;
  onAddAssignment: () => void;
  onDeactivateAssignment: (assignment: MemberClientAssignment) => void;
};

export function AssignmentManager({
  assignments,
  clients,
  members,
  newAssignmentClientName,
  newAssignmentMemberId,
  onNewAssignmentClientNameChange,
  onNewAssignmentMemberIdChange,
  onAddAssignment,
  onDeactivateAssignment,
}: AssignmentManagerProps) {
  const grouped = new Map<string, MemberClientAssignment[]>();

  for (const assignment of assignments) {
    const current = grouped.get(assignment.client_name) ?? [];
    current.push(assignment);
    grouped.set(assignment.client_name, current);
  }

  const groupedClients = Array.from(grouped.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div className="card rounded-2xl p-4">
      <div className="mb-4">
        <h3 className="font-semibold">Client assignments</h3>
        <p className="text-sm text-muted">
          Link clients to writers, designers, and editors for routine generation.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
        <select
          className="min-h-10 rounded-lg border px-3 py-2"
          value={newAssignmentClientName}
          onChange={(event) => onNewAssignmentClientNameChange(event.target.value)}
        >
          <option value="">Select client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.name}>
              {client.name}
            </option>
          ))}
        </select>

        <select
          className="min-h-10 rounded-lg border px-3 py-2"
          value={newAssignmentMemberId}
          onChange={(event) => onNewAssignmentMemberIdChange(event.target.value)}
        >
          <option value="">Select member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} ({member.role})
            </option>
          ))}
        </select>

        <button
          className="rounded-lg px-4 py-2 text-white"
          style={{ background: "var(--primary)" }}
          onClick={onAddAssignment}
        >
          Add
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {groupedClients.map(([clientName, clientAssignments]) => {
          const sortedAssignments = [...clientAssignments].sort((a, b) => {
            if (a.role !== b.role) return a.role.localeCompare(b.role);
            return a.member_name.localeCompare(b.member_name);
          });

          return (
            <div
              key={clientName}
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="mb-3">
                <h4 className="font-medium">{clientName}</h4>
              </div>

              <div className="space-y-2">
                {sortedAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                    style={{ background: "var(--surface-soft)" }}
                  >
                    <div className="text-sm">
                      <span className="font-medium">{assignment.member_name}</span>
                      <span className="text-muted"> · {assignment.role}</span>
                    </div>

                    <button
                      className="text-sm font-medium"
                      style={{ color: "var(--danger)" }}
                      onClick={() => onDeactivateAssignment(assignment)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {groupedClients.length === 0 && (
          <div className="text-sm text-muted">No assignments yet.</div>
        )}
      </div>
    </div>
  );
}
