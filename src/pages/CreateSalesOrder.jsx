import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { inventoryApi, saleApi, tallyApi } from "../api/api";
import { currency } from "../utils/format";

const emptyItem = {
  inventoryId: "",
  quantity: 1,
  saleRate: 0,
  gstPercent: 0,
  selectedGstOption: "",
  discountPercent: 0,
  description: "",
};

const createEmptyItem = () => ({ ...emptyItem });

const toNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getItemName = (item) => {
  return item?.itemName || item?.itemDescription || "Unnamed Item";
};

const formatQty = (qty, unit) => {
  return `${toNum(qty)} ${unit || ""}`.trim();
};

const makeItemPoKey = (stock) => {
  if (!stock) return "";

  return `${getItemName(stock).trim().toLowerCase()}__${String(
    stock.sourcePoNumber || ""
  )
    .trim()
    .toLowerCase()}`;
};

const buildSaleGstOptionsFromStock = (stock) => {
  const gst = toNum(stock?.gstPercent);

  const options = [
    {
      value: "NO_GST",
      label: "No GST",
      gstPercent: 0,
    },
  ];

  if (gst > 0) {
    const half = gst / 2;

    options.push({
      value: "CGST_SGST",
      label: `CGST ${half}% + SGST ${half}% = ${gst}%`,
      gstPercent: gst,
    });

    options.push({
      value: "IGST",
      label: `IGST ${gst}%`,
      gstPercent: gst,
    });
  }

  return options;
};

const getDefaultSaleGstOption = (stock) => {
  const options = buildSaleGstOptionsFromStock(stock);

  return (
    options.find((option) => option.value === "CGST_SGST") ||
    options.find((option) => option.value === "IGST") ||
    options.find((option) => option.value === "NO_GST") ||
    options[0]
  );
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

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="flex h-10 w-full items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-700">
        {value || "-"}
      </div>
    </div>
  );
}

export default function CreateSalesOrder() {
  const navigate = useNavigate();

  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const [ledgers, setLedgers] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedLedgerName, setSelectedLedgerName] = useState("");

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

  const inventorySummary = useMemo(() => {
    return inventory.reduce(
      (acc, item) => {
        acc.available += toNum(item.availableQuantity);
        acc.reserved += toNum(item.reservedQuantity);
        acc.sold += toNum(item.soldQuantity);
        return acc;
      },
      {
        available: 0,
        reserved: 0,
        sold: 0,
      }
    );
  }, [inventory]);

  const selectedItemPoKeys = useMemo(() => {
    const map = new Map();

    form.items.forEach((item, index) => {
      const stock = inventoryMap.get(item.inventoryId);
      const key = makeItemPoKey(stock);

      if (!key) return;

      map.set(key, index);
    });

    return map;
  }, [form.items, inventoryMap]);

  const getItemPoSelectedByOtherRow = (stock, currentIndex) => {
    const key = makeItemPoKey(stock);
    if (!key) return false;

    const selectedIndex = selectedItemPoKeys.get(key);

    return selectedIndex !== undefined && selectedIndex !== currentIndex;
  };

  const getDropdownOptions = (currentIndex) => {
    return inventory
      .filter((stock) => {
        const availableQty = toNum(stock.availableQuantity);

        if (availableQty <= 0) return false;

        const alreadySelectedByOtherRow = getItemPoSelectedByOtherRow(
          stock,
          currentIndex
        );

        return !alreadySelectedByOtherRow;
      })
      .sort((a, b) => {
        const itemCompare = getItemName(a).localeCompare(getItemName(b));

        if (itemCompare !== 0) return itemCompare;

        return String(a.sourcePoNumber || "").localeCompare(
          String(b.sourcePoNumber || "")
        );
      });
  };

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
      }
    );
  }, [form.items, inventoryMap]);

  useEffect(() => {
    const fetchInventory = async () => {
      setInventoryLoading(true);

      try {
        const res = await inventoryApi.list({ page: 1, pageSize: 500 , sellableOnly: "true", });
        setInventory(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        setError(err.message);
        setInventory([]);
      } finally {
        setInventoryLoading(false);
      }
    };

    const fetchLedgers = async () => {
      setLedgerLoading(true);

      try {
        const res = await tallyApi.ledgers();
        setLedgers(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch ledgers:", err.message);
        setLedgers([]);
      } finally {
        setLedgerLoading(false);
      }
    };

    fetchInventory();
    fetchLedgers();
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

  const handleLedgerChange = (e) => {
    const ledgerName = e.target.value;
    setSelectedLedgerName(ledgerName);

    const selectedLedger = ledgers.find((ledger) => ledger.name === ledgerName);

    if (!selectedLedger) {
      setForm((prev) => ({
        ...prev,
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerGstin: "",
        billingAddress: "",
        shippingAddress: "",
      }));
      return;
    }

    const phone = String(selectedLedger.phone || selectedLedger.contact || "")
      .replace(/\D/g, "")
      .slice(0, 10);

    const address = selectedLedger.address || "";

    const gstin =
      selectedLedger.gstin ||
      selectedLedger.gstIn ||
      selectedLedger.gstNumber ||
      selectedLedger.gstRegistrationNumber ||
      "";

    setForm((prev) => ({
      ...prev,
      customerName: selectedLedger.mailingName || selectedLedger.name || "",
      customerEmail: selectedLedger.email || "",
      customerPhone: phone,
      customerGstin: gstin,
      billingAddress: address,
      shippingAddress: address,
    }));
  };

  const handleInventoryChange = (index, inventoryId) => {
    const selectedStock = inventoryMap.get(inventoryId);

    setForm((prev) => {
      const items = [...prev.items];

      if (!selectedStock) {
        items[index] = createEmptyItem();
        return { ...prev, items };
      }

      const defaultGstOption = getDefaultSaleGstOption(selectedStock);

      items[index] = {
        ...items[index],
        inventoryId: selectedStock._id,
        quantity: 1,
        saleRate: selectedStock.rate || 0,
        gstPercent: defaultGstOption.gstPercent,
        selectedGstOption: defaultGstOption.value,
        discountPercent: 0,
        description: selectedStock.itemDescription || selectedStock.itemName || "",
      };

      return { ...prev, items };
    });
  };

  const handleSaleGstOptionChange = (index, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = items[index];
      const stock = inventoryMap.get(item.inventoryId);

      const gstOptions = buildSaleGstOptionsFromStock(stock);

      const selectedOption =
        gstOptions.find((option) => option.value === value) || gstOptions[0];

      items[index] = {
        ...item,
        selectedGstOption: selectedOption.value,
        gstPercent: selectedOption.gstPercent,
      };

      return { ...prev, items };
    });
  };

  const setMaxQuantity = (index) => {
    const row = form.items[index];
    const stock = inventoryMap.get(row.inventoryId);

    if (!stock) return;

    updateItem(index, "quantity", toNum(stock.availableQuantity));
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
    if (!selectedLedgerName) return "Customer ledger is required.";
    if (!form.customerName.trim()) return "Customer name is required.";
    if (!form.customerEmail.trim()) return "Customer email is required.";
    if (!form.items.length) return "At least one item is required.";

    const selectedKeys = new Set();

    for (const [index, item] of form.items.entries()) {
      const stock = inventoryMap.get(item.inventoryId);

      if (!stock) {
        return `Please select item for row ${index + 1}.`;
      }

      const itemPoKey = makeItemPoKey(stock);

      if (selectedKeys.has(itemPoKey)) {
        return `${getItemName(stock)} from PO ${
          stock.sourcePoNumber || "-"
        } is already selected. Please update quantity in the existing row.`;
      }

      selectedKeys.add(itemPoKey);

      const qty = toNum(item.quantity);
      const availableQty = toNum(stock.availableQuantity);

      if (qty <= 0) {
        return `Quantity must be greater than 0 for ${getItemName(stock)}.`;
      }

      if (qty > availableQty) {
        return `${getItemName(stock)} from PO ${
          stock.sourcePoNumber || "-"
        } has only ${formatQty(
          availableQty,
          stock.unit
        )} available to sell. You selected ${formatQty(qty, stock.unit)}.`;
      }

      if (toNum(item.saleRate) <= 0) {
        return `Sale rate must be greater than 0 for ${getItemName(stock)}.`;
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
        items: form.items.map(({ selectedGstOption, description, ...item }) => ({
          inventoryId: item.inventoryId,
          quantity: toNum(item.quantity),
          saleRate: toNum(item.saleRate),
          gstPercent: toNum(item.gstPercent),
          discountPercent: toNum(item.discountPercent),
        })),
      };

      const res = await saleApi.create(payload);

      if (!res.emailSent) {
        setError(
          `${res.message}${res.emailError ? ` Error: ${res.emailError}` : ""}`
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
          Select stock PO-wise, enter quantity and send the sales order to the
          customer.
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Customer Ledger
              <span className="ml-1 text-red-500">*</span>
            </label>

            <select
              value={selectedLedgerName}
              onChange={handleLedgerChange}
              disabled={ledgerLoading}
              required
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {ledgerLoading ? "Loading ledgers..." : "Select customer ledger"}
              </option>

              {!ledgerLoading &&
                ledgers.map((ledger) => (
                  <option key={ledger.name} value={ledger.name}>
                    {ledger.name}
                  </option>
                ))}
            </select>

            {ledgerLoading ? (
              <p className="mt-1 text-xs text-slate-500">
                Fetching ledgers from Tally...
              </p>
            ) : null}
          </div>

          <Input label="Customer Name" value={form.customerName} disabled />

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
                e.target.value.replace(/\D/g, "").slice(0, 10)
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
        <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Items</h2>
            <p className="mt-1 text-sm text-slate-500">
              Each dropdown option shows the item, PO number, purchase rate and
              available quantity.
            </p>

            {inventoryLoading ? (
              <p className="mt-1 text-xs text-slate-500">
                Fetching inventory...
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-center text-xs sm:min-w-[420px]">
              <div className="rounded-xl bg-white p-2">
                <p className="text-slate-500">Available to Sell</p>
                <p className="mt-1 font-bold text-emerald-700">
                  {inventorySummary.available}
                </p>
              </div>

              <div className="rounded-xl bg-white p-2">
                <p className="text-slate-500">Reserved for Approval</p>
                <p className="mt-1 font-bold text-amber-700">
                  {inventorySummary.reserved}
                </p>
              </div>

              <div className="rounded-xl bg-white p-2">
                <p className="text-slate-500">Sold</p>
                <p className="mt-1 font-bold text-slate-700">
                  {inventorySummary.sold}
                </p>
              </div>
            </div>

            <Button type="button" variant="secondary" onClick={addItem}>
              Add Item
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {form.items.map((item, index) => {
            const stock = inventoryMap.get(item.inventoryId);
            const amount = calculateSaleItemAmount(item, stock);

            const availableQty = toNum(stock?.availableQuantity);
            const selectedQty = toNum(item.quantity);
            const remainingAfterOrder = stock ? availableQty - selectedQty : 0;
            const overSelected = stock && remainingAfterOrder < 0;

            const dropdownOptions = getDropdownOptions(index);
            const saleGstOptions = buildSaleGstOptionsFromStock(stock);

            return (
              <div
                key={index}
                className={[
                  "rounded-2xl border p-4",
                  !stock
                    ? "border-slate-200 bg-slate-50"
                    : overSelected
                    ? "border-red-200 bg-red-50"
                    : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Item #{index + 1}
                    </p>
                    <p className="text-xs text-slate-500">
                      Select a PO-wise stock row. After selecting, grey fields
                      show purchase details.
                    </p>
                  </div>

                  {stock ? (
                    <div
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        overSelected
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-50 text-emerald-700",
                      ].join(" ")}
                    >
                      Available After This SO:{" "}
                      {formatQty(remainingAfterOrder, stock.unit)}
                    </div>
                  ) : (
                    <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                      No item selected
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Item / PO / Purchase Price
                      <span className="ml-1 text-red-500">*</span>
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
                          ? "Loading stock..."
                          : "Select item from PO"}
                      </option>

                      {dropdownOptions.map((stockOption) => (
                        <option key={stockOption._id} value={stockOption._id}>
                          {getItemName(stockOption)} — Purchase:{" "}
                          {currency(stockOption.rate)} + GST{" "}
                          {toNum(stockOption.gstPercent)}% — Can Select Now:{" "}
                          {formatQty(
                            stockOption.availableQuantity,
                            stockOption.unit
                          )}
                        </option>
                      ))}
                    </select>

                    <p className="mt-1 text-xs text-slate-500">
                      Same item from the same PO will not appear again after you
                      select it.
                    </p>
                  </div>

                  <ReadOnlyField
                    label="Available to Sell"
                    value={
                      stock
                        ? formatQty(stock.availableQuantity, stock.unit)
                        : ""
                    }
                  />

                  <ReadOnlyField
                    label="Maximum Qty Allowed"
                    value={
                      stock
                        ? formatQty(stock.availableQuantity, stock.unit)
                        : ""
                    }
                  />

                  <div>
                    <Input
                      label="Quantity"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const value = Math.max(0, Number(e.target.value));
                        updateItem(index, "quantity", value);
                      }}
                      required
                    />

                    {stock ? (
                      <button
                        type="button"
                        onClick={() => setMaxQuantity(index)}
                        className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Use Maximum Available
                      </button>
                    ) : null}
                  </div>

                  <Input
                    label="Sale Rate"
                    type="number"
                    value={item.saleRate}
                    onChange={(e) =>
                      updateItem(index, "saleRate", e.target.value)
                    }
                    required
                  />

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Sale GST
                    </label>

                    <select
                      value={item.selectedGstOption || ""}
                      onChange={(e) =>
                        handleSaleGstOptionChange(index, e.target.value)
                      }
                      disabled={!item.inventoryId}
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">
                        {item.inventoryId ? "Select GST" : "Select item first"}
                      </option>

                      {saleGstOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Discount %"
                    type="number"
                    value={item.discountPercent}
                    onChange={(e) =>
                      updateItem(index, "discountPercent", e.target.value)
                    }
                  />

                  <ReadOnlyField
                    label="Purchase Rate"
                    value={stock ? currency(stock.rate) : ""}
                  />

                  <ReadOnlyField
                    label="Purchase GST %"
                    value={stock ? `${toNum(stock.gstPercent)}%` : ""}
                  />

                  <ReadOnlyField
                    label="Purchase Cost"
                    value={stock ? currency(amount.purchaseTotal) : ""}
                  />

                  <ReadOnlyField
                    label="Sale Total"
                    value={stock ? currency(amount.saleTotal) : ""}
                  />

                  <div className="md:col-span-2">
                    <Input
                      label="Description"
                      value={item.description || ""}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
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

                {stock ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 md:grid-cols-5">
                      <p>
                        <span className="font-semibold">Total Purchased:</span>{" "}
                        {formatQty(stock.purchasedQuantity, stock.unit)}
                      </p>

                      <p>
                        <span className="font-semibold">Available Now:</span>{" "}
                        {formatQty(stock.availableQuantity, stock.unit)}
                      </p>

                      <p>
                        <span className="font-semibold">
                          Reserved for Approval:
                        </span>{" "}
                        {formatQty(stock.reservedQuantity, stock.unit)}
                      </p>

                      <p>
                        <span className="font-semibold">Sold:</span>{" "}
                        {formatQty(stock.soldQuantity, stock.unit)}
                      </p>

                      <p>
                        <span className="font-semibold">
                          Selected in this SO:
                        </span>{" "}
                        {formatQty(selectedQty, stock.unit)}
                      </p>
                    </div>

                    <div
                      className={[
                        "grid gap-3 rounded-xl p-3 text-xs md:grid-cols-4",
                        overSelected
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-50 text-emerald-800",
                      ].join(" ")}
                    >
                      <p>
                        <span className="font-semibold">
                          Available After SO:
                        </span>{" "}
                        {formatQty(remainingAfterOrder, stock.unit)}
                      </p>

                      <p>
                        <span className="font-semibold">Sale GST:</span>{" "}
                        {currency(amount.saleGst)}
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

                    {overSelected ? (
                      <p className="text-xs font-semibold text-red-600">
                        You selected more than available stock. Please reduce
                        the quantity.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
                    Select an item first. Purchase rate, PO number and stock
                    details will appear here.
                  </div>
                )}
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
            <span className="text-slate-500">Expected Profit if Accepted:</span>{" "}
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

        <Button
          type="submit"
          disabled={loading || inventoryLoading || ledgerLoading}
        >
          {loading ? "Saving and Sending..." : "Save SO and Send to Customer"}
        </Button>
      </div>
    </form>
  );
}