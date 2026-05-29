"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

type ManagedCategory = {
  id: string;
  name: string;
  slug: string;
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
  const [categorySaving, setCategorySaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [categories, setCategories] = useState<ManagedCategory[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<{ name: string; isActive: boolean } | null>(null);

  async function loadCategories() {
    const response = await fetch("/api/admin/categories", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as {
      categories?: ManagedCategory[];
      error?: string;
    } | null;

    if (!response.ok || !payload) {
      setMessage(payload?.error ?? "Could not load categories.");
      return;
    }

    setCategories(payload.categories ?? []);
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setCategorySaving(true);

    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: categoryName }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    setCategorySaving(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not create category.");
      return;
    }

    setCategoryName("");
    setMessage("Category saved.");
    await loadCategories();
  }

  function startCategoryEdit(category: ManagedCategory) {
    setEditingCategoryId(category.id);
    setCategoryDraft({ name: category.name, isActive: category.isActive });
    setMessage("");
  }

  async function saveCategory(categoryId: string) {
    if (!categoryDraft) return;
    setCategorySaving(true);
    setMessage("");

    const response = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: categoryId, ...categoryDraft }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    setCategorySaving(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not update category.");
      return;
    }

    setEditingCategoryId(null);
    setCategoryDraft(null);
    setMessage("Category updated.");
    await loadCategories();
  }

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

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase text-muted">categories</p>
            <h3 className="mt-2 text-2xl font-normal">Task categories</h3>
            <p className="mt-2 text-sm text-muted">Add categories for timers. Employees can also type a new one if needed.</p>
          </div>
          <span className="rounded-full border border-[var(--border)] px-3 py-2 text-sm text-muted">
            {categories.filter((category) => category.isActive).length} active
          </span>
        </div>

        <form onSubmit={createCategory} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="New category name"
            className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            required
          />
          <button
            type="submit"
            disabled={categorySaving}
            className="border border-[var(--border-strong)] px-5 py-3 text-base disabled:opacity-60"
          >
            {categorySaving ? "Saving..." : "Add category"}
          </button>
        </form>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article key={category.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
              {editingCategoryId === category.id && categoryDraft ? (
                <div className="grid gap-3">
                  <input
                    value={categoryDraft.name}
                    onChange={(event) => setCategoryDraft((current) => current ? { ...current, name: event.target.value } : current)}
                    className="border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2"
                  />
                  <select
                    value={categoryDraft.isActive ? "active" : "inactive"}
                    onChange={(event) => setCategoryDraft((current) => current ? { ...current, isActive: event.target.value === "active" } : current)}
                    className="border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void saveCategory(category.id)}
                      disabled={categorySaving}
                      className="border border-[var(--border-strong)] px-4 py-2 text-sm disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryDraft(null);
                      }}
                      className="border border-[var(--border)] px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-lg font-normal">{category.name}</h4>
                    <p className="mt-1 truncate font-mono text-xs text-muted">{category.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs ${category.isActive ? "border-[var(--success-border)] text-[var(--success)]" : "border-[var(--danger-border)] text-[var(--danger)]"}`}>
                      {category.isActive ? "Active" : "Hidden"}
                    </span>
                    <button
                      type="button"
                      onClick={() => startCategoryEdit(category)}
                      className="border border-[var(--border)] px-3 py-1 text-xs"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

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
