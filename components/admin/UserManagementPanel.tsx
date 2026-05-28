"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DepartmentOption = {
  id: string;
  name: string;
  slug: string;
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  accessRole: string;
  departmentId: string | null;
  departmentName: string | null;
  basecampPersonId: string | null;
  isActive: boolean;
};

type EditDraft = {
  name: string;
  email: string;
  password: string;
  accessRole: string;
  departmentId: string;
  basecampPersonId: string;
  isActive: boolean;
};

type UserManagementPanelProps = {
  departments: DepartmentOption[];
  users: ManagedUser[];
};

const accessRoles = [
  { value: "employee", label: "Employee" },
  { value: "lead", label: "Lead" },
  { value: "hr_ops", label: "HR / Operations" },
  { value: "boss", label: "Boss" },
];

export function UserManagementPanel({ departments, users }: UserManagementPanelProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessRole, setAccessRole] = useState("employee");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [basecampPersonId, setBasecampPersonId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        accessRole,
        departmentId,
        basecampPersonId,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not create user.");
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    setBasecampPersonId("");
    setMessage("User created.");
    router.refresh();
  }

  function startEdit(user: ManagedUser) {
    setEditingId(user.id);
    setEditDraft({
      name: user.name,
      email: user.email,
      password: "",
      accessRole: user.accessRole,
      departmentId: user.departmentId ?? departments[0]?.id ?? "",
      basecampPersonId: user.basecampPersonId ?? "",
      isActive: user.isActive,
    });
    setMessage("");
  }

  function updateEditDraft(patch: Partial<EditDraft>) {
    setEditDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function saveEdit(userId: string) {
    if (!editDraft) return;
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: userId,
        ...editDraft,
        password: editDraft.password || undefined,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not update user.");
      return;
    }

    setEditingId(null);
    setEditDraft(null);
    setMessage("User updated.");
    router.refresh();
  }

  return (
    <section className="card mt-5 p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">admin</p>
        <h2 className="mt-2 text-4xl font-normal">User management</h2>
        <p className="mt-2 text-base text-muted">
          Create company logins and connect each person to their Basecamp person ID.
        </p>
      </div>

      <form onSubmit={createUser} className="mt-5 grid gap-3 lg:grid-cols-6">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name"
          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          required
        />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          type="email"
          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          required
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          required
        />
        <select
          value={accessRole}
          onChange={(event) => setAccessRole(event.target.value)}
          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        >
          {accessRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <select
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          required
        >
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <input
          value={basecampPersonId}
          onChange={(event) => setBasecampPersonId(event.target.value)}
          placeholder="Basecamp person ID"
          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        />

        <button
          type="submit"
          disabled={saving}
          className="bg-[var(--primary)] px-5 py-3 disabled:opacity-60 lg:col-span-6"
        >
          {saving ? "Creating..." : "Create user"}
        </button>
      </form>

      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}

      <div className="mt-5 overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Basecamp ID</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="align-top">
                {editingId === user.id && editDraft ? (
                  <>
                    <td className="py-3 pr-4">
                      <input
                        value={editDraft.name}
                        onChange={(event) => updateEditDraft({ name: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        value={editDraft.email}
                        onChange={(event) => updateEditDraft({ email: event.target.value })}
                        type="email"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                      />
                      <input
                        value={editDraft.password}
                        onChange={(event) => updateEditDraft({ password: event.target.value })}
                        type="password"
                        placeholder="New password optional"
                        className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={editDraft.accessRole}
                        onChange={(event) => updateEditDraft({ accessRole: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                      >
                        {accessRoles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={editDraft.departmentId}
                        onChange={(event) => updateEditDraft({ departmentId: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                      >
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        value={editDraft.basecampPersonId}
                        onChange={(event) =>
                          updateEditDraft({ basecampPersonId: event.target.value })
                        }
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                      />
                    </td>
                    <td className="py-3">
                      <select
                        value={editDraft.isActive ? "active" : "inactive"}
                        onChange={(event) =>
                          updateEditDraft({ isActive: event.target.value === "active" })
                        }
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(user.id)}
                          disabled={saving}
                          className="rounded-lg bg-[var(--primary)] px-3 py-1 font-semibold text-white disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditDraft(null);
                          }}
                          className="rounded-lg border border-[var(--border)] px-3 py-1 font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 pr-4 font-semibold">{user.name}</td>
                    <td className="py-3 pr-4">{user.email}</td>
                    <td className="py-3 pr-4">{user.accessRole}</td>
                    <td className="py-3 pr-4">{user.departmentName ?? "-"}</td>
                    <td className="py-3 pr-4">{user.basecampPersonId ?? "-"}</td>
                    <td className="py-3">
                      <div>{user.isActive ? "Active" : "Inactive"}</div>
                      <button
                        type="button"
                        onClick={() => startEdit(user)}
                        className="mt-2 rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold"
                      >
                        Edit
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
