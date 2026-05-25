import { useEffect, useState } from "react";
import {
  Boxes,
  ClipboardList,
  IndianRupee,
  Plus,
  ReceiptText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { purchaseOrderApi, inventoryApi, saleApi, reportApi } from "../api/api";
import { currency } from "../utils/format";
import { useAuth } from "../context/AuthContext";

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
          <Icon size={22} />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canCreatePurchase = hasPermission("purchase.create");
  const canCreateSale = hasPermission("sales.create");

  const [createOpen, setCreateOpen] = useState(false);

  const [stats, setStats] = useState({
    po: 0,
    inventory: 0,
    sales: 0,
    profit: 0,
  });

  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [po, inventory, sales, profit] = await Promise.all([
        purchaseOrderApi.list({ page: 1, pageSize: 1 }),
        inventoryApi.list({ page: 1, pageSize: 1 }),
        saleApi.list({ page: 1, pageSize: 1 }),
        reportApi.profitLoss(),
      ]);

      setStats({
        po: po.total || 0,
        inventory: inventory.total || 0,
        sales: sales.total || 0,
        profit: Number(
          profit.data?.totalRealizedProfit ??
          profit.data?.realizedProfit ??
          profit.data?.totalProfit ??
          0
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const goToCreate = (path, allowed) => {
    if (!allowed) return;

    setCreateOpen(false);
    navigate(path);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of purchase, inventory, sales and profit tracking.
          </p>
        </div>

        <div className="relative">
          <Button
            type="button"
            onClick={() => setCreateOpen((prev) => !prev)}
          >
            <Plus size={16} className="mr-2" />
            Create
          </Button>

          {createOpen ? (
            <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <button
                type="button"
                disabled={!canCreatePurchase}
                onClick={() =>
                  goToCreate("/purchase-orders/create", canCreatePurchase)
                }
                className={[
                  "block w-full px-4 py-3 text-left transition",
                  canCreatePurchase
                    ? "hover:bg-slate-50"
                    : "cursor-not-allowed bg-slate-50 opacity-60",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-slate-900">
                  Create Purchase Order
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Create PO and send it to vendor.
                </p>
              </button>

              <div className="border-t border-slate-100" />

              <button
                type="button"
                disabled={!canCreateSale}
                onClick={() => goToCreate("/sales/create", canCreateSale)}
                className={[
                  "block w-full px-4 py-3 text-left transition",
                  canCreateSale
                    ? "hover:bg-slate-50"
                    : "cursor-not-allowed bg-slate-50 opacity-60",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-slate-900">
                  Create Sales Order
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Create SO from inventory and send it to customer.
                </p>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <Card>Loading dashboard...</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            label="Purchase Orders"
            value={stats.po}
          />
          <StatCard
            icon={Boxes}
            label="Inventory Items"
            value={stats.inventory}
          />
          <StatCard
            icon={ReceiptText}
            label="Sales Entries"
            value={stats.sales}
          />
          <StatCard
            icon={IndianRupee}
            label="Total Profit"
            value={currency(stats.profit)}
          />
        </div>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Workflow</h2>

        <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-5">
          {[
            "PO Review",
            "Inventory",
            "Dummy Tally",
            "Sales",
            "Client Acceptance",
          ].map((item, index) => (
            <div
              key={item}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {index + 1}
              </div>
              <p className="font-semibold text-slate-900">{item}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}