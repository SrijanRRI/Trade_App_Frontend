// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Button from "../components/Button";
// import Card from "../components/Card";
// import Input from "../components/Input";
// import { inventoryApi, saleApi } from "../api/api";
// import { currency } from "../utils/format";

// const emptyItem = {
//   inventoryId: "",
//   quantity: 1,
//   saleRate: 0,
//   gstPercent: 0,
//   discountPercent: 0,
// };

// const createEmptyItem = () => ({ ...emptyItem });

// const toNum = (value) => {
//   const num = Number(value);
//   return Number.isFinite(num) ? num : 0;
// };

// const calculateSaleItemAmount = (item, inventoryItem) => {
//   const qty = toNum(item.quantity);
//   const saleRate = toNum(item.saleRate);
//   const gstPercent = toNum(item.gstPercent);
//   const discountPercent = toNum(item.discountPercent);

//   const purchaseRate = toNum(inventoryItem?.rate);
//   const purchaseGstPercent = toNum(inventoryItem?.gstPercent);

//   const purchaseBasic = qty * purchaseRate;
//   const purchaseGst = (purchaseBasic * purchaseGstPercent) / 100;
//   const purchaseTotal = purchaseBasic + purchaseGst;

//   const saleBasic = qty * saleRate;
//   const discountAmount = (saleBasic * discountPercent) / 100;
//   const taxable = saleBasic - discountAmount;
//   const saleGst = (taxable * gstPercent) / 100;
//   const saleTotal = taxable + saleGst;

//   return {
//     purchaseBasic,
//     purchaseGst,
//     purchaseTotal,
//     saleBasic,
//     discountAmount,
//     taxable,
//     saleGst,
//     saleTotal,
//     profit: saleTotal - purchaseTotal,
//   };
// };

// export default function CreateSalesOrder() {
//   const navigate = useNavigate();

//   const [inventory, setInventory] = useState([]);
//   const [inventoryLoading, setInventoryLoading] = useState(false);

//   const [form, setForm] = useState({
//     saleDate: new Date().toISOString().slice(0, 10),
//     customerName: "",
//     customerEmail: "",
//     customerPhone: "",
//     customerGstin: "",
//     billingAddress: "",
//     shippingAddress: "",
//     remarks: "",
//     items: [createEmptyItem()],
//   });

//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const inventoryMap = useMemo(() => {
//     return new Map(inventory.map((item) => [item._id, item]));
//   }, [inventory]);

//   const totals = useMemo(() => {
//     return form.items.reduce(
//       (acc, item) => {
//         const inventoryItem = inventoryMap.get(item.inventoryId);
//         const amount = calculateSaleItemAmount(item, inventoryItem);

//         acc.purchaseTotal += amount.purchaseTotal;
//         acc.saleGst += amount.saleGst;
//         acc.saleTotal += amount.saleTotal;
//         acc.profit += amount.profit;

//         return acc;
//       },
//       {
//         purchaseTotal: 0,
//         saleGst: 0,
//         saleTotal: 0,
//         profit: 0,
//       },
//     );
//   }, [form.items, inventoryMap]);

//   useEffect(() => {
//     const fetchInventory = async () => {
//       setInventoryLoading(true);

//       try {
//         const res = await inventoryApi.list({ page: 1, pageSize: 500 });
//         setInventory(Array.isArray(res?.data) ? res.data : []);
//       } catch (err) {
//         setError(err.message);
//         setInventory([]);
//       } finally {
//         setInventoryLoading(false);
//       }
//     };

//     fetchInventory();
//   }, []);

//   const update = (key, value) => {
//     setForm((prev) => ({ ...prev, [key]: value }));
//   };

//   const updateItem = (index, key, value) => {
//     setForm((prev) => {
//       const items = [...prev.items];
//       items[index] = { ...items[index], [key]: value };
//       return { ...prev, items };
//     });
//   };

//   const handleInventoryChange = (index, inventoryId) => {
//     const selectedInventory = inventory.find((item) => item._id === inventoryId);

//     setForm((prev) => {
//       const items = [...prev.items];

//       if (!selectedInventory) {
//         items[index] = createEmptyItem();
//         return { ...prev, items };
//       }

//       items[index] = {
//         ...items[index],
//         inventoryId: selectedInventory._id,
//         quantity: 1,
//         saleRate: selectedInventory.rate || 0,
//         gstPercent: selectedInventory.gstPercent || 0,
//         discountPercent: 0,
//       };

//       return { ...prev, items };
//     });
//   };

//   const addItem = () => {
//     setForm((prev) => ({
//       ...prev,
//       items: [...prev.items, createEmptyItem()],
//     }));
//   };

//   const removeItem = (index) => {
//     setForm((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   };

//   const validate = () => {
//     if (!form.customerName.trim()) return "Customer name is required.";
//     if (!form.customerEmail.trim()) return "Customer email is required.";

//     if (!form.items.length) return "At least one item is required.";

//     for (const [index, item] of form.items.entries()) {
//       const inventoryItem = inventoryMap.get(item.inventoryId);

//       if (!inventoryItem) {
//         return `Please select inventory item for row ${index + 1}.`;
//       }

//       const qty = toNum(item.quantity);
//       const availableQty = toNum(inventoryItem.availableQuantity);

//       if (qty <= 0) {
//         return `Quantity must be greater than 0 for ${inventoryItem.itemName}.`;
//       }

//       if (qty > availableQty) {
//         return `Quantity for ${inventoryItem.itemName} cannot be greater than available quantity ${availableQty}.`;
//       }

//       if (toNum(item.saleRate) <= 0) {
//         return `Sale rate must be greater than 0 for ${inventoryItem.itemName}.`;
//       }
//     }

//     return "";
//   };

//   const submit = async (e) => {
//     e.preventDefault();
//     setError("");

//     const validationError = validate();

//     if (validationError) {
//       setError(validationError);
//       return;
//     }

//     setLoading(true);

//     try {
//       const payload = {
//         saleDate: new Date(form.saleDate),
//         customerName: form.customerName.trim(),
//         customerEmail: form.customerEmail.trim().toLowerCase(),
//         customerPhone: form.customerPhone.trim(),
//         customerGstin: form.customerGstin.trim(),
//         billingAddress: form.billingAddress.trim(),
//         shippingAddress: form.shippingAddress.trim(),
//         remarks: form.remarks.trim(),
//         items: form.items.map((item) => ({
//           inventoryId: item.inventoryId,
//           quantity: toNum(item.quantity),
//           saleRate: toNum(item.saleRate),
//           gstPercent: toNum(item.gstPercent),
//           discountPercent: toNum(item.discountPercent),
//         })),
//       };

//       const res = await saleApi.create(payload);
//       navigate(`/sales/${res.sale._id}`);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <form onSubmit={submit} className="space-y-5">
//       <div>
//         <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
//           Create Manual Sales Order
//         </h1>
//         <p className="mt-1 text-sm text-slate-500">
//           Create a sales order from available inventory.
//         </p>
//       </div>

//       {error ? (
//         <Card className="bg-red-50 text-sm text-red-700">{error}</Card>
//       ) : null}

//       <Card>
//         <div className="grid gap-4 md:grid-cols-3">
//           <Input
//             label="Sale Date"
//             type="date"
//             value={form.saleDate}
//             onChange={(e) => update("saleDate", e.target.value)}
//             required
//           />

//           <Input
//             label="Customer Name"
//             value={form.customerName}
//             onChange={(e) => update("customerName", e.target.value)}
//             required
//           />

//           <Input
//             label="Customer Email"
//             type="email"
//             value={form.customerEmail}
//             onChange={(e) => update("customerEmail", e.target.value)}
//             required
//           />

//           <Input
//             label="Customer Phone"
//             type="tel"
//             maxLength={10}
//             value={form.customerPhone}
//             onChange={(e) =>
//               update(
//                 "customerPhone",
//                 e.target.value.replace(/\D/g, "").slice(0, 10),
//               )
//             }
//           />

//           <Input
//             label="Customer GSTIN"
//             value={form.customerGstin}
//             onChange={(e) => update("customerGstin", e.target.value)}
//           />

//           <Input
//             label="Remarks"
//             value={form.remarks}
//             onChange={(e) => update("remarks", e.target.value)}
//           />

//           <div className="md:col-span-3">
//             <Input
//               label="Billing Address"
//               value={form.billingAddress}
//               onChange={(e) => update("billingAddress", e.target.value)}
//             />
//           </div>

//           <div className="md:col-span-3">
//             <Input
//               label="Shipping Address"
//               value={form.shippingAddress}
//               onChange={(e) => update("shippingAddress", e.target.value)}
//             />
//           </div>
//         </div>
//       </Card>

//       <Card>
//         <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
//           <div>
//             <h2 className="text-lg font-semibold text-slate-900">Items</h2>
//             <p className="mt-1 text-sm text-slate-500">
//               Select inventory items and enter sale quantity/rate.
//             </p>

//             {inventoryLoading ? (
//               <p className="mt-1 text-xs text-slate-500">
//                 Fetching inventory...
//               </p>
//             ) : null}
//           </div>

//           <Button type="button" variant="secondary" onClick={addItem}>
//             Add Item
//           </Button>
//         </div>

//         <div className="space-y-4">
//           {form.items.map((item, index) => {
//             const inventoryItem = inventoryMap.get(item.inventoryId);
//             const amount = calculateSaleItemAmount(item, inventoryItem);

//             return (
//               <div
//                 key={index}
//                 className="rounded-2xl border border-slate-200 p-4"
//               >
//                 <div className="grid gap-4 md:grid-cols-4">
//                   <div>
//                     <label className="mb-1 block text-sm font-medium text-slate-700">
//                       Inventory Item
//                     </label>

//                     <select
//                       value={item.inventoryId}
//                       onChange={(e) => handleInventoryChange(index, e.target.value)}
//                       disabled={inventoryLoading}
//                       required
//                       className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
//                     >
//                       <option value="">
//                         {inventoryLoading ? "Loading inventory..." : "Select inventory"}
//                       </option>

//                       {!inventoryLoading &&
//                         inventory.map((stock) => (
//                           <option key={stock._id} value={stock._id}>
//                             {stock.itemName || stock.itemDescription || "Unnamed Item"} - Available {stock.availableQuantity} {stock.unit || ""}
//                           </option>
//                         ))}
//                     </select>
//                   </div>

//                   <Input
//                     label="Available Qty"
//                     value={
//                       inventoryItem
//                         ? `${inventoryItem.availableQuantity} ${inventoryItem.unit || ""}`
//                         : ""
//                     }
//                     disabled
//                   />

//                   <Input
//                     label="Quantity"
//                     type="number"
//                     value={item.quantity}
//                     onChange={(e) => updateItem(index, "quantity", e.target.value)}
//                     required
//                   />

//                   <Input
//                     label="Sale Rate"
//                     type="number"
//                     value={item.saleRate}
//                     onChange={(e) => updateItem(index, "saleRate", e.target.value)}
//                     required
//                   />

//                   <Input
//                     label="Sale GST %"
//                     type="number"
//                     value={item.gstPercent}
//                     onChange={(e) => updateItem(index, "gstPercent", e.target.value)}
//                   />

//                   <Input
//                     label="Discount %"
//                     type="number"
//                     value={item.discountPercent}
//                     onChange={(e) =>
//                       updateItem(index, "discountPercent", e.target.value)
//                     }
//                   />

//                   <Input
//                     label="Purchase Rate"
//                     value={inventoryItem ? currency(inventoryItem.rate) : ""}
//                     disabled
//                   />

//                   <Input
//                     label="Purchase GST %"
//                     value={inventoryItem ? `${inventoryItem.gstPercent || 0}%` : ""}
//                     disabled
//                   />

//                   <div className="md:col-span-4">
//                     <Input
//                       label="Item Description"
//                       value={inventoryItem?.itemDescription || inventoryItem?.itemName || ""}
//                       disabled
//                     />
//                   </div>

//                   <div className="md:col-span-4 flex justify-end">
//                     <Button
//                       type="button"
//                       variant="danger"
//                       disabled={form.items.length === 1}
//                       onClick={() => removeItem(index)}
//                     >
//                       Remove
//                     </Button>
//                   </div>
//                 </div>

//                 {inventoryItem ? (
//                   <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 md:grid-cols-4">
//                     <p>
//                       <span className="font-semibold">Purchase Total:</span>{" "}
//                       {currency(amount.purchaseTotal)}
//                     </p>
//                     <p>
//                       <span className="font-semibold">Sale GST:</span>{" "}
//                       {currency(amount.saleGst)}
//                     </p>
//                     <p>
//                       <span className="font-semibold">Sale Total:</span>{" "}
//                       {currency(amount.saleTotal)}
//                     </p>
//                     <p>
//                       <span className="font-semibold">Profit:</span>{" "}
//                       {currency(amount.profit)}
//                     </p>
//                   </div>
//                 ) : null}
//               </div>
//             );
//           })}
//         </div>
//       </Card>

//       <Card>
//         <div className="grid gap-3 text-sm md:grid-cols-4">
//           <p>
//             <span className="text-slate-500">Purchase Total:</span>{" "}
//             <span className="font-semibold">{currency(totals.purchaseTotal)}</span>
//           </p>

//           <p>
//             <span className="text-slate-500">Sale GST:</span>{" "}
//             <span className="font-semibold">{currency(totals.saleGst)}</span>
//           </p>

//           <p>
//             <span className="text-slate-500">Sale Total:</span>{" "}
//             <span className="font-semibold">{currency(totals.saleTotal)}</span>
//           </p>

//           <p>
//             <span className="text-slate-500">Expected Profit:</span>{" "}
//             <span className="font-semibold text-emerald-700">
//               {currency(totals.profit)}
//             </span>
//           </p>
//         </div>
//       </Card>

//       <div className="flex justify-end gap-2">
//         <Button
//           type="button"
//           variant="secondary"
//           onClick={() => navigate("/sales")}
//         >
//           Cancel
//         </Button>

//         <Button type="submit" disabled={loading || inventoryLoading}>
//           {loading ? "Creating..." : "Create Sales Order"}
//         </Button>
//       </div>
//     </form>
//   );
// }

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { inventoryApi, saleApi } from "../api/api";
import { currency } from "../utils/format";

const emptyItem = {
  inventoryId: "",
  quantity: 1,
  saleRate: 0,
  gstPercent: 0,
  discountPercent: 0,
};

const createEmptyItem = () => ({ ...emptyItem });

const toNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const calculateSaleItemAmount = (item, inventoryItem) => {
  const qty = toNum(item.quantity);
  const saleRate = toNum(item.saleRate);
  const gstPercent = toNum(item.gstPercent);
  const discountPercent = toNum(item.discountPercent);

  const purchaseRate = toNum(inventoryItem?.rate);
  const purchaseGstPercent = toNum(inventoryItem?.gstPercent);

  const purchaseBasic = qty * purchaseRate;
  const purchaseGst = (purchaseBasic * purchaseGstPercent) / 100;
  const purchaseTotal = purchaseBasic + purchaseGst;

  const saleBasic = qty * saleRate;
  const discountAmount = (saleBasic * discountPercent) / 100;
  const taxable = saleBasic - discountAmount;
  const saleGst = (taxable * gstPercent) / 100;
  const saleTotal = taxable + saleGst;

  return {
    purchaseBasic,
    purchaseGst,
    purchaseTotal,
    saleBasic,
    discountAmount,
    taxable,
    saleGst,
    saleTotal,
    profit: saleTotal - purchaseTotal,
  };
};

export default function CreateSalesOrder() {
  const navigate = useNavigate();

  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const [form, setForm] = useState({
    saleDate: new Date().toISOString().slice(0, 10),
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerGstin: "",
    billingAddress: "",
    shippingAddress: "",
    remarks: "",
    items: [createEmptyItem()],
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inventoryMap = useMemo(() => {
    return new Map(inventory.map((item) => [item._id, item]));
  }, [inventory]);

  const selectedQtyByInventoryId = useMemo(() => {
    const map = new Map();

    form.items.forEach((item) => {
      if (!item.inventoryId) return;

      map.set(
        item.inventoryId,
        toNum(map.get(item.inventoryId)) + toNum(item.quantity),
      );
    });

    return map;
  }, [form.items]);

  const totals = useMemo(() => {
    return form.items.reduce(
      (acc, item) => {
        const inventoryItem = inventoryMap.get(item.inventoryId);
        const amount = calculateSaleItemAmount(item, inventoryItem);

        acc.purchaseTotal += amount.purchaseTotal;
        acc.saleGst += amount.saleGst;
        acc.saleTotal += amount.saleTotal;
        acc.profit += amount.profit;

        return acc;
      },
      {
        purchaseTotal: 0,
        saleGst: 0,
        saleTotal: 0,
        profit: 0,
      },
    );
  }, [form.items, inventoryMap]);

  useEffect(() => {
    const fetchInventory = async () => {
      setInventoryLoading(true);

      try {
        const res = await inventoryApi.list({ page: 1, pageSize: 500 });
        setInventory(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        setError(err.message);
        setInventory([]);
      } finally {
        setInventoryLoading(false);
      }
    };

    fetchInventory();
  }, []);

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

  const handleInventoryChange = (index, inventoryId) => {
    const selectedInventory = inventory.find((item) => item._id === inventoryId);

    setForm((prev) => {
      const items = [...prev.items];

      if (!selectedInventory) {
        items[index] = createEmptyItem();
        return { ...prev, items };
      }

      items[index] = {
        ...items[index],
        inventoryId: selectedInventory._id,
        quantity: 1,
        saleRate: selectedInventory.rate || 0,
        gstPercent: selectedInventory.gstPercent || 0,
        discountPercent: 0,
      };

      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    if (!form.customerName.trim()) return "Customer name is required.";
    if (!form.customerEmail.trim()) return "Customer email is required.";
    if (!form.items.length) return "At least one item is required.";

    const qtyByInventoryId = new Map();

    for (const [index, item] of form.items.entries()) {
      const inventoryItem = inventoryMap.get(item.inventoryId);

      if (!inventoryItem) {
        return `Please select inventory item for row ${index + 1}.`;
      }

      const qty = toNum(item.quantity);

      if (qty <= 0) {
        return `Quantity must be greater than 0 for ${inventoryItem.itemName}.`;
      }

      if (toNum(item.saleRate) <= 0) {
        return `Sale rate must be greater than 0 for ${inventoryItem.itemName}.`;
      }

      qtyByInventoryId.set(
        item.inventoryId,
        toNum(qtyByInventoryId.get(item.inventoryId)) + qty,
      );
    }

    for (const [inventoryId, selectedQty] of qtyByInventoryId.entries()) {
      const inventoryItem = inventoryMap.get(inventoryId);
      const availableQty = toNum(inventoryItem?.availableQuantity);

      if (selectedQty > availableQty) {
        return `Total selected quantity for ${inventoryItem?.itemName || "item"} is ${selectedQty}, but only ${availableQty} is available.`;
      }
    }

    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        saleDate: new Date(form.saleDate),
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim().toLowerCase(),
        customerPhone: form.customerPhone.trim(),
        customerGstin: form.customerGstin.trim(),
        billingAddress: form.billingAddress.trim(),
        shippingAddress: form.shippingAddress.trim(),
        remarks: form.remarks.trim(),
        items: form.items.map((item) => ({
          inventoryId: item.inventoryId,
          quantity: toNum(item.quantity),
          saleRate: toNum(item.saleRate),
          gstPercent: toNum(item.gstPercent),
          discountPercent: toNum(item.discountPercent),
        })),
      };

      // const res = await saleApi.create(payload);
      // navigate(`/sales/${res.sale._id}`);

      const res = await saleApi.create(payload);

      if (!res.emailSent) {
        setError(
          `${res.message}${res.emailError ? ` Error: ${res.emailError}` : ""}`,
        );
        return;
      }

      navigate(`/sales/${res.sale._id}`);
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
          Create Manual Sales Order
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create one sales order with one or more inventory items.
        </p>
      </div>

      {error ? (
        <Card className="bg-red-50 text-sm text-red-700">{error}</Card>
      ) : null}

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Sale Date"
            type="date"
            value={form.saleDate}
            onChange={(e) => update("saleDate", e.target.value)}
            required
          />

          <Input
            label="Customer Name"
            value={form.customerName}
            onChange={(e) => update("customerName", e.target.value)}
            required
          />

          <Input
            label="Customer Email"
            type="email"
            value={form.customerEmail}
            onChange={(e) => update("customerEmail", e.target.value)}
            required
          />

          <Input
            label="Customer Phone"
            type="tel"
            maxLength={10}
            value={form.customerPhone}
            onChange={(e) =>
              update(
                "customerPhone",
                e.target.value.replace(/\D/g, "").slice(0, 10),
              )
            }
          />

          <Input
            label="Customer GSTIN"
            value={form.customerGstin}
            onChange={(e) => update("customerGstin", e.target.value)}
          />

          <Input
            label="Remarks"
            value={form.remarks}
            onChange={(e) => update("remarks", e.target.value)}
          />

          <div className="md:col-span-3">
            <Input
              label="Billing Address"
              value={form.billingAddress}
              onChange={(e) => update("billingAddress", e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <Input
              label="Shipping Address"
              value={form.shippingAddress}
              onChange={(e) => update("shippingAddress", e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Items</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add multiple inventory items in this single sales order.
            </p>

            {inventoryLoading ? (
              <p className="mt-1 text-xs text-slate-500">
                Fetching inventory...
              </p>
            ) : null}
          </div>

          <Button type="button" variant="secondary" onClick={addItem}>
            Add Item
          </Button>
        </div>

        <div className="space-y-4">
          {form.items.map((item, index) => {
            const inventoryItem = inventoryMap.get(item.inventoryId);
            const amount = calculateSaleItemAmount(item, inventoryItem);

            const totalSelectedForThisStock = item.inventoryId
              ? toNum(selectedQtyByInventoryId.get(item.inventoryId))
              : 0;

            const availableQty = toNum(inventoryItem?.availableQuantity);
            const remainingAfterOrder = inventoryItem
              ? availableQty - totalSelectedForThisStock
              : 0;

            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Item #{index + 1}
                    </p>
                    <p className="text-xs text-slate-500">
                      Choose inventory stock and enter sale quantity.
                    </p>
                  </div>

                  {inventoryItem ? (
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Available: {inventoryItem.availableQuantity}{" "}
                      {inventoryItem.unit || ""}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Inventory Item
                    </label>

                    <select
                      value={item.inventoryId}
                      onChange={(e) =>
                        handleInventoryChange(index, e.target.value)
                      }
                      disabled={inventoryLoading}
                      required
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">
                        {inventoryLoading
                          ? "Loading inventory..."
                          : "Select inventory"}
                      </option>

                      {!inventoryLoading &&
                        inventory.map((stock) => {
                          const alreadySelected = toNum(
                            selectedQtyByInventoryId.get(stock._id),
                          );

                          const balanceAfterCurrentOrder =
                            toNum(stock.availableQuantity) - alreadySelected;

                          return (
                            <option key={stock._id} value={stock._id}>
                              {stock.itemName ||
                                stock.itemDescription ||
                                "Unnamed Item"}{" "}
                              | Stock: {stock.availableQuantity}{" "}
                              {stock.unit || ""} | Selected: {alreadySelected} |
                              Balance: {balanceAfterCurrentOrder} | PO:{" "}
                              {stock.sourcePoNumber || "-"}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <Input
                    label="Available Qty"
                    value={
                      inventoryItem
                        ? `${inventoryItem.availableQuantity} ${inventoryItem.unit || ""}`
                        : ""
                    }
                    disabled
                  />

                  <Input
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                    required
                  />

                  <Input
                    label="Sale Rate"
                    type="number"
                    value={item.saleRate}
                    onChange={(e) =>
                      updateItem(index, "saleRate", e.target.value)
                    }
                    required
                  />

                  <Input
                    label="Sale GST %"
                    type="number"
                    value={item.gstPercent}
                    onChange={(e) =>
                      updateItem(index, "gstPercent", e.target.value)
                    }
                  />

                  <Input
                    label="Discount %"
                    type="number"
                    value={item.discountPercent}
                    onChange={(e) =>
                      updateItem(index, "discountPercent", e.target.value)
                    }
                  />

                  <Input
                    label="Purchase Rate"
                    value={inventoryItem ? currency(inventoryItem.rate) : ""}
                    disabled
                  />

                  <Input
                    label="Purchase GST %"
                    value={
                      inventoryItem ? `${inventoryItem.gstPercent || 0}%` : ""
                    }
                    disabled
                  />

                  <div className="md:col-span-4">
                    <Input
                      label="Item Description"
                      value={
                        inventoryItem?.itemDescription ||
                        inventoryItem?.itemName ||
                        ""
                      }
                      disabled
                    />
                  </div>

                  <div className="md:col-span-4 flex justify-end">
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

                {inventoryItem ? (
                  <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 md:grid-cols-5">
                    <p>
                      <span className="font-semibold">Stock Available:</span>{" "}
                      {inventoryItem.availableQuantity} {inventoryItem.unit || ""}
                    </p>

                    <p>
                      <span className="font-semibold">Selected in SO:</span>{" "}
                      {totalSelectedForThisStock} {inventoryItem.unit || ""}
                    </p>

                    <p>
                      <span className="font-semibold">Remaining:</span>{" "}
                      {remainingAfterOrder} {inventoryItem.unit || ""}
                    </p>

                    <p>
                      <span className="font-semibold">Sale Total:</span>{" "}
                      {currency(amount.saleTotal)}
                    </p>

                    <p>
                      <span className="font-semibold">Profit:</span>{" "}
                      {currency(amount.profit)}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <p>
            <span className="text-slate-500">Purchase Total:</span>{" "}
            <span className="font-semibold">
              {currency(totals.purchaseTotal)}
            </span>
          </p>

          <p>
            <span className="text-slate-500">Sale GST:</span>{" "}
            <span className="font-semibold">{currency(totals.saleGst)}</span>
          </p>

          <p>
            <span className="text-slate-500">Sale Total:</span>{" "}
            <span className="font-semibold">{currency(totals.saleTotal)}</span>
          </p>

          <p>
            <span className="text-slate-500">Expected Profit:</span>{" "}
            <span className="font-semibold text-emerald-700">
              {currency(totals.profit)}
            </span>
          </p>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/sales")}
        >
          Cancel
        </Button>

        <Button type="submit" disabled={loading || inventoryLoading}>
          {loading ? "Saving and Sending..." : "Save SO and Send to Customer"}
        </Button>
      </div>
    </form>
  );
}