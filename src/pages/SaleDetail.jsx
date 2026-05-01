import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import TableWrap from "../components/TableWrap";
import { saleApi, tallyApi } from "../api/api";
import { currency, formatDate } from "../utils/format";

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [acceptanceLink, setAcceptanceLink] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await saleApi.get(id);
      setSale(res.sale);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const syncTally = async () => {
    setMessage("");
    try {
      const res = await tallyApi.syncSaleDummy(id);
      setMessage(res.message);
      setAcceptanceLink(res.data?.acceptanceLink || "");
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const generateLink = async () => {
    setMessage("");
    try {
      const res = await saleApi.generateAcceptanceLink(id);
      setAcceptanceLink(res.link);
      setMessage(res.message);
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (loading) return <Card>Loading sale...</Card>;
  if (!sale) return <Card>Sale not found.</Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/sales")}
            className="mt-1 shrink-0"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>

          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {sale.saleNumber}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Customer: {sale.customerName} / {sale.customerEmail}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={syncTally}
            disabled={sale.tallyStatus === "dummy_synced"}
          >
            Push Sales to Tally
          </Button>

          <Button variant="secondary" onClick={generateLink}>
            Generate Acceptance Link
          </Button>
        </div>
      </div>

      {message ? <Card className="text-sm text-slate-700">{message}</Card> : null}

      {acceptanceLink ? (
        <Card>
          <p className="text-sm font-medium text-slate-700">Client Acceptance Link</p>
          <a
            href={acceptanceLink}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block break-all text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            {acceptanceLink}
          </a>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Sale Date</p>
          <p className="mt-1 font-semibold">{formatDate(sale.saleDate)}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Total</p>
          <p className="mt-1 font-semibold">{currency(sale.amount?.total)}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Tally</p>
          <div className="mt-2"><Badge value={sale.tallyStatus} /></div>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Client</p>
          <div className="mt-2"><Badge value={sale.clientAcceptanceStatus} /></div>
        </Card>
      </div>

      <TableWrap>
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Source PO</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Purchase Rate</th>
              <th className="px-4 py-3">Sale Rate</th>
              <th className="px-4 py-3">GST</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sale.items?.map((item, index) => (
              <tr key={index}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{item.itemName}</p>
                  <p className="text-xs text-slate-500">{item.itemCode}</p>
                </td>
                <td className="px-4 py-3">{item.sourcePoNumber}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">{currency(item.purchaseRate)}</td>
                <td className="px-4 py-3">{currency(item.saleRate)}</td>
                <td className="px-4 py-3">{item.gstPercent}%</td>
                <td className="px-4 py-3">{currency(item.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}