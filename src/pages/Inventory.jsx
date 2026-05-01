import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Modal from "../components/Modal";
import TableWrap from "../components/TableWrap";
import { inventoryApi, saleApi } from "../api/api";
import { currency } from "../utils/format";

export default function Inventory() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saleForm, setSaleForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    quantity: 1,
    saleRate: 0,
    gstPercent: 18,
    discountPercent: 0
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.list({ page: 1, pageSize: 100 });
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openSaleModal = (item) => {
    setSelected(item);
    setSaleForm({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      quantity: 1,
      saleRate: item.rate || 0,
      gstPercent: item.gstPercent || 18,
      discountPercent: 0
    });
    setModalOpen(true);
  };

  const updateSale = (key, value) => {
    setSaleForm((prev) => ({ ...prev, [key]: value }));
  };

  const createSale = async () => {
    setMessage("");

    try {
      const res = await saleApi.create({
        customerName: saleForm.customerName,
        customerEmail: saleForm.customerEmail,
        customerPhone: saleForm.customerPhone,
        items: [
          {
            inventoryId: selected._id,
            quantity: Number(saleForm.quantity),
            saleRate: Number(saleForm.saleRate),
            gstPercent: Number(saleForm.gstPercent),
            discountPercent: Number(saleForm.discountPercent)
          }
        ]
      });

      setModalOpen(false);
      navigate(`/sales/${res.sale._id}`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Inventory
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Accepted PO items become available inventory.
        </p>
      </div>

      {message ? <Card className="text-sm text-red-700">{message}</Card> : null}

      <TableWrap>
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Source PO</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Purchased</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Reserved</th>
              <th className="px-4 py-3">Sold</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Inventory</th>
              <th className="px-4 py-3">Tally</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan="11">Loading...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan="11">No inventory found.</td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{item.itemName}</p>
                    <p className="text-xs text-slate-500">{item.itemCode}</p>
                  </td>
                  <td className="px-4 py-3">{item.sourcePoNumber}</td>
                  <td className="px-4 py-3">{item.vendorName}</td>
                  <td className="px-4 py-3">{item.purchasedQuantity}</td>
                  <td className="px-4 py-3 font-semibold">{item.availableQuantity}</td>
                  <td className="px-4 py-3">{item.reservedQuantity}</td>
                  <td className="px-4 py-3">{item.soldQuantity}</td>
                  <td className="px-4 py-3">{currency(item.rate)}</td>
                  <td className="px-4 py-3"><Badge value={item.inventoryStatus} /></td>
                  <td className="px-4 py-3"><Badge value={item.tallyStatus} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      disabled={Number(item.availableQuantity || 0) <= 0}
                      onClick={() => openSaleModal(item)}
                    >
                      Create Sale
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>

      <Modal
        open={modalOpen}
        title="Create Sale from Inventory"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createSale}>Create Sale</Button>
          </>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <Card>
              <p className="font-semibold text-slate-900">{selected.itemName}</p>
              <p className="text-sm text-slate-500">
                Available: {selected.availableQuantity} {selected.unit}
              </p>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Customer Name" value={saleForm.customerName} onChange={(e) => updateSale("customerName", e.target.value)} required />
              <Input label="Customer Email" type="email" value={saleForm.customerEmail} onChange={(e) => updateSale("customerEmail", e.target.value)} required />
              <Input label="Customer Phone" value={saleForm.customerPhone} onChange={(e) => updateSale("customerPhone", e.target.value)} />
              <Input label="Quantity" type="number" value={saleForm.quantity} onChange={(e) => updateSale("quantity", e.target.value)} />
              <Input label="Sale Rate" type="number" value={saleForm.saleRate} onChange={(e) => updateSale("saleRate", e.target.value)} />
              <Input label="GST %" type="number" value={saleForm.gstPercent} onChange={(e) => updateSale("gstPercent", e.target.value)} />
              <Input label="Discount %" type="number" value={saleForm.discountPercent} onChange={(e) => updateSale("discountPercent", e.target.value)} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}