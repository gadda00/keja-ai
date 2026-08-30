/** Admin Users — RBAC management: roles, status, sign-in history. */
import { Download } from 'lucide-react'
import { exportCSV } from '@/lib/csv'
import { useState } from 'react'
import { Search, ShieldCheck, UserX, UserCheck, Trash2, Ban, Users, Mail } from 'lucide-react'
import { useAuth, UserAccount, Role, initials } from '@/lib/auth'
import { logAudit } from '@/lib/adminStore'
import { store } from '@/lib/store'

const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-gold-gradient text-white',
  agent: 'bg-ink text-gold-200',
  user: 'bg-gold-100 text-gold-800',
}

export default function AdminUsers() {
  const { users, user: me } = useAuth()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase()
    const matchQ =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.company ?? '').toLowerCase().includes(q)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchQ && matchRole
  })

  const patchUser = (target: UserAccount, patch: Partial<UserAccount>, detail: string) => {
    const next = store.get<UserAccount[]>('users', users).map((u) =>
      u.id === target.id ? { ...u, ...patch } : u,
    )
    store.set('users', next)
    logAudit({
      actor: me?.name ?? 'admin',
      actorEmail: me?.email ?? '',
      action: 'admin.user.update',
      target: target.email,
      detail,
      severity: patch.status === 'suspended' ? 'warning' : 'info',
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            className="input-luxe !pl-10"
            placeholder="Search name, email or company…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'admin', 'agent', 'user'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                roleFilter === r
                  ? 'bg-gold-gradient text-white shadow-gold-sm'
                  : 'bg-gold-50 text-gold-700 ring-1 ring-gold-100 hover:bg-gold-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* table */}
      <div className="card-luxe overflow-hidden">
        <div className="overflow-x-auto">
          <button
          onClick={() =>
            exportCSV(`keja-users-${new Date().toISOString().slice(0, 10)}.csv`,
              ['Name', 'Email', 'Role', 'Status', 'Sign-ins', 'Last active'],
              filtered.map((u) => [u.name, u.email, u.role, u.status, 0, u.createdAt ?? '']))
          }
          className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-gold-300 hover:bg-ink-soft"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-gold-100 bg-gold-50/60 text-[11px] uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Sign-ins</th>
                <th className="px-5 py-3 font-semibold">Last active</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {filtered.map((u) => (
                <tr key={u.id} className="transition hover:bg-gold-50/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-gold-200"
                        aria-hidden="true"
                      >
                        {initials(u.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">
                          {u.name}
                          {u.id === me?.id && (
                            <span className="ml-1.5 rounded bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold text-gold-800">
                              you
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-ink-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={u.role}
                      disabled={u.id === me?.id}
                      onChange={(e) =>
                        patchUser(u, { role: e.target.value as Role }, `Role → ${e.target.value}`)
                      }
                      className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-transparent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                        ROLE_BADGE[u.role]
                      }`}
                    >
                      <option value="user">user</option>
                      <option value="agent">agent</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        u.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {u.status === 'active' ? (
                        <UserCheck className="h-3 w-3" />
                      ) : (
                        <Ban className="h-3 w-3" />
                      )}
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-ink">{u.loginCount}</span>
                    <span className="ml-2 text-[11px] text-ink-faint">{u.provider}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-ink-muted">
                    {new Date(u.lastLoginAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() =>
                          patchUser(
                            u,
                            { status: u.status === 'active' ? 'suspended' : 'active' },
                            u.status === 'active' ? 'Account suspended' : 'Account reinstated',
                          )
                        }
                        disabled={u.id === me?.id}
                        title={u.status === 'active' ? 'Suspend' : 'Reinstate'}
                        className="rounded-lg p-2 text-ink-muted transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        {u.status === 'active' ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${u.name}? This cannot be undone.`)) {
                            patchUser(u, { status: 'suspended' }, 'User flagged for deletion (demo)')
                          }
                        }}
                        disabled={u.id === me?.id}
                        title="Delete"
                        className="rounded-lg p-2 text-ink-muted transition hover:bg-red-50 hover:text-red-700 disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Users className="h-8 w-8 text-gold-300" />
            <p className="text-sm text-ink-muted">No users match your filters.</p>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-gold-50 p-4 ring-1 ring-gold-100">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
        <p className="text-xs leading-relaxed text-ink-muted">
          <strong className="text-ink">Role-based access control (RBAC).</strong> Admins manage the
          full platform; agents access KEJA PRO listing & lead tools; users access discovery,
          investing and tokenization. Every role or status change is written to the audit trail —
          principle of least privilege applies throughout (blueprint Ch.14).
        </p>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-ink-faint">
        <Mail className="h-3.5 w-3.5" />
        {filtered.length} of {users.length} users shown · demo multiplies registered users for
        realism
      </div>
    </div>
  )
}
