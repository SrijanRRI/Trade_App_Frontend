import { useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import TableWrap from "../components/TableWrap";
import { roleApi, userApi } from "../api/api";
import { useAuth } from "../context/AuthContext";

const permissionGroups = [
  {
    title: "User Management",
    description: "Manage system users.",
    permissions: [
      {
        id: "user.view",
        label: "User View",
        description: "Can view all users."
      },
      {
        id: "user.create",
        label: "User Create",
        description: "Can create new users."
      },
      {
        id: "user.edit",
        label: "User Edit",
        description: "Can update existing users."
      }
    ]
  },
  {
    title: "Role Management",
    description: "Manage roles and permissions.",
    permissions: [
      {
        id: "role.view",
        label: "Role View",
        description: "Can view roles and permissions."
      },
      {
        id: "role.create",
        label: "Role Create",
        description: "Can create new roles."
      },
      {
        id: "role.edit",
        label: "Role Edit",
        description: "Can update role permissions."
      }
    ]
  },
  {
    title: "Purchase Orders",
    description: "Manage purchase order workflow.",
    permissions: [
      {
        id: "purchase.view",
        label: "Purchase View",
        description: "Can view purchase orders and PO details."
      },
      {
        id: "purchase.create",
        label: "Purchase Create",
        description: "Can create manual purchase orders and seed dummy POs."
      },
      {
        id: "purchase.edit",
        label: "Purchase Edit",
        description: "Can edit purchase orders before inventory movement."
      },
      {
        id: "purchase.accept",
        label: "Purchase Accept",
        description: "Can accept or partially accept PO items."
      },
      {
        id: "purchase.reject",
        label: "Purchase Reject",
        description: "Can reject PO items with reason."
      }
    ]
  },
  {
    title: "Inventory",
    description: "Manage accepted PO items in inventory.",
    permissions: [
      {
        id: "inventory.view",
        label: "Inventory View",
        description: "Can view inventory stock."
      },
      {
        id: "inventory.edit",
        label: "Inventory Edit",
        description: "Can edit inventory item details."
      }
    ]
  },
  {
    title: "Sales",
    description: "Create sales from available inventory.",
    permissions: [
      {
        id: "sales.view",
        label: "Sales View",
        description: "Can view sales entries."
      },
      {
        id: "sales.create",
        label: "Sales Create",
        description: "Can create sales from inventory."
      }
    ]
  },
  {
    title: "Tally",
    description: "Dummy Tally sync now, real Tally later.",
    permissions: [
      {
        id: "tally.view",
        label: "Tally Logs View",
        description: "Can view Tally sync logs."
      },
      {
        id: "tally.purchase_sync",
        label: "Purchase Tally Sync",
        description: "Can update purchase voucher in dummy Tally."
      },
      {
        id: "tally.sales_sync",
        label: "Sales Tally Sync",
        description: "Can push sales voucher to dummy Tally."
      }
    ]
  },
  {
    title: "Reports",
    description: "View purchase, inventory, sales and user activity reports.",
    permissions: [
      {
        id: "report.view",
        label: "Report View",
        description: "Can view reports and analytics."
      }
    ]
  }
];

const rolePresets = [
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Complete system owner access. Can access every module and action.",
    permissions: ["*"]
  },
  {
    key: "admin",
    name: "Admin",
    description: "Full operational access except system owner controls.",
    permissions: [
      "user.view",
      "user.create",
      "user.edit",
      "role.view",
      "role.create",
      "role.edit",
      "purchase.view",
      "purchase.create",
      "purchase.edit",
      "purchase.accept",
      "purchase.reject",
      "inventory.view",
      "inventory.edit",
      "sales.view",
      "sales.create",
      "tally.view",
      "tally.purchase_sync",
      "tally.sales_sync",
      "report.view"
    ]
  },
  {
    key: "purchase_manager",
    name: "Purchase Manager",
    description: "Can manage purchase orders and purchase Tally sync.",
    permissions: [
      "purchase.view",
      "purchase.create",
      "purchase.edit",
      "purchase.accept",
      "purchase.reject",
      "inventory.view",
      "tally.view",
      "tally.purchase_sync",
      "report.view"
    ]
  },
  {
    key: "inventory_manager",
    name: "Inventory Manager",
    description: "Can manage inventory and create sales from stock.",
    permissions: [
      "purchase.view",
      "inventory.view",
      "inventory.edit",
      "sales.view",
      "sales.create",
      "report.view"
    ]
  },
  {
    key: "sales_executive",
    name: "Sales Executive",
    description: "Can view inventory, create sales and push sales to Tally.",
    permissions: [
      "inventory.view",
      "sales.view",
      "sales.create",
      "tally.view",
      "tally.sales_sync"
    ]
  },
  {
    key: "accounts_tally_user",
    name: "Accounts / Tally User",
    description: "Can view records and sync purchase/sales vouchers to Tally.",
    permissions: [
      "purchase.view",
      "inventory.view",
      "sales.view",
      "tally.view",
      "tally.purchase_sync",
      "tally.sales_sync",
      "report.view"
    ]
  },
  {
    key: "report_viewer",
    name: "Report Viewer",
    description: "Read-only role for reports and business records.",
    permissions: [
      "purchase.view",
      "inventory.view",
      "sales.view",
      "tally.view",
      "report.view"
    ]
  }
];

const allPermissions = permissionGroups.flatMap((group) => group.permissions);

const makeRoleKey = (value) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

export default function Admin() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const { hasPermission } = useAuth();

  const canViewUsers = hasPermission("user.view");
  const canCreateUsers = hasPermission("user.create");
  const canViewRoles = hasPermission("role.view");
  const canCreateRoles = hasPermission("role.create");

  const canUseAdminPage =
    canViewUsers || canCreateUsers || canViewRoles || canCreateRoles;

  const showCreateRoleSection = canCreateRoles;
  const showCreateUserSection = canCreateUsers && canViewRoles;
  const showRolesTable = canViewRoles;
  const showUsersTable = canViewUsers;

  const hasCreateSections = showCreateRoleSection || showCreateUserSection;
  const hasTableSections = showRolesTable || showUsersTable;

  const createGridClass =
    showCreateRoleSection && showCreateUserSection
      ? "grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"
      : "grid gap-5";

  const tableGridClass =
    showRolesTable && showUsersTable
      ? "grid gap-5 xl:grid-cols-2"
      : "grid gap-5";

  const [roleForm, setRoleForm] = useState({
    name: "",
    key: "",
    description: "",
    permissions: []
  });

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "123456",
    phone: "",
    roleId: ""
  });

  const selectedPermissionSet = useMemo(() => {
    return new Set(roleForm.permissions);
  }, [roleForm.permissions]);

  const fullAccessSelected = roleForm.permissions.includes("*");

  const load = async () => {
    setLoading(true);
    setMessage("");

    try {
      const requests = [];

      if (canViewRoles) {
        requests.push(roleApi.list());
      } else {
        requests.push(Promise.resolve({ roles: [] }));
      }

      if (canViewUsers) {
        requests.push(userApi.list());
      } else {
        requests.push(Promise.resolve({ users: [] }));
      }

      const [roleRes, userRes] = await Promise.all(requests);

      setRoles(roleRes.roles || []);
      setUsers(userRes.users || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [canViewRoles, canViewUsers]);

  const updateRoleName = (value) => {
    setRoleForm((prev) => ({
      ...prev,
      name: value,
      key: prev.key ? prev.key : makeRoleKey(value)
    }));
  };

  const applyPreset = (presetKey) => {
    const preset = rolePresets.find((item) => item.key === presetKey);

    if (!preset) return;

    setRoleForm({
      name: preset.name,
      key: preset.key,
      description: preset.description,
      permissions: preset.permissions
    });
  };

  const togglePermission = (permissionId) => {
    setRoleForm((prev) => {
      const withoutFullAccess = prev.permissions.filter((item) => item !== "*");
      const exists = withoutFullAccess.includes(permissionId);

      return {
        ...prev,
        permissions: exists
          ? withoutFullAccess.filter((item) => item !== permissionId)
          : [...withoutFullAccess, permissionId]
      };
    });
  };

  const toggleGroup = (group) => {
    const groupPermissionIds = group.permissions.map((permission) => permission.id);
    const allSelected = groupPermissionIds.every((id) =>
      selectedPermissionSet.has(id)
    );

    setRoleForm((prev) => {
      const withoutFullAccess = prev.permissions.filter((permission) => permission !== "*");

      if (allSelected) {
        return {
          ...prev,
          permissions: withoutFullAccess.filter(
            (permission) => !groupPermissionIds.includes(permission)
          )
        };
      }

      return {
        ...prev,
        permissions: Array.from(
          new Set([...withoutFullAccess, ...groupPermissionIds])
        )
      };
    });
  };

  const selectAllPermissions = () => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: allPermissions.map((permission) => permission.id)
    }));
  };

  const clearPermissions = () => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: []
    }));
  };

  const createRole = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!roleForm.permissions.length) {
      setMessage("Please select at least one permission.");
      return;
    }

    try {
      await roleApi.create({
        name: roleForm.name,
        key: roleForm.key,
        description: roleForm.description,
        permissions: roleForm.permissions
      });

      setRoleForm({
        name: "",
        key: "",
        description: "",
        permissions: []
      });

      setMessage("Role created successfully.");
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await userApi.create(userForm);

      setUserForm({
        name: "",
        email: "",
        password: "123456",
        phone: "",
        roleId: ""
      });

      setMessage("User created successfully.");
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const getPermissionLabel = (permissionId) => {
    if (permissionId === "*") {
      return "Full System Access";
    }

    const permission = allPermissions.find((item) => item.id === permissionId);
    return permission?.label || permissionId;
  };

  const getPermissionDescription = (permissionId) => {
    if (permissionId === "*") {
      return "Can access all modules and perform all actions.";
    }

    const permission = allPermissions.find((item) => item.id === permissionId);
    return permission?.description || "Custom permission";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Users & Roles
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create roles with clear permissions, then assign those roles to users.
        </p>
      </div>

      {message ? (
        <Card className="text-sm text-slate-700">{message}</Card>
      ) : null}

      {!canUseAdminPage ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-800">
          <p className="font-semibold">Access Restricted</p>
          <p className="mt-1">
            You do not have permission to manage users or roles.
          </p>
        </Card>
      ) : null}

      {canUseAdminPage ? (
        <>
          {hasCreateSections ? (
            <div className={createGridClass}>
              {showCreateRoleSection ? (
                <Card>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Create Role
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Select a preset or choose permissions manually.
                    </p>
                  </div>

                  <form onSubmit={createRole} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block md:col-span-2">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">
                          Role Preset
                        </span>
                        <select
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          value=""
                          onChange={(e) => applyPreset(e.target.value)}
                        >
                          <option value="">Choose ready-made role template</option>
                          {rolePresets.map((preset) => (
                            <option key={preset.key} value={preset.key}>
                              {preset.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <Input
                        label="Role Name"
                        placeholder="Purchase Manager"
                        value={roleForm.name}
                        onChange={(e) => updateRoleName(e.target.value)}
                        required
                      />

                      <Input
                        label="Role Key"
                        placeholder="purchase_manager"
                        value={roleForm.key}
                        onChange={(e) =>
                          setRoleForm((prev) => ({
                            ...prev,
                            key: makeRoleKey(e.target.value)
                          }))
                        }
                        required
                      />

                      <div className="md:col-span-2">
                        <Input
                          label="Role Description"
                          placeholder="Can manage purchase order review and approval"
                          value={roleForm.description}
                          onChange={(e) =>
                            setRoleForm((prev) => ({
                              ...prev,
                              description: e.target.value
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Permissions
                          </h3>
                          <p className="text-sm text-slate-500">
                            {fullAccessSelected
                              ? "Full System Access selected."
                              : `Selected ${roleForm.permissions.length} of ${allPermissions.length} permissions.`}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={selectAllPermissions}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={clearPermissions}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>

                      {fullAccessSelected ? (
                        <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50 p-4">
                          <p className="text-sm font-semibold text-purple-800">
                            Full System Access
                          </p>
                          <p className="mt-1 text-sm text-purple-700">
                            Can access all modules and perform all actions.
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-4 space-y-4">
                        {permissionGroups.map((group) => {
                          const groupPermissionIds = group.permissions.map(
                            (permission) => permission.id
                          );
                          const allSelected = groupPermissionIds.every((id) =>
                            selectedPermissionSet.has(id)
                          );
                          const selectedCount = groupPermissionIds.filter((id) =>
                            selectedPermissionSet.has(id)
                          ).length;

                          return (
                            <div
                              key={group.title}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                <div>
                                  <h4 className="font-semibold text-slate-900">
                                    {group.title}
                                  </h4>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {group.description}
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-blue-600">
                                    {selectedCount}/{group.permissions.length} selected
                                  </p>
                                </div>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant={allSelected ? "secondary" : "outline"}
                                  onClick={() => toggleGroup(group)}
                                >
                                  {allSelected ? "Remove Group" : "Select Group"}
                                </Button>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {group.permissions.map((permission) => {
                                  const checked = selectedPermissionSet.has(permission.id);

                                  return (
                                    <label
                                      key={permission.id}
                                      className={[
                                        "flex cursor-pointer gap-3 rounded-xl border p-3 transition",
                                        checked
                                          ? "border-blue-300 bg-blue-50"
                                          : "border-slate-200 bg-white hover:bg-slate-50"
                                      ].join(" ")}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => togglePermission(permission.id)}
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />

                                      <span>
                                        <span className="block text-sm font-semibold text-slate-900">
                                          {permission.label}
                                        </span>
                                        <span className="mt-0.5 block text-xs font-medium text-slate-500">
                                          ID: {permission.id}
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-500">
                                          {permission.description}
                                        </span>
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Button type="submit">Create Role</Button>
                  </form>
                </Card>
              ) : null}

              {showCreateUserSection ? (
                <Card>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Create User
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Select a role for the user. Permissions come from the selected role.
                    </p>
                  </div>

                  <form onSubmit={createUser} className="space-y-4">
                    <Input
                      label="Name"
                      value={userForm.name}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />

                    <Input
                      label="Email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />

                    <Input
                      label="Password"
                      value={userForm.password}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />

                    <Input
                      label="Phone"
                      value={userForm.phone}
                      maxLength={10}
                      inputMode="numeric"
                      placeholder="10 digit phone number"
                      onChange={(e) =>
                        setUserForm((prev) => ({
                          ...prev,
                          phone: e.target.value.replace(/\D/g, "").slice(0, 10)
                        }))
                      }
                    />

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Assign Role
                      </span>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        value={userForm.roleId}
                        onChange={(e) =>
                          setUserForm((prev) => ({ ...prev, roleId: e.target.value }))
                        }
                        required
                      >
                        <option value="">Select Role</option>
                        {roles.map((role) => (
                          <option key={role._id} value={role._id}>
                            {role.name} -{" "}
                            {role.permissions?.includes("*")
                              ? "Full System Access"
                              : `${role.permissions?.length || 0} permissions`}
                          </option>
                        ))}
                      </select>
                    </label>

                    <Button type="submit">Create User</Button>
                  </form>
                </Card>
              ) : null}
            </div>
          ) : null}

          {hasTableSections ? (
            <div className={tableGridClass}>
              {showRolesTable ? (
                <Card>
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    Roles
                  </h2>

                  <TableWrap>
                    <table className="min-w-[750px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Key</th>
                          <th className="px-4 py-3">Permissions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td className="px-4 py-6" colSpan="3">
                              Loading...
                            </td>
                          </tr>
                        ) : roles.length === 0 ? (
                          <tr>
                            <td className="px-4 py-6" colSpan="3">
                              No roles found.
                            </td>
                          </tr>
                        ) : (
                          roles.map((role) => (
                            <tr key={role._id}>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-900">
                                  {role.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {role.description || "-"}
                                </p>
                              </td>
                              <td className="px-4 py-3">{role.key}</td>
                              <td className="px-4 py-3">
                                <div className="flex max-w-md flex-wrap gap-1.5">
                                  {role.permissions?.includes("*") ? (
                                    <div className="rounded-xl bg-purple-50 px-3 py-2 text-xs ring-1 ring-purple-200">
                                      <p className="font-semibold text-purple-700">
                                        Full System Access
                                      </p>
                                      <p className="mt-0.5 text-purple-600">
                                        Can access all modules and perform all actions.
                                      </p>
                                    </div>
                                  ) : (
                                    <>
                                      {(role.permissions || [])
                                        .slice(0, 5)
                                        .map((permission) => (
                                          <span
                                            key={permission}
                                            title={getPermissionDescription(permission)}
                                            className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                                          >
                                            {getPermissionLabel(permission)}
                                          </span>
                                        ))}

                                      {(role.permissions || []).length > 5 ? (
                                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                          +{role.permissions.length - 5} more
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </TableWrap>
                </Card>
              ) : null}

              {showUsersTable ? (
                <Card>
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    Users
                  </h2>

                  <TableWrap>
                    <table className="min-w-[650px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Role</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td className="px-4 py-6" colSpan="3">
                              Loading...
                            </td>
                          </tr>
                        ) : users.length === 0 ? (
                          <tr>
                            <td className="px-4 py-6" colSpan="3">
                              No users found.
                            </td>
                          </tr>
                        ) : (
                          users.map((user) => (
                            <tr key={user._id}>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {user.name}
                              </td>
                              <td className="px-4 py-3">{user.email}</td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                  {user.role?.name || "-"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </TableWrap>
                </Card>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}