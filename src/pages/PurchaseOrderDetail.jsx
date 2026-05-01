import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Modal from "../components/Modal";
import TableWrap from "../components/TableWrap";
import { purchaseOrderApi, tallyApi } from "../api/api";
import { currency, formatDate } from "../utils/format";

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialItems, setPartialItems] = useState([]);

  const canTallySync = useMemo(() => {
    return po?.inventoryStatus !== "not_moved" && po?.tallyStatus !== "dummy_synced";
  }, [po]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await purchaseOrderApi.get(id);
      setPo(res.po);
      setPartialItems(
        (res.po.items || []).map((item) => ({
          itemId: item._id,
          itemCode: item.itemCode,
          itemName: item.itemName || item.itemDescription,
          qty: item.qty || 0,
          acceptedQuantity: item.acceptedQuantity || item.qty || 0,
          rejectedQuantity: item.rejectedQuantity || 0,
          rejectionReason: item.rejectionReason || ""
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const runAction = async (fn, successMessage) => {
    setActionLoading(true);
    setMessage("");

    try {
      await fn();
      setMessage(successMessage);
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const acceptAll = () => {
    runAction(() => purchaseOrderApi.accept(id), "PO accepted and inventory created.");
  };

  const rejectAll = () => {
    const reason = window.prompt("Enter rejection reason");

    if (!reason) return;

    runAction(() => purchaseOrderApi.reject(id, reason), "PO rejected.");
  };

  const syncTally = () => {
    runAction(() => tallyApi.syncPurchaseDummy(id), "Dummy purchase voucher synced.");
  };

  const submitPartial = () => {
    runAction(
      () => purchaseOrderApi.partialAccept(id, partialItems),
      "PO partially accepted and inventory created."
    );
    setPartialOpen(false);
  };

  const updatePartial = (index, key, value) => {
    setPartialItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  if (loading) return <Card>Loading purchase order...</Card>;
  if (!po) return <Card>Purchase order not found.</Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/purchase-orders")}
            className="mt-1 shrink-0"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>

          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {po.poNumber}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Vendor: {po.vendorName || "-"} / {po.vendorCode || "-"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="success" onClick={acceptAll} disabled={actionLoading}>
            Accept All
          </Button>

          <Button variant="warning" onClick={() => setPartialOpen(true)} disabled={actionLoading}>
            Partial Accept
          </Button>

          <Button variant="danger" onClick={rejectAll} disabled={actionLoading}>
            Reject
          </Button>

          <Button onClick={syncTally} disabled={!canTallySync || actionLoading}>
            Update in Tally
          </Button>
        </div>
      </div>

      {message ? <Card className="text-sm text-slate-700">{message}</Card> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">PO Date</p>
          <p className="mt-1 font-semibold">{formatDate(po.poDate)}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">PO Status</p>
          <div className="mt-2"><Badge value={po.status} /></div>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Inventory Status</p>
          <div className="mt-2"><Badge value={po.inventoryStatus} /></div>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Tally Status</p>
          <div className="mt-2"><Badge value={po.tallyStatus} /></div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">PO Summary</h2>
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <p><span className="text-slate-500">Company:</span> {po.company || "-"}</p>
          <p><span className="text-slate-500">Division:</span> {po.division || "-"}</p>
          <p><span className="text-slate-500">Total:</span> {currency(po.amount?.total)}</p>
          <p><span className="text-slate-500">Basic:</span> {currency(po.amount?.basic)}</p>
          <p><span className="text-slate-500">Tax:</span> {currency(po.amount?.totalTax)}</p>
          <p><span className="text-slate-500">Voucher:</span> {po.tallyVoucherNumber || "-"}</p>
        </div>
      </Card>

      <TableWrap>
        <table className="min-w-[1000px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">HSN</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Accepted</th>
              <th className="px-4 py-3">Rejected</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {po.items?.map((item) => (
              <tr key={item._id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">
                    {item.itemName || item.itemDescription}
                  </p>
                  <p className="text-xs text-slate-500">{item.itemCode}</p>
                </td>
                <td className="px-4 py-3">{item.hsnCode || "-"}</td>
                <td className="px-4 py-3">{item.qty} {item.unit}</td>
                <td className="px-4 py-3">{item.acceptedQuantity || 0}</td>
                <td className="px-4 py-3">{item.rejectedQuantity || 0}</td>
                <td className="px-4 py-3">{currency(item.rate)}</td>
                <td className="px-4 py-3">{currency(item.amount?.total)}</td>
                <td className="px-4 py-3"><Badge value={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      <Modal
        open={partialOpen}
        title="Partial Accept PO Items"
        onClose={() => setPartialOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPartialOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPartial} disabled={actionLoading}>
              Submit Partial Accept
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {partialItems.map((item, index) => (
            <div key={item.itemId} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3">
                <p className="font-semibold text-slate-900">{item.itemName}</p>
                <p className="text-xs text-slate-500">
                  {item.itemCode} / PO Qty: {item.qty}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  label="Accepted Qty"
                  type="number"
                  value={item.acceptedQuantity}
                  onChange={(e) => updatePartial(index, "acceptedQuantity", Number(e.target.value))}
                />

                <Input
                  label="Rejected Qty"
                  type="number"
                  value={item.rejectedQuantity}
                  onChange={(e) => updatePartial(index, "rejectedQuantity", Number(e.target.value))}
                />

                <Input
                  label="Rejection Reason"
                  value={item.rejectionReason}
                  onChange={(e) => updatePartial(index, "rejectionReason", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}