import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
    try {
      const res = await clientAcceptanceApi.accept(token);
      setMessage(res.message);
      setAcceptance(res.acceptance);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const reject = async () => {
    setMessage("");
    try {
      const res = await clientAcceptanceApi.reject(token, {
        rating: Number(form.rating),
        feedback: form.feedback
      });
      setMessage(res.message);
      setAcceptance(res.acceptance);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const sale = acceptance?.sale;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-4xl space-y-5">
        <Card className="mt-6">
          <p className="text-sm font-medium text-blue-600">Client Acceptance</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Purchase Sales Delivery Confirmation
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
                <p><span className="text-slate-500">Items:</span> {sale.items?.length || 0}</p>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 font-semibold text-slate-900">Items</h3>
              <div className="space-y-3">
                {sale.items?.map((item, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-semibold">{item.itemName}</p>
                    <p className="text-sm text-slate-500">
                      Qty: {item.quantity} / Rate: {currency(item.saleRate)} / Total: {currency(item.totalAmount)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {["accepted", "rejected"].includes(acceptance.status) ? null : (
              <Card>
                {!rejectMode ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="success" onClick={accept}>
                      Accept Delivery
                    </Button>
                    <Button variant="danger" onClick={() => setRejectMode(true)}>
                      Reject Delivery
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input
                      label="Rating"
                      type="number"
                      min="1"
                      max="5"
                      value={form.rating}
                      onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}
                    />

                    <Input
                      label="Feedback"
                      as="textarea"
                      rows="4"
                      value={form.feedback}
                      onChange={(e) => setForm((prev) => ({ ...prev, feedback: e.target.value }))}
                    />

                    <div className="flex gap-2">
                      <Button variant="danger" onClick={reject}>
                        Submit Rejection
                      </Button>
                      <Button variant="secondary" onClick={() => setRejectMode(false)}>
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