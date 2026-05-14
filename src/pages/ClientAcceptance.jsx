import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Star } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Badge from "../components/Badge";
import { clientAcceptanceApi } from "../api/api";
import { currency } from "../utils/format";

export default function ClientAcceptance() {
  const { token } = useParams();

  const [acceptance, setAcceptance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectMode, setRejectMode] = useState(false);

  const [acceptMode, setAcceptMode] = useState(false);
  const [acceptFeedback, setAcceptFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    rating: 5,
    feedback: ""
  });
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await clientAcceptanceApi.get(token);
      setAcceptance(res.acceptance);
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
    setActionLoading(true);

    try {
      const res = await clientAcceptanceApi.accept(token, {
        feedback: acceptFeedback.trim()
      });

      setMessage(res.message);
      setAcceptance(res.acceptance);
      setAcceptMode(false);
      setAcceptFeedback("");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async () => {
    setMessage("");
    setActionLoading(true);

    try {
      const res = await clientAcceptanceApi.reject(token, {
        rating: Number(form.rating),
        feedback: form.feedback.trim()
      });

      setMessage(res.message);
      setAcceptance(res.acceptance);
      setRejectMode(false);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const sale = acceptance?.sale;
  const isRejected = acceptance?.status === "rejected";
  const isAccepted = acceptance?.status === "accepted";

  const ratingValue = Number(form.rating || 0);
  const feedbackMissing = !form.feedback.trim();

  const groupedItems = Object.values(
    (sale?.items || []).reduce((acc, item) => {
      const key = item.itemName?.trim().toLowerCase();

      if (!acc[key]) {
        acc[key] = {
          itemName: item.itemName,
          quantity: 0,
          totalAmount: 0,
          totalRate: 0,
          count: 0,
        };
      }

      acc[key].quantity += Number(item.quantity || 0);
      acc[key].totalAmount += Number(item.totalAmount || 0);
      acc[key].totalRate += Number(item.saleRate || 0);
      acc[key].count += 1;

      return acc;
    }, {})
  ).map((item) => ({
    ...item,
    avgRate:
      item.count > 0
        ? item.totalRate / item.count
        : 0,
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-4xl space-y-5">
        <Card className="mt-6">
          <p className="text-sm font-medium text-blue-600">Client Acceptance</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Sales Order Confirmation
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Please review the sale details and accept or reject the delivery.
          </p>
        </Card>

        {loading ? <Card>Loading...</Card> : null}

        {message ? <Card className="text-sm text-slate-700">{message}</Card> : null}

        {sale ? (
          <>
            <Card>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {sale.saleNumber}
                  </h2>
                  <p className="text-sm text-slate-500">{sale.customerName}</p>
                </div>

                <Badge value={acceptance.status} />
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <p><span className="text-slate-500">Customer Email:</span> {sale.customerEmail}</p>
                <p><span className="text-slate-500">Total:</span> {currency(sale.amount?.total)}</p>
                <p><span className="text-slate-500">Items:</span>  {groupedItems.length || 0} </p>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 font-semibold text-slate-900">Items</h3>
              <div className="space-y-3">
                {groupedItems.map((item, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-semibold">{item.itemName}</p>
                    <p className="text-sm text-slate-500">
                      Qty: {item.quantity}
                    </p>

                    <p className="text-sm text-slate-500">
                      Total: {currency(item.totalAmount)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {isRejected ? (
              <Card className="border-red-200 bg-red-50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Sales Order Rejected
                    </p>
                    <p className="mt-1 text-sm text-red-700">
                      You have rejected this sales order.
                    </p>
                  </div>

                  <Badge value={acceptance.status} />
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-xl border border-red-200 bg-white p-3">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Rating
                    </p>
                    <p className="mt-1 text-lg font-bold text-red-700">
                      {acceptance.rating ? `${acceptance.rating}/5` : "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-white p-3 md:col-span-2">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Rejection Reason / Feedback
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                      {acceptance.feedback || "-"}
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}

            {isAccepted ? (
              <Card className="border-emerald-200 bg-emerald-50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      Sales Order Accepted
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      You have accepted this sales order.
                    </p>

                    {acceptance.feedback ? (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
                        <p className="text-xs font-medium uppercase text-slate-500">
                          Client Feedback / Note
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                          {acceptance.feedback}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <Badge value={acceptance.status} />
                </div>
              </Card>
            ) : null}

            {["accepted", "rejected"].includes(acceptance.status) ? null : (
              <Card>
                {!rejectMode && !acceptMode ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="success" onClick={() => setAcceptMode(true)}>
                      Accept Sales Order
                    </Button>

                    <Button variant="danger" onClick={() => setRejectMode(true)}>
                      Reject Sales Order
                    </Button>
                  </div>
                ) : acceptMode ? (
                  <div className="space-y-4">
                    <Input
                      label="Feedback / Note Optional"
                      as="textarea"
                      rows="4"
                      value={acceptFeedback}
                      placeholder="You can add a note before accepting the delivery..."
                      onChange={(e) => setAcceptFeedback(e.target.value)}
                    />

                    <p className="text-xs text-slate-500">
                      Feedback is optional. You can accept without writing anything.
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="success"
                        onClick={accept}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Accepting..." : "Submit Acceptance"}
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => {
                          setAcceptMode(false);
                          setAcceptFeedback("");
                        }}
                        disabled={actionLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700">
                        Rating
                      </p>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => {
                            const active = rating <= ratingValue;

                            return (
                              <button
                                key={rating}
                                type="button"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    rating
                                  }))
                                }
                                className={[
                                  "rounded-xl p-2 transition",
                                  active
                                    ? "bg-amber-100 text-amber-500"
                                    : "bg-white text-slate-300 hover:bg-slate-100 hover:text-amber-400"
                                ].join(" ")}
                                aria-label={`Rate ${rating} out of 5`}
                              >
                                <Star
                                  size={24}
                                  className={active ? "fill-amber-400" : ""}
                                />
                              </button>
                            );
                          })}
                        </div>

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          Selected Rating: {ratingValue}/5
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          1 means poor, 5 means excellent.
                        </p>
                      </div>
                    </div>

                    <Input
                      label="Feedback"
                      as="textarea"
                      rows="4"
                      value={form.feedback}
                      onChange={(e) => setForm((prev) => ({ ...prev, feedback: e.target.value }))}
                    />

                    {feedbackMissing ? (
                      <p className="text-xs text-red-600">
                        Feedback is required when rejecting the delivery.
                      </p>
                    ) : null}

                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        onClick={reject}
                        disabled={feedbackMissing || actionLoading}
                        title={
                          feedbackMissing
                            ? "Please enter feedback before submitting rejection"
                            : "Submit rejection"
                        }
                      >
                        {actionLoading ? "Submitting..." : "Submit Rejection"}
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => setRejectMode(false)}
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