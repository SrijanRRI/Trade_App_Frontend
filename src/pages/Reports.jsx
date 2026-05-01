import { useEffect, useState } from "react";
import Card from "../components/Card";
import TableWrap from "../components/TableWrap";
import { reportApi } from "../api/api";
import { currency, formatDateTime } from "../utils/format";

export default function Reports() {
  const [data, setData] = useState({
    purchase: null,
    inventory: null,
    sales: null,
    profit: null,
    activity: null
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [purchase, inventory, sales, profit, activity] = await Promise.all([
        reportApi.purchase(),
        reportApi.inventory(),
        reportApi.sales(),
        reportApi.profitLoss(),
        reportApi.userActivity()
      ]);

      setData({ purchase, inventory, sales, profit, activity });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Card>Loading reports...</Card>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Reports
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Purchase, inventory, sales, profit/loss and user activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Purchase Orders</p>
          <p className="mt-1 text-2xl font-bold">{data.purchase?.count || 0}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Inventory Items</p>
          <p className="mt-1 text-2xl font-bold">{data.inventory?.count || 0}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Sales</p>
          <p className="mt-1 text-2xl font-bold">{data.sales?.count || 0}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Profit</p>
          <p className="mt-1 text-2xl font-bold">
            {currency(data.profit?.data?.totalProfit)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          User Activity
        </h2>

        <TableWrap>
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {(data.activity?.data || []).map((item) => (
                <tr key={item._id}>
                  <td className="px-4 py-3">{formatDateTime(item.createdAt)}</td>
                  <td className="px-4 py-3">{item.performedByName || "-"}</td>
                  <td className="px-4 py-3">{item.module}</td>
                  <td className="px-4 py-3">{item.action}</td>
                  <td className="px-4 py-3">{item.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}