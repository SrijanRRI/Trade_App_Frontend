import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { purchaseOrderApi, tallyApi } from "../api/api";

const emptyItem = {
  selectedStockName: "",
  selectedGstOption: "",
  itemName: "",
  itemDescription: "",
  hsnCode: "",
  qty: 1,
  unit: "PCS",
  rate: 0,
  gstPercent: 0,
  taxDetails: [],

  // UI only fields for description dropdown
  descriptionOptions: [],
  descriptionLoading: false,
  descriptionLookupError: "",
};

const createEmptyItem = () => ({
  ...emptyItem,
  taxDetails: [],
  descriptionOptions: [],
});

const toNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const makeTaxDetail = ({ name, value, field }) => ({
  chargeName: name,
  chargeType: "GST",
  nature: "Tax",
  chargeOn: "Taxable Amount",
  chargeValue: toNum(value),
  chargeAmount: 0,
  taxField: field,
  status: 1,
});

const buildGstOptionsFromStock = (stock) => {
  const cgst = toNum(stock?.cgstRate);
  const sgst = toNum(stock?.sgstRate);
  const utgst = toNum(stock?.utgstRate);
  const igst = toNum(stock?.igstRate);
  const gst = toNum(stock?.gstRate);

  const options = [
    {
      value: "NO_GST",
      label: "No GST",
      gstPercent: 0,
      taxDetails: [],
    },
  ];

  if (cgst > 0 || sgst > 0) {
    const taxDetails = [];

    if (cgst > 0) {
      taxDetails.push(
        makeTaxDetail({
          name: "CGST",
          value: cgst,
          field: "cgst",
        })
      );
    }

    if (sgst > 0) {
      taxDetails.push(
        makeTaxDetail({
          name: "SGST",
          value: sgst,
          field: "sgst",
        })
      );
    }

    options.push({
      value: "CGST_SGST",
      label: `CGST ${cgst}% + SGST ${sgst}% = ${cgst + sgst}%`,
      gstPercent: cgst + sgst,
      taxDetails,
    });
  }

  if (cgst > 0 || utgst > 0) {
    const taxDetails = [];

    if (cgst > 0) {
      taxDetails.push(
        makeTaxDetail({
          name: "CGST",
          value: cgst,
          field: "cgst",
        })
      );
    }

    if (utgst > 0) {
      taxDetails.push(
        makeTaxDetail({
          name: "UTGST",
          value: utgst,
          field: "utgst",
        })
      );
    }

    if (utgst > 0) {
      options.push({
        value: "CGST_UTGST",
        label: `CGST ${cgst}% + UTGST ${utgst}% = ${cgst + utgst}%`,
        gstPercent: cgst + utgst,
        taxDetails,
      });
    }
  }

  if (igst > 0) {
    options.push({
      value: "IGST",
      label: `IGST ${igst}%`,
      gstPercent: igst,
      taxDetails: [
        makeTaxDetail({
          name: "IGST",
          value: igst,
          field: "igst",
        }),
      ],
    });
  }

  if (!cgst && !sgst && !utgst && !igst && gst > 0) {
    const half = gst / 2;

    options.push({
      value: "CGST_SGST",
      label: `CGST ${half}% + SGST ${half}% = ${gst}%`,
      gstPercent: gst,
      taxDetails: [
        makeTaxDetail({
          name: "CGST",
          value: half,
          field: "cgst",
        }),
        makeTaxDetail({
          name: "SGST",
          value: half,
          field: "sgst",
        }),
      ],
    });

    options.push({
      value: "IGST",
      label: `IGST ${gst}%`,
      gstPercent: gst,
      taxDetails: [
        makeTaxDetail({
          name: "IGST",
          value: gst,
          field: "igst",
        }),
      ],
    });
  }

  return options;
};

const getDefaultGstOption = (stock) => {
  const options = buildGstOptionsFromStock(stock);

  return (
    options.find((option) => option.value === "CGST_SGST") ||
    options.find((option) => option.value === "CGST_UTGST") ||
    options.find((option) => option.value === "IGST") ||
    options.find((option) => option.value === "NO_GST") ||
    options[0]
  );
};

const calculateItemAmount = (item) => {
  const qty = toNum(item.qty);
  const rate = toNum(item.rate);
  const basic = qty * rate;
  const taxable = basic;

  const taxDetails = Array.isArray(item.taxDetails) ? item.taxDetails : [];

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const updatedTaxDetails = taxDetails.map((tax) => {
    const taxAmount = (taxable * toNum(tax.chargeValue)) / 100;

    if (tax.taxField === "cgst") cgst += taxAmount;
    if (tax.taxField === "sgst" || tax.taxField === "utgst") sgst += taxAmount;
    if (tax.taxField === "igst") igst += taxAmount;

    return {
      ...tax,
      chargeAmount: Number(taxAmount.toFixed(2)),
    };
  });

  const total = basic + cgst + sgst + igst;

  return {
    taxDetails: updatedTaxDetails,
    amount: {
      basic: Number(basic.toFixed(2)),
      taxable: Number(taxable.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      igst: Number(igst.toFixed(2)),
      total: Number(total.toFixed(2)),
    },
  };
};

const normalizeItemDescriptionOptions = (res) => {
  const data = res?.data ?? res;

  const rawOptions = Array.isArray(data)
    ? data
    : Array.isArray(data?.descriptions)
    ? data.descriptions
    : Array.isArray(data?.itemDescriptions)
    ? data.itemDescriptions
    : Array.isArray(data?.sizes)
    ? data.sizes
    : Array.isArray(data?.items)
    ? data.items
    : [];

  const options = rawOptions
    .map((option) => {
      if (typeof option === "string") return option;

      return (
        option?.itemDescription ||
        option?.description ||
        option?.pipeSizeName ||
        option?.sizeName ||
        option?.name ||
        option?.label ||
        ""
      );
    })
    .map((value) => String(value).trim())
    .filter(Boolean);

  return [...new Set(options)];
};

export default function CreatePO() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    poNumber: `PO-MANUAL-${Date.now()}`,
    poDate: new Date().toISOString().slice(0, 10),
    vendorName: "",
    // vendorCode: "",
    vendorLocation: "",
    vendorEmail: "",
    vendorPhone: "",
    company: "Demo Company",
    division: "Trading",
    purchaseType: "general",
    departmentName: "Purchase",
    items: [createEmptyItem()],
  });

  const [ledgers, setLedgers] = useState([]);
  const [stocks, setStocks] = useState([]);

  const [selectedLedgerName, setSelectedLedgerName] = useState("");

  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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

    const fetchStocks = async () => {
      setStockLoading(true);

      try {
        const res = await tallyApi.stocks();
        setStocks(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch stock items:", err.message);
        setStocks([]);
      } finally {
        setStockLoading(false);
      }
    };

    fetchLedgers();
    fetchStocks();
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
        vendorName: "",
        // vendorCode: "",
        vendorLocation: "",
        vendorEmail: "",
        vendorPhone: "",
      }));
      return;
    }

    const phone = String(selectedLedger.phone || selectedLedger.contact || "")
      .replace(/\D/g, "")
      .slice(0, 10);

    setForm((prev) => ({
      ...prev,
      vendorName: selectedLedger.name || "",
      // vendorCode: selectedLedger.name || "",
      vendorLocation: selectedLedger.address || "",
      vendorEmail: selectedLedger.email || "",
      vendorPhone: phone,
    }));
  };

  const handleStockChange = async (index, stockName) => {
    const selectedStock = stocks.find((stock) => stock.name === stockName);

    if (!selectedStock) {
      setForm((prev) => {
        const items = [...prev.items];
        items[index] = createEmptyItem();
        return { ...prev, items };
      });
      return;
    }

    const defaultGstOption = getDefaultGstOption(selectedStock);
    const selectedItemName = selectedStock.name || "";

    setForm((prev) => {
      const items = [...prev.items];

      items[index] = {
        ...items[index],
        selectedStockName: selectedItemName,
        selectedGstOption: defaultGstOption.value,

        itemName: selectedItemName,
        itemDescription: "",
        hsnCode: selectedStock.hsnCode || "",
        unit: selectedStock.unit || "PCS",

        gstPercent: defaultGstOption.gstPercent,
        taxDetails: defaultGstOption.taxDetails,

        descriptionOptions: [],
        descriptionLoading: true,
        descriptionLookupError: "",
      };

      return { ...prev, items };
    });

    try {
      const res = await purchaseOrderApi.lookupItemDescription(selectedItemName);
      const descriptionOptions = normalizeItemDescriptionOptions(res);

      setForm((prev) => {
        const items = [...prev.items];
        const currentItem = items[index];

        if (!currentItem || currentItem.selectedStockName !== selectedItemName) {
          return prev;
        }

        items[index] = {
          ...currentItem,
          descriptionOptions,
          descriptionLoading: false,
          descriptionLookupError: descriptionOptions.length
            ? ""
            : "No saved descriptions found. You can type manually.",
        };

        return { ...prev, items };
      });
    } catch (err) {
      console.error("Failed to fetch item descriptions:", err);

      setForm((prev) => {
        const items = [...prev.items];
        const currentItem = items[index];

        if (!currentItem || currentItem.selectedStockName !== selectedItemName) {
          return prev;
        }

        items[index] = {
          ...currentItem,
          descriptionOptions: [],
          descriptionLoading: false,
          descriptionLookupError:
            "Could not load descriptions. You can type manually.",
        };

        return { ...prev, items };
      });
    }
  };

  const handleGstOptionChange = (index, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = items[index];

      const selectedStock = stocks.find(
        (stock) => stock.name === item.selectedStockName
      );

      const gstOptions = buildGstOptionsFromStock(selectedStock);

      const selectedOption =
        gstOptions.find((option) => option.value === value) || gstOptions[0];

      items[index] = {
        ...item,
        selectedGstOption: selectedOption.value,
        gstPercent: selectedOption.gstPercent,
        taxDetails: selectedOption.taxDetails,
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

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        poDate: new Date(form.poDate),
        items: form.items.map(
          ({
            selectedStockName,
            selectedGstOption,
            descriptionOptions,
            descriptionLoading,
            descriptionLookupError,
            ...item
          }) => {
            const qty = toNum(item.qty);
            const rate = toNum(item.rate);

            const calculated = calculateItemAmount({
              ...item,
              qty,
              rate,
            });

            return {
              ...item,
              itemDescription: String(item.itemDescription || "").trim(),
              // itemCode: undefined,
              qty,
              rate,
              gstPercent: toNum(item.gstPercent),
              taxDetails: calculated.taxDetails,
              amount: calculated.amount,
            };
          }
        ),
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
          <Input
            label="PO Number"
            value={form.poNumber}
            onChange={(e) => update("poNumber", e.target.value)}
            required
          />

          <Input
            label="PO Date"
            type="date"
            value={form.poDate}
            onChange={(e) => update("poDate", e.target.value)}
            required
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Ledger
            </label>

            <select
              value={selectedLedgerName}
              onChange={handleLedgerChange}
              disabled={ledgerLoading}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {ledgerLoading ? "Loading ledgers..." : "Select ledger"}
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

          <Input
            label="Vendor Name"
            value={form.vendorName}
            onChange={(e) => update("vendorName", e.target.value)}
            required
          />

          {/* <Input
            label="Vendor Code"
            value={form.vendorCode}
            onChange={(e) => update("vendorCode", e.target.value)}
          /> */}

          <Input
            label="Vendor Location"
            value={form.vendorLocation}
            onChange={(e) => update("vendorLocation", e.target.value)}
          />

          <Input
            label="Vendor Email"
            type="email"
            value={form.vendorEmail}
            onChange={(e) => update("vendorEmail", e.target.value)}
            required
          />

          <Input
            label="Vendor Phone"
            value={form.vendorPhone}
            maxLength={10}
            inputMode="numeric"
            onChange={(e) =>
              update(
                "vendorPhone",
                e.target.value.replace(/\D/g, "").slice(0, 10)
              )
            }
            required
          />
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Items</h2>

            {stockLoading ? (
              <p className="mt-1 text-xs text-slate-500">
                Fetching stock items from Tally...
              </p>
            ) : null}
          </div>

          <Button type="button" variant="secondary" onClick={addItem}>
            Add Item
          </Button>
        </div>

        <div className="space-y-4">
          {form.items.map((item, index) => {
            const selectedStock = stocks.find(
              (stock) => stock.name === item.selectedStockName
            );

            const gstOptions = buildGstOptionsFromStock(selectedStock);

            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Stock Item
                    </label>

                    <select
                      value={item.selectedStockName}
                      onChange={(e) => handleStockChange(index, e.target.value)}
                      disabled={stockLoading}
                      required
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">
                        {stockLoading ? "Loading items..." : "Select item"}
                      </option>

                      {!stockLoading &&
                        stocks.map((stock) => (
                          <option key={stock.name} value={stock.name}>
                            {stock.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <Input
                    label="Item Name"
                    value={item.itemName}
                    onChange={(e) =>
                      updateItem(index, "itemName", e.target.value)
                    }
                    required
                  />

                  <Input
                    label="HSN / SAC"
                    value={item.hsnCode}
                    onChange={(e) =>
                      updateItem(index, "hsnCode", e.target.value)
                    }
                  />

                  <Input
                    label="Unit"
                    value={item.unit}
                    onChange={(e) => updateItem(index, "unit", e.target.value)}
                  />

                  <Input
                    label="Quantity"
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateItem(index, "qty", e.target.value)}
                    required
                  />

                  <Input
                    label="Rate"
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(index, "rate", e.target.value)}
                    required
                  />

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      GST
                    </label>

                    <select
                      value={item.selectedGstOption || ""}
                      onChange={(e) =>
                        handleGstOptionChange(index, e.target.value)
                      }
                      disabled={!item.selectedStockName}
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">
                        {item.selectedStockName
                          ? "Select GST"
                          : "Select item first"}
                      </option>

                      {gstOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

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
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Description
                  </label>

                  <input
                    list={`item-description-options-${index}`}
                    value={item.itemDescription}
                    onChange={(e) =>
                      updateItem(index, "itemDescription", e.target.value)
                    }
                    disabled={!item.selectedStockName}
                    required
                    placeholder={
                      !item.selectedStockName
                        ? "Select stock item first"
                        : item.descriptionLoading
                        ? "Loading descriptions..."
                        : "Select description or type manually"
                    }
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />

                  <datalist id={`item-description-options-${index}`}>
                    {(item.descriptionOptions || []).map((description) => (
                      <option key={description} value={description} />
                    ))}
                  </datalist>

                  {item.descriptionLoading ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Fetching descriptions for selected item...
                    </p>
                  ) : item.descriptionLookupError ? (
                    <p className="mt-1 text-xs text-amber-600">
                      {item.descriptionLookupError}
                    </p>
                  ) : item.descriptionOptions?.length ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Select from dropdown or type your own description.
                    </p>
                  ) : null}
                </div>

                {Array.isArray(item.taxDetails) && item.taxDetails.length > 0 ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">
                      Selected GST:
                    </span>{" "}
                    {item.taxDetails
                      .map((tax) => `${tax.chargeName} ${tax.chargeValue}%`)
                      .join(" + ")}
                  </div>
                ) : item.selectedGstOption === "NO_GST" ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">
                      Selected GST:
                    </span>{" "}
                    No GST
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/purchase-orders")}
        >
          Cancel
        </Button>

        <Button type="submit" disabled={loading}>
          {loading ? "Saving and Sending..." : "Save PO & Send to Vendor"}
        </Button>
      </div>
    </form>
  );
}