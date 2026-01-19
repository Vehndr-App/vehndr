"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "../../../services/api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");

  // Edit modal
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), per_page: "20" });
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);
      if (verifiedFilter) params.append("verified", verifiedFilter);

      const res = await api(`/api/admin/users?${params.toString()}`);
      setUsers(res.users || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
      setError(null);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, verifiedFilter]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "customer",
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditForm({ name: "", email: "", role: "" });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSaving(true);
      const res = await api(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        body: { user: editForm },
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? res.user : u))
      );
      closeEditModal();
    } catch (err) {
      console.error("Failed to update user", err);
      alert(err.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (user) => {
    setDeletingUser(user);
  };

  const closeDeleteModal = () => {
    setDeletingUser(null);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      setDeleting(true);
      await api(`/api/admin/users/${deletingUser.id}`, { method: "DELETE" });

      // Remove from local state
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      closeDeleteModal();
    } catch (err) {
      console.error("Failed to delete user", err);
      alert(err.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          User Management
        </h1>
        <p className="text-[var(--gray-500)] mt-1">
          View and manage all platform users
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
            <option value="coordinator">Coordinator</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
            className="px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-[var(--violet-600)] text-white rounded-lg hover:bg-[var(--violet-700)] transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse-soft inline-block">
              <div className="w-8 h-8 rounded-full bg-[var(--violet-200)]"></div>
            </div>
            <p className="text-[var(--gray-500)] mt-2">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[var(--gray-500)]">
            No users found
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-200)]">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      User
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Orders
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Joined
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--gray-100)] hover:bg-[var(--gray-50)]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center text-[var(--violet-600)] font-semibold">
                            {(user.name || user.email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--foreground)]">
                              {user.name || "No name"}
                            </p>
                            <p className="text-sm text-[var(--gray-500)]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-red-100 text-red-700"
                              : user.role === "vendor"
                              ? "bg-purple-100 text-purple-700"
                              : user.role === "coordinator"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Verified
                          </span>
                        ) : (
                          <span className="text-[var(--gray-400)] text-sm">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">
                        {user.ordersCount || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--gray-500)]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-[var(--violet-600)] hover:text-[var(--violet-700)] text-sm font-medium mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[var(--gray-100)]">
              {users.map((user) => (
                <div key={user.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center text-[var(--violet-600)] font-semibold">
                        {(user.name || user.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {user.name || "No name"}
                        </p>
                        <p className="text-sm text-[var(--gray-500)]">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-red-100 text-red-700"
                          : user.role === "vendor"
                          ? "bg-purple-100 text-purple-700"
                          : user.role === "coordinator"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-[var(--gray-500)]">
                      <span>{user.ordersCount || 0} orders</span>
                      <span>
                        {user.emailVerified ? (
                          <span className="text-green-600">Verified</span>
                        ) : (
                          "Unverified"
                        )}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-[var(--violet-600)] font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="text-red-600 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[var(--gray-200)] flex items-center justify-between">
            <p className="text-sm text-[var(--gray-500)]">
              Showing {users.length} of {pagination.total} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 border border-[var(--gray-200)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--gray-50)]"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-[var(--gray-600)]">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border border-[var(--gray-200)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--gray-50)]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-[var(--gray-200)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Edit User
              </h2>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
                >
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 border border-[var(--gray-200)] rounded-lg text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[var(--violet-600)] text-white rounded-lg hover:bg-[var(--violet-700)] disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                Delete User
              </h2>
              <p className="text-[var(--gray-500)] mb-6">
                Are you sure you want to delete{" "}
                <strong>{deletingUser.name || deletingUser.email}</strong>? This
                action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 px-4 py-2 border border-[var(--gray-200)] rounded-lg text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
