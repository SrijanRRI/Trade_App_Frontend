import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";
import Button from "../components/Button";
import TableWrap from "../components/TableWrap";
import { saleApi } from "../api/api";
import { currency, formatDate } from "../utils/format";

export default function Sales() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await saleApi.list({ page: 1, pageSize: 100 });
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Sales
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sales are created from inventory and profit is calculated using purchase total with GST and sale total with GST.
        </p>
      </div>

      <TableWrap>
        <table className="min-w-[1250px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Sale Number</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Purchase Total</th>
              <th className="px-4 py-3">Sale GST</th>
              <th className="px-4 py-3">Sale Total</th>
              <th className="px-4 py-3">Profit</th>
              <th className="px-4 py-3">Sale Status</th>
              <th className="px-4 py-3">Tally</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan="11">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan="11">
                  No sales found.
                </td>
              </tr>
            ) : (
              data.map((sale) => (
                <tr key={sale._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">
                    {sale.saleNumber}
                  </td>

                  <td className="px-4 py-3">
                    {formatDate(sale.saleDate)}
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {sale.customerName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {sale.customerEmail}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    {currency(sale.amount?.purchaseTotal)}
                  </td>

                  <td className="px-4 py-3">
                    {currency(sale.amount?.gst)}
                  </td>

                  <td className="px-4 py-3">
                    {currency(sale.amount?.total)}
                  </td>

                  <td className="px-4 py-3 font-semibold text-emerald-700">
                    {currency(sale.amount?.profit)}
                  </td>

                  <td className="px-4 py-3">
                    <Badge value={sale.saleStatus} />
                  </td>

                  <td className="px-4 py-3">
                    <Badge value={sale.tallyStatus} />
                  </td>

                  <td className="px-4 py-3">
                    <Badge value={sale.clientAcceptanceStatus} />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link to={`/sales/${sale._id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}