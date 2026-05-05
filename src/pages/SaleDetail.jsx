import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import TableWrap from "../components/TableWrap";
import { saleApi, tallyApi } from "../api/api";
import { currency, formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { hasPermission } = useAuth();

  const canSyncSalesTally = hasPermission("tally.sales_sync");
  const canGenerateAcceptanceLink = hasPermission("sales.create");

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [acceptanceLink, setAcceptanceLink] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);

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
    if (!canSyncSalesTally) {
      setMessage("You do not have permission to push sales voucher to Tally.");
      return;
    }

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
    if (!canGenerateAcceptanceLink) {
      setMessage("You do not have permission to generate client acceptance link.");
      return;
    }

    setMessage("Generating acceptance link and sending email to customer...");
    setGeneratingLink(true);

    try {
      const res = await saleApi.generateAcceptanceLink(id);
      setAcceptanceLink(res.link);

      setMessage(
        res.emailSent
          ? res.message
          : `${res.message}${res.emailError ? ` Error: ${res.emailError}` : ""}`
      );

      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setGeneratingLink(false);
    }
  };

  if (loading) return <Card>Loading sale...</Card>;
  if (!sale) return <Card>Sale not found.</Card>;

  const clientAcceptance = sale.clientAcceptance;
  const isClientRejected = sale.clientAcceptanceStatus === "rejected";
  const isClientAccepted = sale.clientAcceptanceStatus === "accepted";

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

        <div className="flex flex-col items-start gap-2 xl:items-end">
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button
              onClick={syncTally}
              disabled={sale.tallyStatus === "dummy_synced" || !canSyncSalesTally}
              title={
                !canSyncSalesTally
                  ? "You do not have permission to push sales voucher to Tally"
                  : sale.tallyStatus === "dummy_synced"
                    ? "Sales voucher is already dummy synced"
                    : "Push sales voucher to dummy Tally"
              }
            >
              Push Sales to Tally
            </Button>

            <Button
              variant="secondary"
              onClick={generateLink}
              disabled={!canGenerateAcceptanceLink || generatingLink}
              title={
                !canGenerateAcceptanceLink
                  ? "You do not have permission to generate client acceptance link"
                  : generatingLink
                    ? "Generating link and sending email..."
                    : "Generate client acceptance link"
              }
            >
              {generatingLink ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Sending Email...
                </>
              ) : (
                "Generate Acceptance Link"
              )}
            </Button>
          </div>

          {(!canSyncSalesTally || !canGenerateAcceptanceLink) ? (
            <p className="max-w-md text-left text-xs text-slate-500 xl:text-right">
              Some actions are disabled because your role does not have permission.
            </p>
          ) : null}
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

      {isClientRejected ? (
        <Card className="border-red-200 bg-red-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-800">
                Client Rejected This Delivery
              </p>
              <p className="mt-1 text-sm text-red-700">
                The client has rejected the sale/delivery. Reason and rating are shown below.
              </p>
            </div>

            <Badge value={sale.clientAcceptanceStatus} />
          </div>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-red-200 bg-white p-3">
              <p className="text-xs font-medium uppercase text-slate-500">
                Rating
              </p>
              <p className="mt-1 text-lg font-bold text-red-700">
                {clientAcceptance?.rating ? `${clientAcceptance.rating}/5` : "-"}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-white p-3 md:col-span-2">
              <p className="text-xs font-medium uppercase text-slate-500">
                Rejection Reason / Feedback
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                {clientAcceptance?.feedback || "-"}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {isClientAccepted ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Client Accepted This Delivery
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                The client has accepted the sale/delivery.
              </p>
            </div>

            <Badge value={sale.clientAcceptanceStatus} />
          </div>

          {clientAcceptance?.feedback ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
              <p className="text-xs font-medium uppercase text-slate-500">
                Client Feedback / Note
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                {clientAcceptance.feedback}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
              <p className="text-xs font-medium uppercase text-slate-500">
                Client Feedback / Note
              </p>
              <p className="mt-1 text-sm text-slate-500">
                No feedback was provided by the client.
              </p>
            </div>
          )}
        </Card>
      ) : null}

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