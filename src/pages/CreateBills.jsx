import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    BadgeCheck,
    CheckCircle2,
    FileText,
    Link2,
    PackageCheck,
    ReceiptText,
    RefreshCcw,
    Save,
    ShoppingCart,
    Truck,
} from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { inventoryApi, tallyApi } from "../api/api";
import { currency } from "../utils/format";

const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BASE_URL ||
    "http://localhost:5000/api";

/*
  Change these endpoint names only if your backend route names are different.
*/
const PURCHASE_BILL_CREATE_ENDPOINT = "/bills/purchase";
const SALES_BILL_CREATE_ENDPOINT = "/bills/sales";

const todayInput = () => new Date().toISOString().slice(0, 10);

const toNum = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

const getId = (value) => value?._id || value?.id || "";

const formatQty = (qty, unit) => {
    return `${toNum(qty)} ${unit || ""}`.trim();
};

const getItemName = (item) => {
    return (
        item?.itemName ||
        item?.stockItemName ||
        item?.itemDescription ||
        item?.name ||
        "Unnamed Item"
    );
};

const getItemDescription = (item) => {
    return (
        item?.itemDescription ||
        item?.description ||
        item?.techSpec ||
        item?.hsnDescription ||
        item?.itemName ||
        ""
    );
};

const getAvailableQty = (item) => {
    return toNum(
        item?.availableQuantity ||
        item?.availableQty ||
        item?.currentStock ||
        item?.stockQty ||
        item?.quantity ||
        item?.qty
    );
};

const getPurchaseRate = (item) => {
    return toNum(item?.rate || item?.purchaseRate || item?.lastPurchaseRate || 0);
};

const getSaleRate = (item) => {
    return toNum(
        item?.saleRate ||
        item?.salesRate ||
        item?.sellingRate ||
        item?.rate ||
        item?.purchaseRate ||
        0
    );
};

const createEmptyPurchaseItem = () => ({
    inventoryId: "",
    quantity: 1,
    rate: 0,
    gstPercent: 0,
    selectedGstOption: "",
    description: "",
});

const createInitialPurchaseForm = () => {
    const date = todayInput();

    return {
        voucherDate: date,
        voucherNumber: "",

        supplierInvoiceNumber: "",
        supplierInvoiceDate: date,

        partyLedgerName: "",
        purchaseLedgerName: "PURCHASE SERVICE",

        roundOffRequired: false,
        roundOffLedgerName: "Round Off",
        roundOffDecimals: 0,

        receiptNoteNo: "",
        receiptDocNo: "",
        receiptDate: date,
        dispatchedThrough: "",
        destination: "",
        carrierName: "",
        billLrNo: "",
        billLrDate: date,
        motorVehicleNo: "",

        remarks: "",
    };
};

const createInitialSalesForm = () => {
    const date = todayInput();

    return {
        salesInvoiceNumber: "",
        salesInvoiceDate: date,

        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerGstin: "",
        billingAddress: "",
        shippingAddress: "",

        customerLedgerName: "",
        salesLedgerName: "SALES",

        destination: "",

        roundOffRequired: false,
        roundOffLedgerName: "Round Off",
        roundOffDecimals: 0,

        dispatchedThrough: "",
        carrierName: "",
        billLrNo: "",
        billLrDate: date,
        motorVehicleNo: "",

        remarks: "",
    };
};

const buildGstOptionsFromStock = (stock) => {
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

const getDefaultGstOption = (stock) => {
    const options = buildGstOptionsFromStock(stock);

    return (
        options.find((option) => option.value === "CGST_SGST") ||
        options.find((option) => option.value === "IGST") ||
        options.find((option) => option.value === "NO_GST") ||
        options[0]
    );
};

const calculateBillItemAmount = (item) => {
    const qty = toNum(item.quantity);
    const rate = toNum(item.rate);
    const gstPercent = toNum(item.gstPercent);

    const basic = qty * rate;
    const gstAmount = (basic * gstPercent) / 100;
    const total = basic + gstAmount;

    return {
        basic,
        taxable: basic,
        igst: gstAmount,
        cgst: 0,
        sgst: 0,
        totalTax: gstAmount,
        total,
    };
};

const calculateSalesItemAmount = (item) => {
    const qty = toNum(item.quantity);
    const rate = toNum(item.saleRate);
    const gstPercent = toNum(item.gstPercent);
    const discountPercent = toNum(item.discountPercent);

    const basic = qty * rate;
    const discountAmount = (basic * discountPercent) / 100;
    const taxable = basic - discountAmount;
    const gstAmount = (taxable * gstPercent) / 100;
    const total = taxable + gstAmount;

    return {
        basic,
        discountAmount,
        taxable,
        igst: gstAmount,
        cgst: 0,
        sgst: 0,
        totalTax: gstAmount,
        total,
    };
};

const calculateSummary = (items, calculator) => {
    return items.reduce(
        (acc, item) => {
            const amount = calculator(item);

            acc.basic += amount.basic;
            acc.discount += amount.discountAmount || 0;
            acc.igst += amount.igst;
            acc.cgst += amount.cgst;
            acc.sgst += amount.sgst;
            acc.totalTax += amount.totalTax;
            acc.total += amount.total;

            return acc;
        },
        {
            basic: 0,
            discount: 0,
            otherCharges: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            totalTax: 0,
            total: 0,
        }
    );
};

const apiRequest = async (path, options = {}) => {
    const token = localStorage.getItem("session_token");

    const res = await fetch(`${API_BASE}${path}`, {
        method: options.method || "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
        throw new Error(data?.message || "Something went wrong.");
    }

    return data;
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

function SelectField({ label, value, onChange, children, required, disabled }) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
                {label}
                {required ? <span className="ml-1 text-red-500">*</span> : null}
            </label>

            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
                {children}
            </select>
        </div>
    );
}

function TextAreaField({ label, value, onChange, placeholder }) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
                {label}
            </label>

            <textarea
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
        </div>
    );
}

function StepButton({ active, done, icon: Icon, title, subtitle, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-2xl border p-4 text-left transition ${active
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white/15" : "bg-slate-100"
                        }`}
                >
                    {done ? (
                        <CheckCircle2 size={20} className="text-emerald-500" />
                    ) : (
                        <Icon size={20} />
                    )}
                </div>

                <div>
                    <p className="font-semibold">{title}</p>
                    <p
                        className={`mt-1 text-xs ${active ? "text-white/70" : "text-slate-500"
                            }`}
                    >
                        {subtitle}
                    </p>
                </div>
            </div>
        </button>
    );
}

export default function CreateBills() {
    const navigate = useNavigate();

    const [activeStep, setActiveStep] = useState("purchase");

    const [inventory, setInventory] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(false);

    const [ledgers, setLedgers] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    const [selectedSupplierLedgerName, setSelectedSupplierLedgerName] =
        useState("");
    const [selectedCustomerLedgerName, setSelectedCustomerLedgerName] =
        useState("");

    const [purchaseForm, setPurchaseForm] = useState(() =>
        createInitialPurchaseForm()
    );

    const [salesForm, setSalesForm] = useState(() => createInitialSalesForm());

    const [purchaseItems, setPurchaseItems] = useState([
        createEmptyPurchaseItem(),
    ]);

    const [salesItems, setSalesItems] = useState([]);

    const [createdPurchaseBill, setCreatedPurchaseBill] = useState(null);

    const [message, setMessage] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    const inventoryMap = useMemo(() => {
        return new Map(inventory.map((item) => [getId(item), item]));
    }, [inventory]);

    const selectedInventoryIds = useMemo(() => {
        const map = new Map();

        purchaseItems.forEach((item, index) => {
            if (!item.inventoryId) return;
            map.set(item.inventoryId, index);
        });

        return map;
    }, [purchaseItems]);

    const inventorySummary = useMemo(() => {
        return inventory.reduce(
            (acc, item) => {
                acc.available += getAvailableQty(item);
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

    const purchaseSummary = useMemo(() => {
        return calculateSummary(purchaseItems, calculateBillItemAmount);
    }, [purchaseItems]);

    const salesSummary = useMemo(() => {
        return calculateSummary(salesItems, calculateSalesItemAmount);
    }, [salesItems]);

    const getDropdownOptions = (currentIndex) => {
        return inventory
            .filter((stock) => {
                const stockId = getId(stock);
                const selectedIndex = selectedInventoryIds.get(stockId);

                return selectedIndex === undefined || selectedIndex === currentIndex;
            })
            .sort((a, b) => getItemName(a).localeCompare(getItemName(b)));
    };

    useEffect(() => {
        const fetchInventory = async () => {
            setInventoryLoading(true);

            try {
                const res = await inventoryApi.list({
                    page: 1,
                    pageSize: 500,
                });

                setInventory(Array.isArray(res?.data) ? res.data : []);
            } catch (err) {
                setMessage(err.message || "Failed to fetch inventory.");
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

    const updatePurchaseForm = (key, value) => {
        setPurchaseForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const updateSalesForm = (key, value) => {
        setSalesForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const updatePurchaseItem = (index, key, value) => {
        setPurchaseItems((prev) => {
            const items = [...prev];

            items[index] = {
                ...items[index],
                [key]: value,
            };

            return items;
        });
    };

    const updateSalesItem = (index, key, value) => {
        setSalesItems((prev) => {
            const items = [...prev];

            items[index] = {
                ...items[index],
                [key]: value,
            };

            return items;
        });
    };

    const handleSupplierLedgerChange = (e) => {
        const ledgerName = e.target.value;
        setSelectedSupplierLedgerName(ledgerName);

        const selectedLedger = ledgers.find((ledger) => ledger.name === ledgerName);

        setPurchaseForm((prev) => ({
            ...prev,
            partyLedgerName: selectedLedger?.name || ledgerName || "",
        }));
    };

    const handleCustomerLedgerChange = (e) => {
        const ledgerName = e.target.value;
        setSelectedCustomerLedgerName(ledgerName);

        const selectedLedger = ledgers.find((ledger) => ledger.name === ledgerName);

        if (!selectedLedger) {
            setSalesForm((prev) => ({
                ...prev,
                customerLedgerName: "",
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

        setSalesForm((prev) => ({
            ...prev,
            customerLedgerName: selectedLedger.name || "",
            customerName: selectedLedger.mailingName || selectedLedger.name || "",
            customerEmail: selectedLedger.email || "",
            customerPhone: phone,
            customerGstin: gstin,
            billingAddress: address,
            shippingAddress: address,
        }));
    };

    const handlePurchaseInventoryChange = (index, inventoryId) => {
        const selectedStock = inventoryMap.get(inventoryId);

        setPurchaseItems((prev) => {
            const items = [...prev];

            if (!selectedStock) {
                items[index] = createEmptyPurchaseItem();
                return items;
            }

            const defaultGstOption = getDefaultGstOption(selectedStock);

            items[index] = {
                ...items[index],
                inventoryId: getId(selectedStock),
                quantity: 1,
                rate: getPurchaseRate(selectedStock),
                gstPercent: defaultGstOption.gstPercent,
                selectedGstOption: defaultGstOption.value,
                description: getItemDescription(selectedStock),
            };

            return items;
        });
    };

    const handlePurchaseGstOptionChange = (index, value) => {
        setPurchaseItems((prev) => {
            const items = [...prev];
            const item = items[index];
            const stock = inventoryMap.get(item.inventoryId);

            const gstOptions = buildGstOptionsFromStock(stock);
            const selectedOption =
                gstOptions.find((option) => option.value === value) || gstOptions[0];

            items[index] = {
                ...item,
                selectedGstOption: selectedOption.value,
                gstPercent: selectedOption.gstPercent,
            };

            return items;
        });
    };

    const handleSalesGstOptionChange = (index, value) => {
        setSalesItems((prev) => {
            const items = [...prev];
            const item = items[index];

            const gstOptions = buildGstOptionsFromStock({
                gstPercent: item.originalGstPercent,
            });

            const selectedOption =
                gstOptions.find((option) => option.value === value) || gstOptions[0];

            items[index] = {
                ...item,
                selectedGstOption: selectedOption.value,
                gstPercent: selectedOption.gstPercent,
            };

            return items;
        });
    };

    const addPurchaseItem = () => {
        setPurchaseItems((prev) => [...prev, createEmptyPurchaseItem()]);
    };

    const removePurchaseItem = (index) => {
        setPurchaseItems((prev) => {
            const next = prev.filter((_, i) => i !== index);
            return next.length ? next : [createEmptyPurchaseItem()];
        });
    };

    const removeSalesItem = (index) => {
        setSalesItems((prev) => prev.filter((_, i) => i !== index));
    };

    const setMaxPurchaseQuantity = (index) => {
        const item = purchaseItems[index];
        const stock = inventoryMap.get(item.inventoryId);

        if (!stock) return;

        updatePurchaseItem(index, "quantity", getAvailableQty(stock));
    };

    const setMaxSalesQuantity = (index) => {
        const item = salesItems[index];

        updateSalesItem(index, "quantity", toNum(item.purchaseQuantity));
    };

    const validatePurchase = () => {
        if (!purchaseForm.supplierInvoiceNumber.trim()) {
            return "Supplier Invoice No. is required.";
        }

        if (!purchaseForm.partyLedgerName.trim()) {
            return "Supplier / Party Ledger is required.";
        }

        if (!purchaseForm.purchaseLedgerName.trim()) {
            return "Purchase Ledger Name is required.";
        }

        if (
            purchaseForm.roundOffRequired &&
            !purchaseForm.roundOffLedgerName.trim()
        ) {
            return "Round Off Ledger is required when round off is enabled.";
        }

        if (!purchaseItems.length) {
            return "At least one item is required.";
        }

        const selected = new Set();

        for (const [index, item] of purchaseItems.entries()) {
            const stock = inventoryMap.get(item.inventoryId);

            if (!stock) {
                return `Please select item for row ${index + 1}.`;
            }

            if (selected.has(item.inventoryId)) {
                return `${getItemName(stock)} is already selected. Update quantity in existing row.`;
            }

            selected.add(item.inventoryId);

            if (toNum(item.quantity) <= 0) {
                return `Quantity must be greater than 0 for ${getItemName(stock)}.`;
            }

            if (toNum(item.rate) <= 0) {
                return `Purchase rate must be greater than 0 for ${getItemName(stock)}.`;
            }
        }

        return "";
    };

    const validateSales = () => {
        if (!createdPurchaseBill) {
            return "Create purchase bill first, then create sales bill.";
        }

        if (!salesForm.salesInvoiceNumber.trim()) {
            return "Sales Invoice No. is required.";
        }

        if (!salesForm.customerLedgerName.trim()) {
            return "Customer Ledger is required.";
        }

        if (!salesForm.salesLedgerName.trim()) {
            return "Sales Ledger Name is required.";
        }

        if (salesForm.roundOffRequired && !salesForm.roundOffLedgerName.trim()) {
            return "Round Off Ledger is required when round off is enabled.";
        }

        if (!salesItems.length) {
            return "At least one sales item is required.";
        }

        for (const [index, item] of salesItems.entries()) {
            if (toNum(item.quantity) <= 0) {
                return `Sales quantity must be greater than 0 for row ${index + 1}.`;
            }

            if (toNum(item.quantity) > toNum(item.purchaseQuantity)) {
                return `Sales quantity cannot be greater than purchase quantity for ${item.itemName}.`;
            }

            if (toNum(item.saleRate) <= 0) {
                return `Sales rate must be greater than 0 for ${item.itemName}.`;
            }
        }

        return "";
    };

    const buildPurchaseBillPayload = () => {
        const supplierInvoiceNumber = purchaseForm.supplierInvoiceNumber.trim();

        return {
            date: purchaseForm.voucherDate,
            voucherNumber: purchaseForm.voucherNumber.trim(),

            supplierInvoiceNumber,
            supplierInvoiceDate: purchaseForm.supplierInvoiceDate,
            referenceName: supplierInvoiceNumber,

            partyLedgerName: purchaseForm.partyLedgerName.trim(),
            purchaseLedgerName: purchaseForm.purchaseLedgerName.trim(),

            roundOffRequired: Boolean(purchaseForm.roundOffRequired),
            roundOffLedgerName: purchaseForm.roundOffLedgerName || "Round Off",
            roundOffDecimals: Number(purchaseForm.roundOffDecimals || 0),

            receiptDetails: {
                receiptNoteNo: purchaseForm.receiptNoteNo,
                receiptDate: purchaseForm.receiptDate,
                dispatchDocNo: purchaseForm.receiptDocNo,
                dispatchedThrough: purchaseForm.dispatchedThrough,
                destination: purchaseForm.destination,
                carrierName: purchaseForm.carrierName,
                billOfLadingNo: purchaseForm.billLrNo,
                billOfLadingDate: purchaseForm.billLrDate,
                motorVehicleNo: purchaseForm.motorVehicleNo,
            },

            items: purchaseItems.map(({ selectedGstOption, ...item }) => {
                const stock = inventoryMap.get(item.inventoryId);

                return {
                    inventoryId: item.inventoryId,

                    stockItemName: getItemName(stock),
                    itemName: getItemName(stock),

                    description: item.description,
                    itemDescription: item.description,
                    hsnDescription: stock?.hsnDescription || "",
                    techSpec: stock?.techSpec || "",

                    hsnCode: stock?.hsnCode || "",
                    make: stock?.make || "",

                    qty: toNum(item.quantity),
                    rate: toNum(item.rate),
                    gstPercent: toNum(item.gstPercent),
                    unit: stock?.unit || "NOS",

                    godownName: stock?.godownName || "Main Location",
                    batchName: stock?.batchName || "Primary Batch",

                    amount: calculateBillItemAmount(item),
                };
            }),

            amount: purchaseSummary,
            remarks: purchaseForm.remarks.trim(),
        };
    };

    const buildSalesItemsFromPurchase = () => {
        return purchaseItems.map((item, index) => {
            const stock = inventoryMap.get(item.inventoryId);
            const saleRate = getSaleRate(stock) || toNum(item.rate);
            const gstOptions = buildGstOptionsFromStock(stock);
            const defaultGstOption =
                gstOptions.find((option) => option.value === item.selectedGstOption) ||
                getDefaultGstOption(stock);

            return {
                sourcePurchaseItemIndex: index,
                inventoryId: item.inventoryId,

                itemName: getItemName(stock),
                stockItemName: getItemName(stock),
                description: item.description,
                itemDescription: item.description,

                hsnCode: stock?.hsnCode || "",
                hsnDescription: stock?.hsnDescription || "",
                techSpec: stock?.techSpec || "",
                make: stock?.make || "",

                purchaseQuantity: toNum(item.quantity),
                purchaseRate: toNum(item.rate),

                quantity: toNum(item.quantity),
                saleRate,
                discountPercent: 0,

                originalGstPercent: toNum(stock?.gstPercent),
                gstPercent: defaultGstOption.gstPercent,
                selectedGstOption: defaultGstOption.value,

                unit: stock?.unit || "NOS",
                godownName: stock?.godownName || "Main Location",
                batchName: stock?.batchName || "Primary Batch",
            };
        });
    };

    const buildSalesBillPayload = () => {
        return {
            purchaseBillId: getId(createdPurchaseBill),
            linkedSupplierInvoiceNumber:
                createdPurchaseBill?.supplierInvoiceNumber ||
                purchaseForm.supplierInvoiceNumber,

            date: salesForm.salesInvoiceDate,
            invoiceNumber: salesForm.salesInvoiceNumber.trim(),

            customerName: salesForm.customerName.trim(),
            customerEmail: salesForm.customerEmail.trim().toLowerCase(),
            customerPhone: salesForm.customerPhone.trim(),
            customerGstin: salesForm.customerGstin.trim(),
            billingAddress: salesForm.billingAddress.trim(),
            shippingAddress: salesForm.shippingAddress.trim(),

            partyLedgerName: salesForm.customerLedgerName.trim(),
            salesLedgerName: salesForm.salesLedgerName.trim(),

            destination: salesForm.destination,

            roundOffRequired: Boolean(salesForm.roundOffRequired),
            roundOffLedgerName: salesForm.roundOffLedgerName || "Round Off",
            roundOffDecimals: Number(salesForm.roundOffDecimals || 0),

            dispatchDetails: {
                dispatchedThrough: salesForm.dispatchedThrough,
                destination: salesForm.destination,
                carrierName: salesForm.carrierName,
                billOfLadingNo: salesForm.billLrNo,
                billOfLadingDate: salesForm.billLrDate,
                motorVehicleNo: salesForm.motorVehicleNo,
            },

            items: salesItems.map(({ selectedGstOption, originalGstPercent, ...item }) => ({
                inventoryId: item.inventoryId,

                stockItemName: item.stockItemName,
                itemName: item.itemName,

                description: item.description,
                itemDescription: item.itemDescription,
                hsnDescription: item.hsnDescription,
                techSpec: item.techSpec,

                hsnCode: item.hsnCode,
                make: item.make,

                purchaseQty: toNum(item.purchaseQuantity),
                purchaseRate: toNum(item.purchaseRate),

                qty: toNum(item.quantity),
                rate: toNum(item.saleRate),
                saleRate: toNum(item.saleRate),
                discountPercent: toNum(item.discountPercent),
                gstPercent: toNum(item.gstPercent),
                unit: item.unit || "NOS",

                godownName: item.godownName || "Main Location",
                batchName: item.batchName || "Primary Batch",

                amount: calculateSalesItemAmount(item),
            })),

            amount: salesSummary,
            remarks: salesForm.remarks.trim(),
        };
    };

    const createPurchaseBill = async () => {
        setMessage("");

        const validationError = validatePurchase();

        if (validationError) {
            setMessage(validationError);
            return;
        }

        setActionLoading(true);

        try {
            const payload = buildPurchaseBillPayload();

            const res = await tallyApi.moveToTally(payload);

            const savedBill =
                res.purchaseBill ||
                res.bill ||
                res.data ||
                {
                    ...payload,
                    _id: `local-${Date.now()}`,
                };

            setCreatedPurchaseBill(savedBill);
            setSalesItems(buildSalesItemsFromPurchase());
            setSalesForm(createInitialSalesForm());
            setSelectedCustomerLedgerName("");
            setActiveStep("sales");
            setMessage("Purchase bill created successfully. Now create sales bill.");
        } catch (err) {
            setMessage(err.message || "Failed to create purchase bill.");
        } finally {
            setActionLoading(false);
        }
    };

    const createSalesBill = async () => {
        setMessage("");

        const validationError = validateSales();

        if (validationError) {
            setMessage(validationError);
            return;
        }

        setActionLoading(true);

        try {
            const payload = buildSalesBillPayload();

            await apiRequest(SALES_BILL_CREATE_ENDPOINT, {
                method: "POST",
                body: payload,
            });

            setMessage("Sales bill created successfully.");
        } catch (err) {
            setMessage(err.message || "Failed to create sales bill.");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
                <div className="flex items-start gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="mt-1 shrink-0"
                    >
                        <ArrowLeft size={16} className="mr-2" />
                        Back
                    </Button>

                    <div>
                        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            Create Bills
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Select stock items from inventory, create purchase bill first,
                            then create linked sales bill.
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.reload()}
                >
                    <RefreshCcw size={16} className="mr-2" />
                    Refresh
                </Button>
            </div>

            {message ? (
                <Card className="border-slate-200 bg-slate-50 text-sm text-slate-700">
                    {message}
                </Card>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
                <StepButton
                    active={activeStep === "purchase"}
                    done={Boolean(createdPurchaseBill)}
                    icon={ReceiptText}
                    title="1. Purchase Bill"
                    subtitle="Select inventory item rows and fill supplier invoice details."
                    onClick={() => setActiveStep("purchase")}
                />

                <StepButton
                    active={activeStep === "sales"}
                    done={false}
                    icon={ShoppingCart}
                    title="2. Sales Bill"
                    subtitle="Create linked sales bill from purchase bill item rows."
                    onClick={() => setActiveStep("sales")}
                />
            </div>

            {activeStep === "purchase" ? (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-5">
                        <Card>
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                    <ReceiptText size={20} />
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Supplier Invoice & Ledger Details
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Fill supplier invoice and purchase ledger details before
                                        creating purchase bill.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <Input
                                    label="Voucher Date"
                                    type="date"
                                    value={purchaseForm.voucherDate}
                                    onChange={(e) =>
                                        updatePurchaseForm("voucherDate", e.target.value)
                                    }
                                />

                                <Input
                                    label="Voucher Number"
                                    value={purchaseForm.voucherNumber}
                                    onChange={(e) =>
                                        updatePurchaseForm("voucherNumber", e.target.value)
                                    }
                                    placeholder="Optional"
                                />

                                <Input
                                    label="Supplier Invoice No."
                                    value={purchaseForm.supplierInvoiceNumber}
                                    onChange={(e) =>
                                        updatePurchaseForm("supplierInvoiceNumber", e.target.value)
                                    }
                                    required
                                />

                                <Input
                                    label="Supplier Invoice Date"
                                    type="date"
                                    value={purchaseForm.supplierInvoiceDate}
                                    onChange={(e) =>
                                        updatePurchaseForm("supplierInvoiceDate", e.target.value)
                                    }
                                />

                                <SelectField
                                    label="Supplier / Party Ledger"
                                    value={selectedSupplierLedgerName}
                                    onChange={handleSupplierLedgerChange}
                                    disabled={ledgerLoading}
                                    required
                                >
                                    <option value="">
                                        {ledgerLoading
                                            ? "Loading ledgers..."
                                            : "Select supplier ledger"}
                                    </option>

                                    {!ledgerLoading &&
                                        ledgers.map((ledger) => (
                                            <option key={ledger.name} value={ledger.name}>
                                                {ledger.name}
                                            </option>
                                        ))}
                                </SelectField>

                                <Input
                                    label="Purchase Ledger Name"
                                    value={purchaseForm.purchaseLedgerName}
                                    onChange={(e) =>
                                        updatePurchaseForm("purchaseLedgerName", e.target.value)
                                    }
                                    required
                                />
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                                    <Truck size={20} />
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Receipt & Dispatch Details
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        These details will be sent with purchase bill payload.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <Input
                                    label="Receipt Note No(s)"
                                    value={purchaseForm.receiptNoteNo}
                                    onChange={(e) =>
                                        updatePurchaseForm("receiptNoteNo", e.target.value)
                                    }
                                />

                                <Input
                                    label="Receipt Doc No."
                                    value={purchaseForm.receiptDocNo}
                                    onChange={(e) =>
                                        updatePurchaseForm("receiptDocNo", e.target.value)
                                    }
                                />

                                <Input
                                    label="Receipt Date"
                                    type="date"
                                    value={purchaseForm.receiptDate}
                                    onChange={(e) =>
                                        updatePurchaseForm("receiptDate", e.target.value)
                                    }
                                />

                                <Input
                                    label="Dispatched Through"
                                    value={purchaseForm.dispatchedThrough}
                                    onChange={(e) =>
                                        updatePurchaseForm("dispatchedThrough", e.target.value)
                                    }
                                />

                                <Input
                                    label="Destination"
                                    value={purchaseForm.destination}
                                    onChange={(e) =>
                                        updatePurchaseForm("destination", e.target.value)
                                    }
                                />

                                <Input
                                    label="Carrier Name / Agent"
                                    value={purchaseForm.carrierName}
                                    onChange={(e) =>
                                        updatePurchaseForm("carrierName", e.target.value)
                                    }
                                />

                                <Input
                                    label="Bill of Lading / LR-RR No."
                                    value={purchaseForm.billLrNo}
                                    onChange={(e) =>
                                        updatePurchaseForm("billLrNo", e.target.value)
                                    }
                                />

                                <Input
                                    label="Bill of Lading / LR-RR Date"
                                    type="date"
                                    value={purchaseForm.billLrDate}
                                    onChange={(e) =>
                                        updatePurchaseForm("billLrDate", e.target.value)
                                    }
                                />

                                <Input
                                    label="Motor Vehicle No."
                                    value={purchaseForm.motorVehicleNo}
                                    onChange={(e) =>
                                        updatePurchaseForm("motorVehicleNo", e.target.value)
                                    }
                                />
                            </div>
                        </Card>

                        <Card>
                            <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Purchase Bill Items
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Select item row-wise. Description, rate, GST and stock
                                        details auto-fill from inventory.
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
                                            <p className="text-slate-500">Available</p>
                                            <p className="mt-1 font-bold text-emerald-700">
                                                {inventorySummary.available}
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-white p-2">
                                            <p className="text-slate-500">Reserved</p>
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

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={addPurchaseItem}
                                    >
                                        Add Item
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {purchaseItems.map((item, index) => {
                                    const stock = inventoryMap.get(item.inventoryId);
                                    const amount = calculateBillItemAmount(item);

                                    const availableQty = getAvailableQty(stock);
                                    const selectedQty = toNum(item.quantity);
                                    const remainingAfterBill = stock
                                        ? availableQty - selectedQty
                                        : 0;
                                    const overSelected = stock && remainingAfterBill < 0;

                                    const dropdownOptions = getDropdownOptions(index);
                                    const gstOptions = buildGstOptionsFromStock(stock);

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
                                                        Select item from inventory. Details will auto-fill
                                                        after selection.
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
                                                        Available After This Bill:{" "}
                                                        {formatQty(remainingAfterBill, stock.unit)}
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
                                                        Item / Purchase Price
                                                        <span className="ml-1 text-red-500">*</span>
                                                    </label>

                                                    <select
                                                        value={item.inventoryId}
                                                        onChange={(e) =>
                                                            handlePurchaseInventoryChange(
                                                                index,
                                                                e.target.value
                                                            )
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

                                                        {dropdownOptions.map((stockOption) => (
                                                            <option
                                                                key={getId(stockOption)}
                                                                value={getId(stockOption)}
                                                            >
                                                                {getItemName(stockOption)} — Purchase:{" "}
                                                                {currency(getPurchaseRate(stockOption))} + GST{" "}
                                                                {toNum(stockOption.gstPercent)}% — Available:{" "}
                                                                {formatQty(
                                                                    getAvailableQty(stockOption),
                                                                    stockOption.unit
                                                                )}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Same inventory item will not appear again after you
                                                        select it.
                                                    </p>
                                                </div>

                                                <ReadOnlyField
                                                    label="Available Quantity"
                                                    value={
                                                        stock
                                                            ? formatQty(getAvailableQty(stock), stock.unit)
                                                            : ""
                                                    }
                                                />

                                                <ReadOnlyField
                                                    label="Maximum Qty Allowed"
                                                    value={
                                                        stock
                                                            ? formatQty(getAvailableQty(stock), stock.unit)
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
                                                            updatePurchaseItem(index, "quantity", value);
                                                        }}
                                                        required
                                                    />

                                                    {stock ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setMaxPurchaseQuantity(index)}
                                                            className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                                                        >
                                                            Use Maximum Available
                                                        </button>
                                                    ) : null}
                                                </div>

                                                <Input
                                                    label="Purchase Rate"
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={(e) =>
                                                        updatePurchaseItem(index, "rate", e.target.value)
                                                    }
                                                    required
                                                />

                                                <div>
                                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                                        Purchase GST
                                                    </label>

                                                    <select
                                                        value={item.selectedGstOption || ""}
                                                        onChange={(e) =>
                                                            handlePurchaseGstOptionChange(
                                                                index,
                                                                e.target.value
                                                            )
                                                        }
                                                        disabled={!item.inventoryId}
                                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                                                    >
                                                        <option value="">
                                                            {item.inventoryId
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

                                                <ReadOnlyField
                                                    label="GST Amount"
                                                    value={stock ? currency(amount.totalTax) : ""}
                                                />

                                                <ReadOnlyField
                                                    label="Line Total"
                                                    value={stock ? currency(amount.total) : ""}
                                                />

                                                <div className="md:col-span-2">
                                                    <Input
                                                        label="Description"
                                                        value={item.description || ""}
                                                        onChange={(e) =>
                                                            updatePurchaseItem(
                                                                index,
                                                                "description",
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>

                                                <div className="md:col-span-4 flex justify-end">
                                                    <Button
                                                        type="button"
                                                        variant="danger"
                                                        disabled={purchaseItems.length === 1}
                                                        onClick={() => removePurchaseItem(index)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>

                                            {stock ? (
                                                <div className="mt-4 space-y-3">
                                                    <div className="grid gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 md:grid-cols-5">
                                                        <p>
                                                            <span className="font-semibold">
                                                                Total Purchased:
                                                            </span>{" "}
                                                            {formatQty(stock.purchasedQuantity, stock.unit)}
                                                        </p>

                                                        <p>
                                                            <span className="font-semibold">
                                                                Available Now:
                                                            </span>{" "}
                                                            {formatQty(getAvailableQty(stock), stock.unit)}
                                                        </p>

                                                        <p>
                                                            <span className="font-semibold">Reserved:</span>{" "}
                                                            {formatQty(stock.reservedQuantity, stock.unit)}
                                                        </p>

                                                        <p>
                                                            <span className="font-semibold">Sold:</span>{" "}
                                                            {formatQty(stock.soldQuantity, stock.unit)}
                                                        </p>

                                                        <p>
                                                            <span className="font-semibold">Selected:</span>{" "}
                                                            {formatQty(selectedQty, stock.unit)}
                                                        </p>
                                                    </div>

                                                    {overSelected ? (
                                                        <p className="text-xs font-semibold text-red-600">
                                                            You selected more than available stock.
                                                        </p>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
                                                    Select an item first. Rate, GST and stock details will
                                                    appear here.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-5 xl:sticky xl:top-4 xl:self-start">
                        <Card>
                            <h3 className="text-base font-semibold text-slate-900">
                                Purchase Summary
                            </h3>

                            <div className="mt-4 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Items</span>
                                    <span className="font-semibold">{purchaseItems.length}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">Basic</span>
                                    <span className="font-semibold">
                                        {currency(purchaseSummary.basic)}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">Tax</span>
                                    <span className="font-semibold">
                                        {currency(purchaseSummary.totalTax)}
                                    </span>
                                </div>

                                <div className="border-t border-slate-200 pt-3">
                                    <div className="flex justify-between text-base">
                                        <span className="font-semibold text-slate-900">Total</span>
                                        <span className="font-bold text-slate-900">
                                            {currency(purchaseSummary.total)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 space-y-4">
                                <SelectField
                                    label="Round Off Required?"
                                    value={purchaseForm.roundOffRequired ? "yes" : "no"}
                                    onChange={(e) =>
                                        updatePurchaseForm(
                                            "roundOffRequired",
                                            e.target.value === "yes"
                                        )
                                    }
                                >
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                </SelectField>

                                {purchaseForm.roundOffRequired ? (
                                    <div className="grid gap-4">
                                        <Input
                                            label="Round Off Ledger"
                                            value={purchaseForm.roundOffLedgerName}
                                            onChange={(e) =>
                                                updatePurchaseForm(
                                                    "roundOffLedgerName",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <Input
                                            label="Round Off Decimals"
                                            type="number"
                                            value={purchaseForm.roundOffDecimals}
                                            onChange={(e) =>
                                                updatePurchaseForm(
                                                    "roundOffDecimals",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                ) : null}

                                <TextAreaField
                                    label="Remarks"
                                    value={purchaseForm.remarks}
                                    onChange={(e) =>
                                        updatePurchaseForm("remarks", e.target.value)
                                    }
                                    placeholder="Optional purchase bill remarks..."
                                />

                                <Button
                                    type="button"
                                    onClick={createPurchaseBill}
                                    disabled={actionLoading}
                                    className="w-full justify-center"
                                >
                                    <Save size={16} className="mr-2" />
                                    {actionLoading ? "Creating..." : "Create Purchase Bill"}
                                </Button>
                            </div>
                        </Card>

                        {createdPurchaseBill ? (
                            <Card className="border-emerald-200 bg-emerald-50">
                                <div className="flex items-start gap-3">
                                    <BadgeCheck className="mt-0.5 text-emerald-700" size={20} />
                                    <div>
                                        <p className="font-semibold text-emerald-900">
                                            Purchase bill created
                                        </p>
                                        <p className="mt-1 text-sm text-emerald-700">
                                            Sales bill is ready with linked purchase items.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        ) : null}
                    </div>
                </div>
            ) : (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-5">
                        {!createdPurchaseBill ? (
                            <Card className="border-amber-200 bg-amber-50 text-sm text-amber-800">
                                Create purchase bill first. Sales bill will be generated from
                                purchase bill item rows.
                            </Card>
                        ) : null}

                        <Card>
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                    <Link2 size={20} />
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Linked Purchase Bill
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Sales bill is connected with the purchase bill created in
                                        step one.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                                <p>
                                    <span className="text-slate-500">Supplier Invoice:</span>{" "}
                                    <span className="font-semibold text-slate-900">
                                        {purchaseForm.supplierInvoiceNumber || "-"}
                                    </span>
                                </p>

                                <p>
                                    <span className="text-slate-500">Purchase Items:</span>{" "}
                                    <span className="font-semibold text-slate-900">
                                        {purchaseItems.length}
                                    </span>
                                </p>

                                <p>
                                    <span className="text-slate-500">Purchase Total:</span>{" "}
                                    <span className="font-semibold text-slate-900">
                                        {currency(purchaseSummary.total)}
                                    </span>
                                </p>

                                <p>
                                    <span className="text-slate-500">Sales Items:</span>{" "}
                                    <span className="font-semibold text-slate-900">
                                        {salesItems.length}
                                    </span>
                                </p>
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                    <ShoppingCart size={20} />
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Sales Bill Details
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Select customer ledger and complete sales invoice details.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <Input
                                    label="Sales Invoice No."
                                    value={salesForm.salesInvoiceNumber}
                                    onChange={(e) =>
                                        updateSalesForm("salesInvoiceNumber", e.target.value)
                                    }
                                    required
                                />

                                <Input
                                    label="Sales Invoice Date"
                                    type="date"
                                    value={salesForm.salesInvoiceDate}
                                    onChange={(e) =>
                                        updateSalesForm("salesInvoiceDate", e.target.value)
                                    }
                                />

                                <SelectField
                                    label="Customer Ledger"
                                    value={selectedCustomerLedgerName}
                                    onChange={handleCustomerLedgerChange}
                                    disabled={ledgerLoading}
                                    required
                                >
                                    <option value="">
                                        {ledgerLoading
                                            ? "Loading ledgers..."
                                            : "Select customer ledger"}
                                    </option>

                                    {!ledgerLoading &&
                                        ledgers.map((ledger) => (
                                            <option key={ledger.name} value={ledger.name}>
                                                {ledger.name}
                                            </option>
                                        ))}
                                </SelectField>

                                <Input label="Customer Name" value={salesForm.customerName} disabled />

                                <Input
                                    label="Customer Email"
                                    type="email"
                                    value={salesForm.customerEmail}
                                    onChange={(e) =>
                                        updateSalesForm("customerEmail", e.target.value)
                                    }
                                />

                                <Input
                                    label="Customer Phone"
                                    type="tel"
                                    maxLength={10}
                                    value={salesForm.customerPhone}
                                    onChange={(e) =>
                                        updateSalesForm(
                                            "customerPhone",
                                            e.target.value.replace(/\D/g, "").slice(0, 10)
                                        )
                                    }
                                />

                                <Input
                                    label="Customer GSTIN"
                                    value={salesForm.customerGstin}
                                    onChange={(e) =>
                                        updateSalesForm("customerGstin", e.target.value)
                                    }
                                />

                                <Input
                                    label="Sales Ledger Name"
                                    value={salesForm.salesLedgerName}
                                    onChange={(e) =>
                                        updateSalesForm("salesLedgerName", e.target.value)
                                    }
                                    required
                                />

                                <Input
                                    label="Destination"
                                    value={salesForm.destination}
                                    onChange={(e) =>
                                        updateSalesForm("destination", e.target.value)
                                    }
                                />

                                <div className="md:col-span-3">
                                    <Input
                                        label="Billing Address"
                                        value={salesForm.billingAddress}
                                        onChange={(e) =>
                                            updateSalesForm("billingAddress", e.target.value)
                                        }
                                    />
                                </div>

                                <div className="md:col-span-3">
                                    <Input
                                        label="Shipping Address"
                                        value={salesForm.shippingAddress}
                                        onChange={(e) =>
                                            updateSalesForm("shippingAddress", e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                                    <Truck size={20} />
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Sales Dispatch Details
                                    </h2>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <Input
                                    label="Dispatched Through"
                                    value={salesForm.dispatchedThrough}
                                    onChange={(e) =>
                                        updateSalesForm("dispatchedThrough", e.target.value)
                                    }
                                />

                                <Input
                                    label="Carrier Name / Agent"
                                    value={salesForm.carrierName}
                                    onChange={(e) =>
                                        updateSalesForm("carrierName", e.target.value)
                                    }
                                />

                                <Input
                                    label="Bill of Lading / LR-RR No."
                                    value={salesForm.billLrNo}
                                    onChange={(e) => updateSalesForm("billLrNo", e.target.value)}
                                />

                                <Input
                                    label="Bill of Lading / LR-RR Date"
                                    type="date"
                                    value={salesForm.billLrDate}
                                    onChange={(e) =>
                                        updateSalesForm("billLrDate", e.target.value)
                                    }
                                />

                                <Input
                                    label="Motor Vehicle No."
                                    value={salesForm.motorVehicleNo}
                                    onChange={(e) =>
                                        updateSalesForm("motorVehicleNo", e.target.value)
                                    }
                                />
                            </div>
                        </Card>

                        <Card>
                            <div className="mb-4 flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                                    <PackageCheck size={20} />
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Sales Bill Items
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Items are linked from purchase bill. You can update sales
                                        quantity, rate, GST and discount.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {salesItems.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                        No sales item found. Create purchase bill first.
                                    </div>
                                ) : (
                                    salesItems.map((item, index) => {
                                        const amount = calculateSalesItemAmount(item);
                                        const overSelected =
                                            toNum(item.quantity) > toNum(item.purchaseQuantity);
                                        const remainingAfterSale =
                                            toNum(item.purchaseQuantity) - toNum(item.quantity);
                                        const gstOptions = buildGstOptionsFromStock({
                                            gstPercent: item.originalGstPercent,
                                        });

                                        return (
                                            <div
                                                key={`${item.inventoryId}-${index}`}
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
                                                            Item #{index + 1}: {item.itemName}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {item.description || "-"}
                                                        </p>
                                                    </div>

                                                    <div
                                                        className={[
                                                            "rounded-full px-3 py-1 text-xs font-semibold",
                                                            overSelected
                                                                ? "bg-red-100 text-red-700"
                                                                : "bg-emerald-50 text-emerald-700",
                                                        ].join(" ")}
                                                    >
                                                        Remaining After Sale:{" "}
                                                        {formatQty(remainingAfterSale, item.unit)}
                                                    </div>
                                                </div>

                                                <div className="grid gap-4 md:grid-cols-4">
                                                    <ReadOnlyField label="HSN" value={item.hsnCode} />

                                                    <ReadOnlyField
                                                        label="Purchase Quantity"
                                                        value={formatQty(item.purchaseQuantity, item.unit)}
                                                    />

                                                    <ReadOnlyField
                                                        label="Purchase Rate"
                                                        value={currency(item.purchaseRate)}
                                                    />

                                                    <ReadOnlyField
                                                        label="Purchase Value"
                                                        value={currency(
                                                            toNum(item.purchaseQuantity) *
                                                            toNum(item.purchaseRate)
                                                        )}
                                                    />

                                                    <div>
                                                        <Input
                                                            label="Sales Quantity"
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => {
                                                                const value = Math.max(
                                                                    0,
                                                                    Number(e.target.value)
                                                                );
                                                                updateSalesItem(index, "quantity", value);
                                                            }}
                                                            required
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() => setMaxSalesQuantity(index)}
                                                            className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                                                        >
                                                            Use Purchase Quantity
                                                        </button>
                                                    </div>

                                                    <Input
                                                        label="Sales Rate"
                                                        type="number"
                                                        value={item.saleRate}
                                                        onChange={(e) =>
                                                            updateSalesItem(index, "saleRate", e.target.value)
                                                        }
                                                        required
                                                    />

                                                    <div>
                                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                                            Sales GST
                                                        </label>

                                                        <select
                                                            value={item.selectedGstOption || ""}
                                                            onChange={(e) =>
                                                                handleSalesGstOptionChange(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                                                        >
                                                            {gstOptions.map((option) => (
                                                                <option
                                                                    key={option.value}
                                                                    value={option.value}
                                                                >
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
                                                            updateSalesItem(
                                                                index,
                                                                "discountPercent",
                                                                e.target.value
                                                            )
                                                        }
                                                    />

                                                    <ReadOnlyField
                                                        label="GST Amount"
                                                        value={currency(amount.totalTax)}
                                                    />

                                                    <ReadOnlyField
                                                        label="Line Total"
                                                        value={currency(amount.total)}
                                                    />

                                                    <div className="md:col-span-2">
                                                        <Input
                                                            label="Description"
                                                            value={item.description || ""}
                                                            onChange={(e) =>
                                                                updateSalesItem(
                                                                    index,
                                                                    "description",
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <div className="md:col-span-4 flex justify-end">
                                                        <Button
                                                            type="button"
                                                            variant="danger"
                                                            disabled={salesItems.length === 1}
                                                            onClick={() => removeSalesItem(index)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>

                                                {overSelected ? (
                                                    <p className="mt-3 text-xs font-semibold text-red-600">
                                                        Sales quantity cannot be greater than purchase
                                                        quantity.
                                                    </p>
                                                ) : null}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-5 xl:sticky xl:top-4 xl:self-start">
                        <Card>
                            <h3 className="text-base font-semibold text-slate-900">
                                Sales Summary
                            </h3>

                            <div className="mt-4 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Items</span>
                                    <span className="font-semibold">{salesItems.length}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">Basic</span>
                                    <span className="font-semibold">
                                        {currency(salesSummary.basic)}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">Discount</span>
                                    <span className="font-semibold">
                                        {currency(salesSummary.discount)}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">Tax</span>
                                    <span className="font-semibold">
                                        {currency(salesSummary.totalTax)}
                                    </span>
                                </div>

                                <div className="border-t border-slate-200 pt-3">
                                    <div className="flex justify-between text-base">
                                        <span className="font-semibold text-slate-900">Total</span>
                                        <span className="font-bold text-slate-900">
                                            {currency(salesSummary.total)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 space-y-4">
                                <SelectField
                                    label="Round Off Required?"
                                    value={salesForm.roundOffRequired ? "yes" : "no"}
                                    onChange={(e) =>
                                        updateSalesForm(
                                            "roundOffRequired",
                                            e.target.value === "yes"
                                        )
                                    }
                                >
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                </SelectField>

                                {salesForm.roundOffRequired ? (
                                    <div className="grid gap-4">
                                        <Input
                                            label="Round Off Ledger"
                                            value={salesForm.roundOffLedgerName}
                                            onChange={(e) =>
                                                updateSalesForm("roundOffLedgerName", e.target.value)
                                            }
                                        />

                                        <Input
                                            label="Round Off Decimals"
                                            type="number"
                                            value={salesForm.roundOffDecimals}
                                            onChange={(e) =>
                                                updateSalesForm("roundOffDecimals", e.target.value)
                                            }
                                        />
                                    </div>
                                ) : null}

                                <TextAreaField
                                    label="Remarks"
                                    value={salesForm.remarks}
                                    onChange={(e) => updateSalesForm("remarks", e.target.value)}
                                    placeholder="Optional sales bill remarks..."
                                />

                                <Button
                                    type="button"
                                    onClick={createSalesBill}
                                    disabled={actionLoading || !createdPurchaseBill}
                                    className="w-full justify-center"
                                >
                                    <Save size={16} className="mr-2" />
                                    {actionLoading ? "Creating..." : "Create Sales Bill"}
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}