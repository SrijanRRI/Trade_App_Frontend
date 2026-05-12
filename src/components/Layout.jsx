import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileBarChart,
  Home,
  LogOut,
  Menu,
  ReceiptText,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/sales", label: "Sales Orders", icon: ReceiptText },
  { to: "/tally-logs", label: "Tally Logs", icon: ShieldCheck },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/admin", label: "Users & Roles", icon: Users }
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 w-72 transform bg-slate-950 text-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div>
            <p className="text-sm text-blue-200">Trade_App</p>
            <h1 className="text-lg font-bold">Trade Application</h1>
          </div>

          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X size={22} />
          </button>
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  ].join(" ")
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl border border-slate-200 p-2 lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Purchase to Sales Automation
              </h2>
              <p className="hidden text-xs text-slate-500 sm:block">
                Dummy Tally ready now, real Tally later
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role?.name}</p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}