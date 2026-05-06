import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import TableWrap from "../components/TableWrap";
import { vendorPOApprovalApi } from "../api/api";
import { currency, formatDate } from "../utils/format";

export default function VendorPOApproval() {
  const { token } = useParams();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("");
  const [decision, setDecision] = useState("");
  const [incomingDays, setIncomingDays] = useState(10);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await vendorPOApprovalApi.get(token);
      setPo(res.po);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const accept = async () => {
    setMessage("");

    if (!decision) {
      setMessage("Please select Ready Stock or Incoming.");
      return;
    }

    setActionLoading(true);

    try {
      const payload = {
        decision,
        incomingDays: decision === "incoming" ? Number(incomingDays) : undefined
      };

      const res = await vendorPOApprovalApi.accept(token, payload);
      setPo(res.po);
      setMessage(res.message);
      setMode("");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async () => {
    setMessage("");

    if (!reason.trim()) {
      setMessage("Please enter rejection reason.");
      return;
    }

    setActionLoading(true);

    try {
      const res = await vendorPOApprovalApi.reject(token, {
        reason: reason.trim()
      });

      setPo(res.po);
      setMessage(res.message);
      setMode("");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const alreadyResponded = ["accepted", "rejected"].includes(
    po?.vendorApproval?.status
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-5xl space-y-5">
        <Card className="mt-6">
          <p className="text-sm font-medium text-blue-600">
            Vendor Purchase Order Approval
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Review Purchase Order
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Please review the purchase order and accept or reject it.
          </p>
        </Card>

        {loading ? <Card>Loading...</Card> : null}

        {message ? <Card className="text-sm text-slate-700">{message}</Card> : null}

        {po ? (
          <>
            <Card>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {po.poNumber}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    PO Date: {formatDate(po.poDate)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Vendor: {po.vendorName}
                  </p>
                </div>

                <Badge value={po.vendorApproval?.status || po.status} />
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <p>
                  <span className="text-slate-500">Company:</span>{" "}
                  {po.company || "-"}
                </p>
                <p>
                  <span className="text-slate-500">Division:</span>{" "}
                  {po.division || "-"}
                </p>
                <p>
                  <span className="text-slate-500">Total:</span>{" "}
                  {currency(po.amount?.total)}
                </p>
              </div>
            </Card>

            <TableWrap>
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">HSN</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">GST</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {po.items?.map((item) => (
                    <tr key={item._id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {item.itemName || item.itemDescription}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.itemCode || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">{item.hsnCode || "-"}</td>
                      <td className="px-4 py-3">
                        {item.qty} {item.unit}
                      </td>
                      <td className="px-4 py-3">{currency(item.rate)}</td>
                      <td className="px-4 py-3">{item.gstPercent || 0}%</td>
                      <td className="px-4 py-3">
                        {currency(item.amount?.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>

            {alreadyResponded ? (
              <Card>
                <p className="font-semibold text-slate-900">
                  Response already submitted.
                </p>

                {po.vendorApproval?.status === "accepted" ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Accepted as{" "}
                    <strong>
                      {po.vendorApproval?.decision === "incoming"
                        ? `Incoming in ${po.vendorApproval?.incomingDays} days`
                        : "Ready Stock"}
                    </strong>
                    .
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    Rejection Reason:{" "}
                    <strong>{po.vendorApproval?.rejectionReason || "-"}</strong>
                  </p>
                )}
              </Card>
            ) : (
              <Card>
                {!mode ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="success" onClick={() => setMode("accept")}>
                      Accept
                    </Button>
                    <Button variant="danger" onClick={() => setMode("reject")}>
                      Reject
                    </Button>
                  </div>
                ) : mode === "accept" ? (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700">
                        Stock Availability
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setDecision("ready_stock")}
                          className={[
                            "rounded-2xl border p-4 text-left transition",
                            decision === "ready_stock"
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          ].join(" ")}
                        >
                          <p className="font-semibold text-slate-900">
                            Ready Stock
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Material is available now.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDecision("incoming")}
                          className={[
                            "rounded-2xl border p-4 text-left transition",
                            decision === "incoming"
                              ? "border-blue-300 bg-blue-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          ].join(" ")}
                        >
                          <p className="font-semibold text-slate-900">
                            Incoming Days
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Material will be available later.
                          </p>
                        </button>
                      </div>
                    </div>

                    {decision === "incoming" ? (
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">
                          Select Incoming Days
                        </span>
                        <select
                          value={incomingDays}
                          onChange={(e) => setIncomingDays(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        >
                          <option value={10}>10 Days</option>
                          <option value={20}>20 Days</option>
                          <option value={30}>30 Days</option>
                          <option value={40}>40 Days</option>
                        </select>
                      </label>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="success"
                        onClick={accept}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Submitting..." : "Submit Acceptance"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setMode("");
                          setDecision("");
                        }}
                        disabled={actionLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input
                      label="Rejection Reason"
                      as="textarea"
                      rows="4"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="danger"
                        onClick={reject}
                        disabled={actionLoading || !reason.trim()}
                      >
                        {actionLoading ? "Submitting..." : "Submit Rejection"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setMode("")}
                        disabled={actionLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}