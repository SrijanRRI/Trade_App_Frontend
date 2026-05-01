import { useEffect, useState } from "react";
import { Boxes, ClipboardList, IndianRupee, ReceiptText } from "lucide-react";
import Card from "../components/Card";
import { purchaseOrderApi, inventoryApi, saleApi, reportApi } from "../api/api";
import { currency } from "../utils/format";

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
  const [stats, setStats] = useState({
    po: 0,
    inventory: 0,
    sales: 0,
    profit: 0
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [po, inventory, sales, profit] = await Promise.all([
        purchaseOrderApi.list({ page: 1, pageSize: 1 }),
        inventoryApi.list({ page: 1, pageSize: 1 }),
        saleApi.list({ page: 1, pageSize: 1 }),
        reportApi.profitLoss()
      ]);

      setStats({
        po: po.total || 0,
        inventory: inventory.total || 0,
        sales: sales.total || 0,
        profit: profit.data?.totalProfit || 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of purchase, inventory, sales and profit tracking.
        </p>
      </div>

      {loading ? (
        <Card>Loading dashboard...</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={ClipboardList} label="Purchase Orders" value={stats.po} />
          <StatCard icon={Boxes} label="Inventory Items" value={stats.inventory} />
          <StatCard icon={ReceiptText} label="Sales Entries" value={stats.sales} />
          <StatCard icon={IndianRupee} label="Total Profit" value={currency(stats.profit)} />
        </div>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Workflow</h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-5">
          {["PO Review", "Inventory", "Dummy Tally", "Sales", "Client Acceptance"].map(
            (item, index) => (
              <div key={item} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="font-semibold text-slate-900">{item}</p>
              </div>
            )
          )}
        </div>
      </Card>
    </div>
  );
}