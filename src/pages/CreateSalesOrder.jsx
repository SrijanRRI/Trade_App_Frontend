import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { inventoryApi, saleApi } from "../api/api";
import { currency } from "../utils/format";

const emptyItem = {
  groupKey: "",
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

const getItemName = (item) => {
  return item?.itemName || item?.itemDescription || "Unnamed Item";
};

const makeGroupKey = (item) => {
  return getItemName(item).trim().toLowerCase();
};

const formatQty = (qty, unit) => {
  return `${toNum(qty)} ${unit || ""}`.trim();
};

const calculateSaleItemAmount = (item, allocationInfo = { allocations: [] }) => {
  const qty = toNum(item.quantity);
  const saleRate = toNum(item.saleRate);
  const gstPercent = toNum(item.gstPercent);
  const discountPercent = toNum(item.discountPercent);

  const purchaseBasic = allocationInfo.allocations.reduce((sum, allocation) => {
    return sum + toNum(allocation.quantity) * toNum(allocation.stock.rate);
  }, 0);

  const purchaseGst = allocationInfo.allocations.reduce((sum, allocation) => {
    const basic = toNum(allocation.quantity) * toNum(allocation.stock.rate);
    return sum + (basic * toNum(allocation.stock.gstPercent)) / 100;
  }, 0);

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

  const inventoryGroups = useMemo(() => {
    const map = new Map();

    inventory.forEach((stock) => {
      const key = makeGroupKey(stock);

      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          itemName: getItemName(stock),
          itemDescription: stock.itemDescription || "",
          hsnCode: stock.hsnCode || "",
          unit: stock.unit || "",
          items: [],
          purchasedQuantity: 0,
          availableQuantity: 0,
          reservedQuantity: 0,
          soldQuantity: 0,
        });
      }

      const group = map.get(key);

      group.items.push(stock);
      group.purchasedQuantity += toNum(stock.purchasedQuantity);
      group.availableQuantity += toNum(stock.availableQuantity);
      group.reservedQuantity += toNum(stock.reservedQuantity);
      group.soldQuantity += toNum(stock.soldQuantity);

      if (!group.unit && stock.unit) {
        group.unit = stock.unit;
      }

      if (!group.itemDescription && stock.itemDescription) {
        group.itemDescription = stock.itemDescription;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.itemName.localeCompare(b.itemName),
    );
  }, [inventory]);

  const inventoryGroupMap = useMemo(() => {
    return new Map(inventoryGroups.map((group) => [group.groupKey, group]));
  }, [inventoryGroups]);

  const inventorySummary = useMemo(() => {
    return inventoryGroups.reduce(
      (acc, group) => {
        acc.items += 1;
        acc.free += toNum(group.availableQuantity);
        acc.hold += toNum(group.reservedQuantity);
        acc.sold += toNum(group.soldQuantity);
        return acc;
      },
      {
        items: 0,
        free: 0,
        hold: 0,
        sold: 0,
      },
    );
  }, [inventoryGroups]);

  const selectedQtyByGroupKey = useMemo(() => {
    const map = new Map();

    form.items.forEach((item) => {
      if (!item.groupKey) return;

      map.set(
        item.groupKey,
        toNum(map.get(item.groupKey)) + toNum(item.quantity),
      );
    });

    return map;
  }, [form.items]);

  const getSelectedQtyExceptCurrentRow = (groupKey, currentIndex) => {
    return form.items.reduce((total, row, rowIndex) => {
      if (rowIndex === currentIndex) return total;
      if (row.groupKey !== groupKey) return total;
      return total + toNum(row.quantity);
    }, 0);
  };

  const rowAllocationMap = useMemo(() => {
    const usedByStockId = new Map();
    const allocationByRow = new Map();

    form.items.forEach((row, rowIndex) => {
      const group = inventoryGroupMap.get(row.groupKey);

      if (!group) {
        allocationByRow.set(rowIndex, {
          allocations: [],
          unallocated: toNum(row.quantity),
        });
        return;
      }

      let remainingQty = toNum(row.quantity);
      const allocations = [];

      group.items.forEach((stock) => {
        if (remainingQty <= 0) return;

        const alreadyUsed = toNum(usedByStockId.get(stock._id));
        const freeInThisStock = Math.max(
          toNum(stock.availableQuantity) - alreadyUsed,
          0,
        );

        if (freeInThisStock <= 0) return;

        const takeQty = Math.min(freeInThisStock, remainingQty);

        allocations.push({
          stock,
          quantity: takeQty,
        });

        usedByStockId.set(stock._id, alreadyUsed + takeQty);
        remainingQty -= takeQty;
      });

      allocationByRow.set(rowIndex, {
        allocations,
        unallocated: remainingQty,
      });
    });

    return allocationByRow;
  }, [form.items, inventoryGroupMap]);

  const totals = useMemo(() => {
    return form.items.reduce(
      (acc, item, index) => {
        const allocationInfo = rowAllocationMap.get(index);
        const amount = calculateSaleItemAmount(item, allocationInfo);

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
  }, [form.items, rowAllocationMap]);

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

  const handleInventoryGroupChange = (index, groupKey) => {
    const selectedGroup = inventoryGroupMap.get(groupKey);

    setForm((prev) => {
      const items = [...prev.items];

      if (!selectedGroup) {
        items[index] = createEmptyItem();
        return { ...prev, items };
      }

      const selectedByOtherRows = getSelectedQtyExceptCurrentRow(
        groupKey,
        index,
      );

      const availableForThisRow = Math.max(
        toNum(selectedGroup.availableQuantity) - selectedByOtherRows,
        0,
      );

      const firstStock = selectedGroup.items?.[0];

      items[index] = {
        ...items[index],
        groupKey,
        quantity: availableForThisRow > 0 ? 1 : 0,
        saleRate: firstStock?.rate || 0,
        gstPercent: firstStock?.gstPercent || 0,
        discountPercent: 0,
      };

      return { ...prev, items };
    });
  };

  const setMaxQuantity = (index) => {
    const row = form.items[index];
    const group = inventoryGroupMap.get(row.groupKey);

    if (!group) return;

    const selectedByOtherRows = getSelectedQtyExceptCurrentRow(
      row.groupKey,
      index,
    );

    const maxQty = Math.max(
      toNum(group.availableQuantity) - selectedByOtherRows,
      0,
    );

    updateItem(index, "quantity", maxQty);
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

    const qtyByGroupKey = new Map();

    for (const [index, item] of form.items.entries()) {
      const group = inventoryGroupMap.get(item.groupKey);

      if (!group) {
        return `Please select item for row ${index + 1}.`;
      }

      const qty = toNum(item.quantity);

      if (qty <= 0) {
        return `Quantity must be greater than 0 for ${group.itemName}.`;
      }

      if (toNum(item.saleRate) <= 0) {
        return `Sale rate must be greater than 0 for ${group.itemName}.`;
      }

      qtyByGroupKey.set(
        item.groupKey,
        toNum(qtyByGroupKey.get(item.groupKey)) + qty,
      );
    }

    for (const [groupKey, selectedQty] of qtyByGroupKey.entries()) {
      const group = inventoryGroupMap.get(groupKey);
      const freeQty = toNum(group?.availableQuantity);

      if (selectedQty > freeQty) {
        return `${group?.itemName || "Item"} has only ${freeQty} ${group?.unit || ""
          } available to sell. You selected ${selectedQty}.`;
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

    const expandedItems = [];

    form.items.forEach((item, index) => {
      const allocationInfo = rowAllocationMap.get(index);

      allocationInfo?.allocations?.forEach((allocation) => {
        expandedItems.push({
          inventoryId: allocation.stock._id,
          quantity: toNum(allocation.quantity),
          saleRate: toNum(item.saleRate),
          gstPercent: toNum(item.gstPercent),
          discountPercent: toNum(item.discountPercent),
        });
      });
    });

    if (!expandedItems.length) {
      setError("No stock is available for selected items.");
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
        items: expandedItems,
      };

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
        <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Items</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select item name once. If the same item exists in multiple stock
              batches, it is automatically added together here.
            </p>

            {inventoryLoading ? (
              <p className="mt-1 text-xs text-slate-500">
                Fetching inventory...
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-center text-xs sm:min-w-[360px]">
              <div className="rounded-xl bg-white p-2">
                <p className="text-slate-500">Available to Sell</p>
                <p className="mt-1 font-bold text-emerald-700">
                  {inventorySummary.free}
                </p>
              </div>

              <div className="rounded-xl bg-white p-2">
                <p className="text-slate-500">Reserved for Approval</p>
                <p className="mt-1 font-bold text-amber-700">
                  {inventorySummary.hold}
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
            const group = inventoryGroupMap.get(item.groupKey);
            const allocationInfo = rowAllocationMap.get(index);
            const amount = calculateSaleItemAmount(item, allocationInfo);

            const selectedByOtherRows = item.groupKey
              ? getSelectedQtyExceptCurrentRow(item.groupKey, index)
              : 0;

            const totalSelectedForThisItem = item.groupKey
              ? toNum(selectedQtyByGroupKey.get(item.groupKey))
              : 0;

            const freeStock = toNum(group?.availableQuantity);
            const holdStock = toNum(group?.reservedQuantity);
            const soldStock = toNum(group?.soldQuantity);
            const purchasedStock = toNum(group?.purchasedQuantity);

            const maxForThisRow = group
              ? Math.max(freeStock - selectedByOtherRows, 0)
              : 0;

            const remainingAfterOrder = group
              ? freeStock - totalSelectedForThisItem
              : 0;

            const overSelected = group && remainingAfterOrder < 0;

            return (
              <div
                key={index}
                className={[
                  "rounded-2xl border p-4",
                  overSelected
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
                      Select item and enter quantity. Remaining stock will update
                      immediately.
                    </p>
                  </div>

                  {group ? (
                    <div
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        overSelected
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-50 text-emerald-700",
                      ].join(" ")}
                    >
                      Available After This SO:{" "}
                      {formatQty(remainingAfterOrder, group.unit)}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Item
                    </label>

                    <select
                      value={item.groupKey}
                      onChange={(e) =>
                        handleInventoryGroupChange(index, e.target.value)
                      }
                      disabled={inventoryLoading}
                      required
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">
                        {inventoryLoading
                          ? "Loading stock..."
                          : "Select item"}
                      </option>

                      {!inventoryLoading &&
                        inventoryGroups.map((stockGroup) => {
                          const selectedByOtherRowsForOption =
                            getSelectedQtyExceptCurrentRow(
                              stockGroup.groupKey,
                              index,
                            );

                          const leftForThisRow =
                            toNum(stockGroup.availableQuantity) -
                            selectedByOtherRowsForOption;

                          const disabled =
                            leftForThisRow <= 0 &&
                            item.groupKey !== stockGroup.groupKey;

                          return (
                            <option
                              key={stockGroup.groupKey}
                              value={stockGroup.groupKey}
                              disabled={disabled}
                            >
                              {stockGroup.itemName} — Can Select Now:{" "}
                              {formatQty(
                                Math.max(leftForThisRow, 0),
                                stockGroup.unit,
                              )}
                            </option>
                          );
                        })}
                    </select>

                    <p className="mt-1 text-xs text-slate-500">
                      Only available stock can be selected. Stock reserved for customer approval is blocked automatically.
                    </p>
                  </div>

                  <Input
                    label="Available to Sell"
                    value={group ? formatQty(group.availableQuantity, group.unit) : ""}
                    disabled
                  />

                  <Input
                    label="Maximum Qty Allowed"
                    value={group ? formatQty(maxForThisRow, group.unit) : ""}
                    disabled
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

                    {group ? (
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
                    label="Purchase Cost"
                    value={group ? currency(amount.purchaseTotal) : ""}
                    disabled
                  />

                  <Input
                    label="Sale Total"
                    value={group ? currency(amount.saleTotal) : ""}
                    disabled
                  />

                  <div className="md:col-span-2">
                    <Input
                      label="Description"
                      value={group?.itemDescription || group?.itemName || ""}
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

                {group ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 md:grid-cols-5">
                      <p>
                        <span className="font-semibold">Total Purchased:</span>{" "}
                        {formatQty(purchasedStock, group.unit)}
                      </p>

                      <p>
                        <span className="font-semibold">Available Now:</span>{" "}
                        {formatQty(freeStock, group.unit)}
                      </p>

                      <p>
                        <span className="font-semibold">Reserved for Approval:</span>{" "}
                        {formatQty(holdStock, group.unit)}
                      </p>

                      <p>
                        <span className="font-semibold">Sold:</span>{" "}
                        {formatQty(soldStock, group.unit)}
                      </p>

                      <p>
                        <span className="font-semibold">Selected in this SO:</span>{" "}
                        {formatQty(totalSelectedForThisItem, group.unit)}
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
                        <span className="font-semibold">Available After SO:</span>{" "}
                        {formatQty(remainingAfterOrder, group.unit)}
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
                        You selected more than free stock. Please reduce the
                        quantity.
                      </p>
                    ) : null}
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