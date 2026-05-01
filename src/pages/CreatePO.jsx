import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { purchaseOrderApi } from "../api/api";

const emptyItem = {
  itemCode: "",
  itemName: "",
  itemDescription: "",
  hsnCode: "",
  qty: 1,
  unit: "PCS",
  rate: 0,
  gstPercent: 18
};

export default function CreatePO() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    poNumber: `PO-MANUAL-${Date.now()}`,
    poDate: new Date().toISOString().slice(0, 10),
    vendorName: "",
    vendorCode: "",
    vendorLocation: "",
    company: "Demo Company",
    division: "Trading",
    purchaseType: "general",
    departmentName: "Purchase",
    items: [{ ...emptyItem }]
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateItem = (index, key, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [key]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }]
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        poDate: new Date(form.poDate),
        items: form.items.map((item) => ({
          ...item,
          qty: Number(item.qty),
          rate: Number(item.rate),
          gstPercent: Number(item.gstPercent)
        }))
      };

      const res = await purchaseOrderApi.create(payload);
      navigate(`/purchase-orders/${res.po._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Create Manual Purchase Order
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          This creates a manual PO in the new system.
        </p>
      </div>

      {error ? (
        <Card className="bg-red-50 text-sm text-red-700">{error}</Card>
      ) : null}

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="PO Number" value={form.poNumber} onChange={(e) => update("poNumber", e.target.value)} required />
          <Input label="PO Date" type="date" value={form.poDate} onChange={(e) => update("poDate", e.target.value)} required />
          <Input label="Company" value={form.company} onChange={(e) => update("company", e.target.value)} />
          <Input label="Vendor Name" value={form.vendorName} onChange={(e) => update("vendorName", e.target.value)} required />
          <Input label="Vendor Code" value={form.vendorCode} onChange={(e) => update("vendorCode", e.target.value)} />
          <Input label="Vendor Location" value={form.vendorLocation} onChange={(e) => update("vendorLocation", e.target.value)} />
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Items</h2>
          <Button type="button" variant="secondary" onClick={addItem}>
            Add Item
          </Button>
        </div>

        <div className="space-y-4">
          {form.items.map((item, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 p-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Input label="Item Code" value={item.itemCode} onChange={(e) => updateItem(index, "itemCode", e.target.value)} />
                <Input label="Item Name" value={item.itemName} onChange={(e) => updateItem(index, "itemName", e.target.value)} required />
                <Input label="HSN" value={item.hsnCode} onChange={(e) => updateItem(index, "hsnCode", e.target.value)} />
                <Input label="Unit" value={item.unit} onChange={(e) => updateItem(index, "unit", e.target.value)} />

                <Input label="Quantity" type="number" value={item.qty} onChange={(e) => updateItem(index, "qty", e.target.value)} required />
                <Input label="Rate" type="number" value={item.rate} onChange={(e) => updateItem(index, "rate", e.target.value)} required />
                <Input label="GST %" type="number" value={item.gstPercent} onChange={(e) => updateItem(index, "gstPercent", e.target.value)} />

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="danger"
                    disabled={form.items.length === 1}
                    onClick={() => removeItem(index)}
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Input
                  label="Description"
                  value={item.itemDescription}
                  onChange={(e) => updateItem(index, "itemDescription", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate("/purchase-orders")}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Purchase Order"}
        </Button>
      </div>
    </form>
  );
}