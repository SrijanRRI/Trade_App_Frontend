import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Pencil, MoveRight } from "lucide-react";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Modal from "../components/Modal";
import TableWrap from "../components/TableWrap";
import { purchaseOrderApi, tallyApi } from "../api/api";
import { currency, formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

const toDateInput = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

const calculateItemAmount = (item) => {
  const qty = Number(item.qty || 0);
  const rate = Number(item.rate || 0);
  const gstPercent = Number(item.gstPercent || 0);

  const basic = qty * rate;
  const gstAmount = (basic * gstPercent) / 100;
  const total = basic + gstAmount;

  return {
    basic,
    taxable: basic,
    igst: gstAmount,
    cgst: 0,
    sgst: 0,
    total,
  };
};

const calculatePoAmount = (items) => {
  const amount = {
    basic: 0,
    discount: 0,
    totalTax: 0,
    otherCharges: 0,
    igst: 0,
    cgst: 0,
    sgst: 0,
    total: 0,
  };

  for (const item of items) {
    amount.basic += Number(item.amount?.basic || 0);
    amount.igst += Number(item.amount?.igst || 0);
    amount.cgst += Number(item.amount?.cgst || 0);
    amount.sgst += Number(item.amount?.sgst || 0);
    amount.total += Number(item.amount?.total || 0);
  }

  amount.totalTax = amount.igst + amount.cgst + amount.sgst;

  return amount;
};

const createInitialTallyForm = (poData = null) => {
  const voucherDate =
    toDateInput(poData?.poDate) || new Date().toISOString().slice(0, 10);

  return {
    supplierInvoiceNumber: "",
    supplierInvoiceDate: voucherDate,

    roundOffRequired: false,
    roundOffLedgerName: "Round Off",
    roundOffDecimals: 0,

    receiptNoteNo: "",
    receiptDocNo: "",
    receiptDate: voucherDate,
    dispatchedThrough: "",
    destination: "",
    carrierName: "",
    billLrNo: "",
    billLrDate: voucherDate,
    motorVehicleNo: "",
  };
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canEditPurchase = hasPermission("purchase.edit");
  const canResendVendorApproval = hasPermission(
    "purchase.resend_vendor_approval"
  );

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const [tallyModalOpen, setTallyModalOpen] = useState(false);
  const [tallyForm, setTallyForm] = useState(() =>
    createInitialTallyForm(null)
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await purchaseOrderApi.get(id);
      setPo(res.po);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const canEditThisPO = po?.inventoryStatus === "not_moved";

  const canShowVendorActions = [
    "vendor_rejected",
    "pending_vendor_approval",
  ].includes(po?.status);

  const openEditModal = () => {
    if (!po) return;

    setMessage("");

    setEditForm({
      poNumber: po.poNumber || "",
      poDate: toDateInput(po.poDate),
      company: po.company || "",
      division: po.division || "",
      purchaseType: po.purchaseType || "",
      departmentName: po.departmentName || "",
      vendorName: po.vendorName || "",
      vendorLocation: po.vendorLocation || "",
      vendorEmail: po.vendorEmail || "",
      vendorPhone: po.vendorPhone || "",
      remarks: po.remarks || "",
      items: (po.items || []).map((item) => ({
        _id: item._id,
        sourceItemId: item.sourceItemId || "",
        itemId: item.itemId || "",
        itemName: item.itemName || "",
        itemDescription: item.itemDescription || "",
        hsnCode: item.hsnCode || "",
        make: item.make || "",
        techSpec: item.techSpec || "",
        qty: item.qty || 0,
        unit: item.unit || "",
        rate: item.rate || 0,
        gstPercent: item.gstPercent || 0,
        schedule: item.schedule || "",
        remarks: item.remarks || "",
        amount: item.amount || calculateItemAmount(item),
      })),
    });

    setEditOpen(true);
  };

  const openTallyModal = () => {
    setMessage("");
    setTallyForm(createInitialTallyForm(po));
    setTallyModalOpen(true);
  };

  const updateEditForm = (key, value) => {
    setEditForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateEditItem = (index, key, value) => {
    setEditForm((prev) => {
      const items = [...prev.items];
      const nextItem = {
        ...items[index],
        [key]: value,
      };

      if (["qty", "rate", "gstPercent"].includes(key)) {
        nextItem.amount = calculateItemAmount(nextItem);
      }

      items[index] = nextItem;

      return {
        ...prev,
        items,
      };
    });
  };

  const updateTallyForm = (key, value) => {
    setTallyForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const buildTaxesFromPo = (poData) => {
    const taxMap = new Map();

    (poData?.items || []).forEach((item) => {
      (item.taxDetails || []).forEach((tax) => {
        if (tax?.status !== 1) return;
        if ((tax?.chargeType || "").toUpperCase() !== "GST") return;

        const ledgerName = String(tax.chargeName || "").trim();
        const rate = Number(tax.chargeValue || 0);

        if (!ledgerName || rate <= 0) return;

        if (!taxMap.has(ledgerName)) {
          taxMap.set(ledgerName, {
            ledgerName,
            rate,
          });
        }
      });
    });

    return Array.from(taxMap.values());
  };

  const buildMoveToTallyPayload = () => {
    const voucherDate =
      toDateInput(po?.poDate) || new Date().toISOString().slice(0, 10);

    const supplierInvoiceNumber = String(
      tallyForm.supplierInvoiceNumber || ""
    ).trim();

    const supplierInvoiceDate = tallyForm.supplierInvoiceDate || voucherDate;

    return {
      date: voucherDate,
      voucherNumber: "",

      // Supplier invoice fields for Tally Purchase screen
      supplierInvoiceNumber,
      supplierInvoiceDate,

      // Do not send PO number here. This avoids PO number saving as Supplier Invoice No.
      referenceName: supplierInvoiceNumber,

      partyLedgerName: po?.vendorName || po?.vendorCode || "",
      purchaseLedgerName: "PURCHASE SERVICE",

      roundOffRequired: Boolean(tallyForm.roundOffRequired),
      roundOffLedgerName: tallyForm.roundOffLedgerName || "Round Off",
      roundOffDecimals: Number(tallyForm.roundOffDecimals || 0),

      receiptDetails: {
        receiptNoteNo: tallyForm.receiptNoteNo,
        receiptDate: tallyForm.receiptDate || voucherDate,
        dispatchDocNo: tallyForm.receiptDocNo,
        dispatchedThrough: tallyForm.dispatchedThrough,
        destination: tallyForm.destination,
        carrierName: tallyForm.carrierName,
        billOfLadingNo: tallyForm.billLrNo,
        billOfLadingDate: tallyForm.billLrDate || voucherDate,
        motorVehicleNo: tallyForm.motorVehicleNo,
      },

      items: (po?.items || []).map((item) => {
        const itemDescription = String(
          item.itemDescription ||
            item.description ||
            item.techSpec ||
            item.hsnDescription ||
            ""
        ).trim();

        return {
          stockItemName: item.itemName || item.itemDescription || "ITEM",

          description: itemDescription,
          itemDescription,
          hsnDescription: item.hsnDescription || itemDescription,
          techSpec: item.techSpec || "",

          hsnCode: item.hsnCode || "",

          qty: Number(item.acceptedQuantity || item.qty || 0),
          rate: Number(item.rate || 0),
          unit: item.unit || "NOS",

          godownName: "Main Location",
          batchName: "Primary Batch",
        };
      }),

      taxes: buildTaxesFromPo(po),
    };
  };

  const moveToTally = async () => {
    const supplierInvoiceNumber = String(
      tallyForm.supplierInvoiceNumber || ""
    ).trim();

    if (!supplierInvoiceNumber) {
      setMessage("Supplier Invoice No. is required before moving to Tally.");
      return;
    }

    if (tallyForm.roundOffRequired && !tallyForm.roundOffLedgerName?.trim()) {
      setMessage("Round Off Ledger is required when round off is enabled.");
      return;
    }

    setActionLoading(true);
    setMessage("");

    try {
      const payload = buildMoveToTallyPayload();

      console.log("PURCHASE TALLY PAYLOAD", JSON.stringify(payload, null, 2));

      const res = await tallyApi.moveToTally(payload);

      setMessage(res.message || "Purchase voucher moved to Tally successfully.");
      setTallyModalOpen(false);

      setTallyForm(createInitialTallyForm(po));

      await load();
    } catch (err) {
      setMessage(err.message || "Failed to move purchase voucher to Tally.");
    } finally {
      setActionLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!canEditPurchase) {
      setMessage("You do not have permission to edit purchase orders.");
      return;
    }

    if (!canEditThisPO) {
      setMessage("Cannot edit PO after inventory movement.");
      return;
    }

    setActionLoading(true);
    setMessage("");

    try {
      const items = editForm.items.map((item) => {
        const normalized = {
          ...item,
          qty: Number(item.qty || 0),
          rate: Number(item.rate || 0),
          gstPercent: Number(item.gstPercent || 0),
        };

        return {
          ...normalized,
          amount: calculateItemAmount(normalized),
        };
      });

      const payload = {
        ...editForm,
        poDate: editForm.poDate ? new Date(editForm.poDate) : undefined,
        vendorEmail: editForm.vendorEmail?.trim().toLowerCase(),
        vendorPhone: editForm.vendorPhone?.trim(),
        items,
        amount: calculatePoAmount(items),
      };

      await purchaseOrderApi.update(id, payload);

      setEditOpen(false);
      setEditForm(null);
      setMessage(
        "Purchase order updated successfully. You can now resend it to vendor."
      );
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const resendToVendor = async () => {
    if (!canResendVendorApproval) {
      setMessage("You do not have permission to resend PO to vendor.");
      return;
    }

    setActionLoading(true);
    setMessage("");

    try {
      const res = await purchaseOrderApi.resendVendorApproval(id);
      setMessage(res.message);
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Card>Loading purchase order...</Card>;
  if (!po) return <Card>Purchase order not found.</Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/purchase-orders")}
            className="mt-1 shrink-0"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>

          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {po.poNumber}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Vendor: {po.vendorName || "-"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {canEditThisPO ? (
            <Button
              variant="outline"
              onClick={openEditModal}
              disabled={actionLoading || !canEditPurchase}
              title={
                canEditPurchase
                  ? "Edit purchase order before resending"
                  : "You do not have permission to edit purchase orders"
              }
            >
              <Pencil size={16} className="mr-2" />
              Edit PO
            </Button>
          ) : null}

          <Button
            variant="outline"
            onClick={openTallyModal}
            disabled={actionLoading}
          >
            <MoveRight size={16} className="mr-2" />
            Move to Tally
          </Button>

          {canShowVendorActions ? (
            <Button
              onClick={resendToVendor}
              disabled={actionLoading || !canResendVendorApproval}
              title={
                canResendVendorApproval
                  ? "Send this purchase order to vendor email again"
                  : "You do not have permission to resend PO to vendor"
              }
            >
              <Mail size={16} className="mr-2" />
              {actionLoading ? "Sending..." : "Resend to Vendor"}
            </Button>
          ) : null}
        </div>
      </div>

      {message ? (
        <Card className="text-sm text-slate-700">{message}</Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">PO Date</p>
          <p className="mt-1 font-semibold">{formatDate(po.poDate)}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">PO Status</p>
          <div className="mt-2">
            <Badge value={po.status} />
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Inventory Status</p>
          <div className="mt-2">
            <Badge value={po.inventoryStatus} />
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Vendor Response</p>
          <div className="mt-2">
            <Badge value={po.vendorApproval?.status || "pending"} />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          PO Summary
        </h2>

        <div className="grid gap-3 text-sm md:grid-cols-3">
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
          <p>
            <span className="text-slate-500">Basic:</span>{" "}
            {currency(po.amount?.basic)}
          </p>
          <p>
            <span className="text-slate-500">Tax:</span>{" "}
            {currency(po.amount?.totalTax)}
          </p>
          <p>
            <span className="text-slate-500">Source:</span>{" "}
            {po.sourceType || "-"}
          </p>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Vendor Approval
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Vendor email response and stock availability decision.
            </p>
          </div>

          <Badge value={po.vendorApproval?.status || po.status} />
        </div>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <p>
            <span className="text-slate-500">Vendor Email:</span>{" "}
            {po.vendorEmail || "-"}
          </p>
          <p>
            <span className="text-slate-500">Vendor Phone:</span>{" "}
            {po.vendorPhone || "-"}
          </p>
          <p>
            <span className="text-slate-500">Response Date:</span>{" "}
            {formatDate(po.vendorApproval?.respondedAt)}
          </p>
          <p>
            <span className="text-slate-500">Stock Status:</span>{" "}
            {po.vendorApproval?.decision
              ? po.vendorApproval.decision.replaceAll("_", " ")
              : "-"}
          </p>
          <p>
            <span className="text-slate-500">Incoming Days:</span>{" "}
            {po.vendorApproval?.incomingDays
              ? `${po.vendorApproval.incomingDays} days`
              : "-"}
          </p>
          <p>
            <span className="text-slate-500">Expected Date:</span>{" "}
            {formatDate(po.vendorApproval?.expectedAvailabilityDate)}
          </p>
        </div>

        {po.vendorApproval?.rejectionReason ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-semibold">Vendor Rejection Reason</p>
            <p className="mt-1 whitespace-pre-line">
              {po.vendorApproval.rejectionReason}
            </p>
          </div>
        ) : null}
      </Card>

      <TableWrap>
        <table className="min-w-[1000px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">HSN</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Accepted</th>
              <th className="px-4 py-3">Rejected</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {po.items?.map((item) => (
              <tr key={item._id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">
                    {item.itemName || item.itemDescription}
                  </p>
                  {item.itemDescription ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {item.itemDescription}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">{item.hsnCode || "-"}</td>
                <td className="px-4 py-3">
                  {item.qty} {item.unit}
                </td>
                <td className="px-4 py-3">{item.acceptedQuantity || 0}</td>
                <td className="px-4 py-3">{item.rejectedQuantity || 0}</td>
                <td className="px-4 py-3">{currency(item.rate)}</td>
                <td className="px-4 py-3">{currency(item.amount?.total)}</td>
                <td className="px-4 py-3">
                  <Badge value={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      <Modal
        open={editOpen}
        title="Edit Purchase Order"
        onClose={() => {
          if (!actionLoading) {
            setEditOpen(false);
            setEditForm(null);
          }
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEditOpen(false);
                setEditForm(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={actionLoading || !canEditPurchase}
            >
              {actionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </>
        }
      >
        {editForm ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">PO Details</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Input
                  label="PO Number"
                  value={editForm.poNumber}
                  onChange={(e) => updateEditForm("poNumber", e.target.value)}
                  required
                />

                <Input
                  label="PO Date"
                  type="date"
                  value={editForm.poDate}
                  onChange={(e) => updateEditForm("poDate", e.target.value)}
                />

                <Input
                  label="Company"
                  value={editForm.company}
                  onChange={(e) => updateEditForm("company", e.target.value)}
                />

                <Input
                  label="Division"
                  value={editForm.division}
                  onChange={(e) => updateEditForm("division", e.target.value)}
                />

                <Input
                  label="Purchase Type"
                  value={editForm.purchaseType}
                  onChange={(e) =>
                    updateEditForm("purchaseType", e.target.value)
                  }
                />

                <Input
                  label="Department"
                  value={editForm.departmentName}
                  onChange={(e) =>
                    updateEditForm("departmentName", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Vendor Details</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Input
                  label="Vendor Name"
                  value={editForm.vendorName}
                  onChange={(e) =>
                    updateEditForm("vendorName", e.target.value)
                  }
                  required
                />

                <Input
                  label="Vendor Location"
                  value={editForm.vendorLocation}
                  onChange={(e) =>
                    updateEditForm("vendorLocation", e.target.value)
                  }
                />

                <Input
                  label="Vendor Email"
                  type="email"
                  value={editForm.vendorEmail}
                  onChange={(e) =>
                    updateEditForm("vendorEmail", e.target.value)
                  }
                  required
                />

                <Input
                  label="Vendor Phone"
                  value={editForm.vendorPhone}
                  maxLength={10}
                  inputMode="numeric"
                  onChange={(e) =>
                    updateEditForm(
                      "vendorPhone",
                      e.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                  required
                />

                <Input
                  label="Remarks"
                  value={editForm.remarks}
                  onChange={(e) => updateEditForm("remarks", e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold text-slate-900">Items</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Update item quantity, rate, GST and details before resending
                    to vendor.
                  </p>
                </div>

                <p className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  Total: {currency(calculatePoAmount(editForm.items).total)}
                </p>
              </div>

              <div className="mt-4 space-y-4">
                {editForm.items.map((item, index) => (
                  <div
                    key={item._id || index}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div>
                        <p className="font-semibold text-slate-900">
                          Item #{index + 1}
                        </p>
                        <p className="text-xs text-slate-500">
                          Line Total: {currency(item.amount?.total)}
                        </p>
                      </div>
                      <Badge value={item.status || "pending_vendor_approval"} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Input
                        label="Item Name"
                        value={item.itemName}
                        onChange={(e) =>
                          updateEditItem(index, "itemName", e.target.value)
                        }
                        required
                      />

                      <Input
                        label="HSN"
                        value={item.hsnCode}
                        onChange={(e) =>
                          updateEditItem(index, "hsnCode", e.target.value)
                        }
                      />

                      <Input
                        label="Unit"
                        value={item.unit}
                        onChange={(e) =>
                          updateEditItem(index, "unit", e.target.value)
                        }
                      />

                      <Input
                        label="Quantity"
                        type="number"
                        value={item.qty}
                        onChange={(e) =>
                          updateEditItem(index, "qty", e.target.value)
                        }
                        required
                      />

                      <Input
                        label="Rate"
                        type="number"
                        value={item.rate}
                        onChange={(e) =>
                          updateEditItem(index, "rate", e.target.value)
                        }
                        required
                      />

                      <Input
                        label="GST %"
                        type="number"
                        value={item.gstPercent}
                        onChange={(e) =>
                          updateEditItem(index, "gstPercent", e.target.value)
                        }
                      />

                      <Input
                        label="Schedule"
                        value={item.schedule}
                        onChange={(e) =>
                          updateEditItem(index, "schedule", e.target.value)
                        }
                      />

                      <div className="md:col-span-2 xl:col-span-4">
                        <Input
                          label="Description"
                          value={item.itemDescription}
                          onChange={(e) =>
                            updateEditItem(
                              index,
                              "itemDescription",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={tallyModalOpen}
        title="Move to Tally"
        onClose={() => {
          if (!actionLoading) setTallyModalOpen(false);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setTallyModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={moveToTally} disabled={actionLoading}>
              {actionLoading ? "Moving..." : "Move"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">
              Supplier Invoice & Round Off
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Input
                label="Supplier Invoice No."
                value={tallyForm.supplierInvoiceNumber}
                onChange={(e) =>
                  updateTallyForm("supplierInvoiceNumber", e.target.value)
                }
                required
              />

              <Input
                label="Supplier Invoice Date"
                type="date"
                value={tallyForm.supplierInvoiceDate}
                onChange={(e) =>
                  updateTallyForm("supplierInvoiceDate", e.target.value)
                }
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Round Off Required?
                </label>

                <select
                  value={tallyForm.roundOffRequired ? "yes" : "no"}
                  onChange={(e) =>
                    updateTallyForm(
                      "roundOffRequired",
                      e.target.value === "yes"
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              {tallyForm.roundOffRequired ? (
                <>
                  <Input
                    label="Round Off Ledger"
                    value={tallyForm.roundOffLedgerName}
                    onChange={(e) =>
                      updateTallyForm("roundOffLedgerName", e.target.value)
                    }
                  />

                  <Input
                    label="Round Off Decimals"
                    type="number"
                    value={tallyForm.roundOffDecimals}
                    onChange={(e) =>
                      updateTallyForm("roundOffDecimals", e.target.value)
                    }
                  />
                </>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">Receipt Details</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Input
                label="Receipt Note No(s)"
                value={tallyForm.receiptNoteNo}
                onChange={(e) =>
                  updateTallyForm("receiptNoteNo", e.target.value)
                }
              />

              <Input
                label="Receipt Doc No."
                value={tallyForm.receiptDocNo}
                onChange={(e) =>
                  updateTallyForm("receiptDocNo", e.target.value)
                }
              />

              <Input
                label="Date"
                type="date"
                value={tallyForm.receiptDate}
                onChange={(e) => updateTallyForm("receiptDate", e.target.value)}
              />

              <Input
                label="Dispatched Through"
                value={tallyForm.dispatchedThrough}
                onChange={(e) =>
                  updateTallyForm("dispatchedThrough", e.target.value)
                }
              />

              <Input
                label="Destination"
                value={tallyForm.destination}
                onChange={(e) => updateTallyForm("destination", e.target.value)}
              />

              <Input
                label="Carrier Name / Agent"
                value={tallyForm.carrierName}
                onChange={(e) => updateTallyForm("carrierName", e.target.value)}
              />

              <Input
                label="Bill of Lading / LR-RR No."
                value={tallyForm.billLrNo}
                onChange={(e) => updateTallyForm("billLrNo", e.target.value)}
              />

              <Input
                label="Bill of Lading / LR-RR Date"
                type="date"
                value={tallyForm.billLrDate}
                onChange={(e) => updateTallyForm("billLrDate", e.target.value)}
              />

              <Input
                label="Motor Vehicle No."
                value={tallyForm.motorVehicleNo}
                onChange={(e) =>
                  updateTallyForm("motorVehicleNo", e.target.value)
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">
              Items Going to Tally
            </h3>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[800px] w-full text-left text-sm">
                <thead className="bg-white text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Rate</th>
                    <th className="px-3 py-2">Unit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {(po?.items || []).map((item, index) => (
                    <tr key={item._id || index}>
                      <td className="px-3 py-2 font-semibold text-slate-900">
                        {item.itemName || item.itemDescription || "ITEM"}
                      </td>

                      <td className="px-3 py-2 text-slate-600">
                        {item.itemDescription ||
                          item.description ||
                          item.techSpec ||
                          item.hsnDescription ||
                          "-"}
                      </td>

                      <td className="px-3 py-2">
                        {Number(item.acceptedQuantity || item.qty || 0)}
                      </td>

                      <td className="px-3 py-2">{currency(item.rate)}</td>

                      <td className="px-3 py-2">{item.unit || "NOS"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}