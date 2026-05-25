import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import TableWrap from "../components/TableWrap";
import Input from "../components/Input";
import { saleApi, tallyApi } from "../api/api";
import { currency, formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

const normalizeStatus = (value) => {
  return String(value || "").trim().toLowerCase();
};

const isAcceptedSale = (sale) => {
  return (
    normalizeStatus(sale?.clientAcceptanceStatus) === "accepted" ||
    normalizeStatus(sale?.saleStatus) === "accepted"
  );
};

const isRejectedSale = (sale) => {
  return (
    normalizeStatus(sale?.clientAcceptanceStatus) === "rejected" ||
    normalizeStatus(sale?.saleStatus) === "rejected"
  );
};

// ✅ Button should depend ONLY on clientAcceptanceStatus
const canPushSaleToTally = (sale) => {
  return normalizeStatus(sale?.clientAcceptanceStatus) === "accepted";
};

const isTallyPushed = (sale) => {
  return (
    normalizeStatus(sale?.tallyStatus) === "synced" ||
    normalizeStatus(sale?.tallyStatus) === "tally_synced" ||
    normalizeStatus(sale?.tallyStatus) === "pushed"
  );
};

const toNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toInputDate = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

const splitAddressLines = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((line) => String(line || "").trim()).filter(Boolean);
  }

  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const getSaleItemName = (item) => {
  return item?.itemName || item?.itemDescription || "Unnamed Item";
};

const getGstRatesFromPercent = (gstPercent) => {
  const gst = toNum(gstPercent);

  if (gst <= 0) {
    return {
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
    };
  }

  return {
    cgstRate: gst / 2,
    sgstRate: gst / 2,
    igstRate: gst,
  };
};

const buildInitialTallyForm = (sale) => {
  const saleDate = toInputDate(sale?.saleDate);

  return {
    date: saleDate,
    voucherNumber: sale?.saleNumber || "",
    referenceName: sale?.saleNumber || "",

    partyLedgerName: sale?.customerName || "",
    salesLedgerName: "Sale Service",

    roundOffLedgerName: "ROUND OFF",
    roundOffDecimals: 0,

    buyerAddress:
      sale?.billingAddress ||
      sale?.shippingAddress ||
      sale?.customerAddress ||
      "",
    buyerStateName: "",
    buyerCountryName: "India",
    placeOfSupply: "",
    buyerGstin: sale?.customerGstin || "",
    gstRegistrationType: sale?.customerGstin ? "Regular" : "",

    deliveryNoteNo: "",
    deliveryNoteDate: saleDate,
    dispatchDocNo: "",
    dispatchedThrough: "",
    destination: "",
    carrierName: "",
    billOfLadingNo: "",
    billOfLadingDate: saleDate,
    motorVehicleNo: "",
  };
};

const buildTallySalesPayload = (sale, tallyForm) => {
  return {
    date: tallyForm.date,
    voucherNumber: tallyForm.voucherNumber,
    referenceName: tallyForm.referenceName,

    partyLedgerName: tallyForm.partyLedgerName,
    salesLedgerName: tallyForm.salesLedgerName,

    roundOffLedgerName: tallyForm.roundOffLedgerName || "ROUND OFF",
    roundOffDecimals: Number(tallyForm.roundOffDecimals || 0),

    buyerDetails: {
      addressLines: splitAddressLines(tallyForm.buyerAddress),
      stateName: tallyForm.buyerStateName,
      countryName: tallyForm.buyerCountryName || "India",
      placeOfSupply: tallyForm.placeOfSupply || tallyForm.buyerStateName,
      gstin: tallyForm.buyerGstin,
      gstRegistrationType: tallyForm.gstRegistrationType,
    },

    dispatchDetails: {
      deliveryNoteNo: tallyForm.deliveryNoteNo,
      deliveryNoteDate: tallyForm.deliveryNoteDate,
      dispatchDocNo: tallyForm.dispatchDocNo,
      dispatchedThrough: tallyForm.dispatchedThrough,
      destination: tallyForm.destination,
      carrierName: tallyForm.carrierName,
      billOfLadingNo: tallyForm.billOfLadingNo,
      billOfLadingDate: tallyForm.billOfLadingDate,
      motorVehicleNo: tallyForm.motorVehicleNo,
    },

    items: (sale?.items || []).map((item) => {
      const gstRates = getGstRatesFromPercent(item.gstPercent);

      return {
        stockItemName: getSaleItemName(item),
        description: item.itemDescription || item.description || "",
        qty: toNum(item.quantity),
        rate: toNum(item.saleRate),
        unit: item.unit || "NOS",

        godownName: item.godownName || "Main Location",
        batchName: item.batchName || "Primary Batch",

        hsnCode: item.hsnCode || item.gstHsnCode || "",
        hsnDescription:
          item.hsnDescription ||
          item.gstHsnDescription ||
          item.itemDescription ||
          "",

        taxability: item.taxability || "Taxable",
        typeOfSupply: item.typeOfSupply || "Services",

        cgstRate: gstRates.cgstRate,
        sgstRate: gstRates.sgstRate,
        igstRate: gstRates.igstRate,
      };
    }),
  };
};

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { hasPermission } = useAuth();

  const canSyncSalesTally = hasPermission("tally.sales_sync");

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [tallyModalOpen, setTallyModalOpen] = useState(false);
  const [tallyPushing, setTallyPushing] = useState(false);
  const [tallyForm, setTallyForm] = useState(() =>
    buildInitialTallyForm(null)
  );

  const load = async () => {
    setLoading(true);

    try {
      const res = await saleApi.get(id);
      setSale(res.sale);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const openTallyModal = () => {
    if (!canSyncSalesTally) {
      setMessage("You do not have permission to push sales voucher to Tally.");
      return;
    }

    if (!canPushSaleToTally(sale)) {
      setMessage(
        "Sales voucher can be pushed to Tally only after client acceptance."
      );
      return;
    }

    if (isTallyPushed(sale)) {
      setMessage("Sales voucher is already pushed to Tally.");
      return;
    }

    setMessage("");
    setTallyForm(buildInitialTallyForm(sale));
    setTallyModalOpen(true);
  };

  const updateTallyForm = (key, value) => {
    setTallyForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

const finalPushToTally = async (e) => {
  e.preventDefault();

  if (!canSyncSalesTally) {
    setMessage("You do not have permission to push sales voucher to Tally.");
    return;
  }

  if (!canPushSaleToTally(sale)) {
    setMessage(
      "Sales voucher can be pushed to Tally only after client acceptance."
    );
    return;
  }

  if (!tallyForm.partyLedgerName.trim()) {
    setMessage("Party ledger name is required.");
    return;
  }

  if (!tallyForm.salesLedgerName.trim()) {
    setMessage("Sales ledger name is required.");
    return;
  }

  if (!sale?.items?.length) {
    setMessage("Sale has no items to push to Tally.");
    return;
  }

  setTallyPushing(true);
  setMessage("");

  let tallyPushedSuccessfully = false;

  try {
    const payload = buildTallySalesPayload(sale, tallyForm);

    // 1. Actual Tally push
    const tallyRes = await tallyApi.createSalesVoucher(payload);

    tallyPushedSuccessfully = true;

    // 2. If Tally push success, update sale tallyStatus to synced
    const statusRes = await saleApi.updateTallyStatus(id, {
      tallyStatus: "synced",
      tallyVoucherNumber: tallyForm.voucherNumber || sale.saleNumber,
    });

    setMessage(tallyRes.message || "Sales voucher pushed to Tally.");
    setTallyModalOpen(false);

    if (statusRes?.sale) {
      setSale(statusRes.sale);
    } else {
      setSale((prev) =>
        prev
          ? {
              ...prev,
              tallyStatus: "synced",
              tallyVoucherNumber:
                tallyForm.voucherNumber || prev.saleNumber,
            }
          : prev
      );
    }
  } catch (err) {
    // If actual Tally push failed, mark backend status as failed
    if (!tallyPushedSuccessfully) {
      try {
        const failedStatusRes = await saleApi.updateTallyStatus(id, {
          tallyStatus: "failed",
          tallyVoucherNumber: tallyForm.voucherNumber || sale?.saleNumber,
        });

        if (failedStatusRes?.sale) {
          setSale(failedStatusRes.sale);
        } else {
          setSale((prev) =>
            prev
              ? {
                  ...prev,
                  tallyStatus: "failed",
                }
              : prev
          );
        }
      } catch (statusErr) {
        console.error("Failed to update tally status as failed:", statusErr);
      }

      setMessage(err.message || "Failed to push sales voucher to Tally.");
      return;
    }

    // If Tally push succeeded but DB status update failed, do not mark as failed
    setMessage(
      err.message ||
        "Sales voucher was pushed to Tally, but local status update failed."
    );
  } finally {
    setTallyPushing(false);
  }
};

  if (loading) return <Card>Loading sale...</Card>;
  if (!sale) return <Card>Sale not found.</Card>;

  const clientAcceptance = sale.clientAcceptance;
  const isClientRejected = isRejectedSale(sale);
  const isClientAccepted = isAcceptedSale(sale);
  const tallyPushed = isTallyPushed(sale);
  const canPushToTally = canPushSaleToTally(sale);

  const groupedSaleItems = Object.values(
    (sale.items || []).reduce((acc, item) => {
      const key = (item.itemName || item.itemDescription || "Unnamed Item")
        .trim()
        .toLowerCase();

      const qty = Number(item.quantity || 0);

      const purchaseBasic =
        item.purchaseBasicAmount ?? Number(item.purchaseRate || 0) * qty;

      const purchaseTotal =
        item.purchaseTotalAmount ??
        Number(item.purchaseRate || 0) *
          qty *
          (1 + Number(item.purchaseGstPercent || 0) / 100);

      const saleTotal = Number(item.totalAmount || 0);

      const expectedProfit =
        item.profitAmount ?? Number(saleTotal || 0) - Number(purchaseTotal || 0);

      const realizedProfit = isClientAccepted ? Number(expectedProfit || 0) : 0;

      if (!acc[key]) {
        acc[key] = {
          itemName: item.itemName || item.itemDescription || "Unnamed Item",
          itemDescription: item.itemDescription || "",
          unit: item.unit || "",

          quantity: 0,
          purchaseTotalAmount: 0,
          saleTotalAmount: 0,
          realizedProfitAmount: 0,

          lines: [],
        };
      }

      acc[key].quantity += qty;
      acc[key].purchaseTotalAmount += Number(purchaseTotal || 0);
      acc[key].saleTotalAmount += Number(saleTotal || 0);
      acc[key].realizedProfitAmount += Number(realizedProfit || 0);

      acc[key].lines.push({
        sourcePoNumber: item.sourcePoNumber || "-",
        quantity: qty,
        unit: item.unit || "",
        purchaseRate: Number(item.purchaseRate || 0),
        purchaseGstPercent: Number(item.purchaseGstPercent || 0),
        purchaseTotal: Number(purchaseTotal || 0),
        saleRate: Number(item.saleRate || 0),
        saleGstPercent: Number(item.gstPercent || 0),
        saleTotal: Number(saleTotal || 0),
        expectedProfit: Number(expectedProfit || 0),
        realizedProfit: Number(realizedProfit || 0),
      });

      return acc;
    }, {})
  ).map((group) => ({
    ...group,
    lines: group.lines.sort((a, b) =>
      String(a.sourcePoNumber).localeCompare(String(b.sourcePoNumber))
    ),
  }));

  const LineList = ({ items, renderValue }) => (
    <div className="space-y-1">
      {items.map((line, idx) => (
        <div key={idx} className="text-xs text-slate-600">
          <span className="mr-1 font-medium text-slate-400">{idx + 1}.</span>
          {renderValue(line)}
        </div>
      ))}
    </div>
  );

  const PoBadgeList = ({ items }) => (
    <div className="flex flex-col gap-1">
      {items.map((line, idx) => (
        <div
          key={idx}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
        >
          <span className="font-semibold text-slate-500">{idx + 1}</span>
          <span>{line.sourcePoNumber}</span>
        </div>
      ))}
    </div>
  );

  const ProfitValue = ({ value }) => {
    const amount = Number(value || 0);
    const isLoss = amount < 0;

    return (
      <span className={isLoss ? "text-red-600" : "text-emerald-700"}>
        {isLoss
          ? `Loss ${currency(Math.abs(amount))}`
          : `Profit ${currency(amount)}`}
      </span>
    );
  };

  const NotCountedProfit = () => {
    if (isClientRejected) {
      return (
        <div>
          <p className="font-semibold text-slate-500">{currency(0)}</p>
          <p className="mt-1 text-xs text-red-600">
            Not counted because rejected
          </p>
        </div>
      );
    }

    return (
      <div>
        <p className="font-semibold text-slate-500">Not counted</p>
        <p className="mt-1 text-xs text-amber-600">
          Waiting customer approval
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/sales")}
            className="mt-1 shrink-0"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>

          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {sale.saleNumber}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Customer: {sale.customerName} / {sale.customerEmail}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 xl:items-end">
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button
              onClick={openTallyModal}
              disabled={tallyPushed || !canSyncSalesTally || !canPushToTally}
              title={
                !canSyncSalesTally
                  ? "You do not have permission to push sales voucher to Tally"
                  : tallyPushed
                  ? "Sales voucher is already pushed to Tally"
                  : !canPushToTally
                  ? "Sales voucher can be pushed to Tally only after client acceptance"
                  : "Open dispatch details before Tally push"
              }
            >
              Push Sales to Tally
            </Button>
          </div>

          {!canSyncSalesTally ? (
            <p className="max-w-md text-left text-xs text-slate-500 xl:text-right">
              Some actions are disabled because your role does not have
              permission.
            </p>
          ) : !canPushToTally ? (
            <p className="max-w-md text-left text-xs font-semibold text-amber-600 xl:text-right">
              Tally push is enabled only after client acceptance.
            </p>
          ) : null}
        </div>
      </div>

      {message ? (
        <Card className="text-sm text-slate-700">{message}</Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Sale Date</p>
          <p className="mt-1 font-semibold">{formatDate(sale.saleDate)}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Total</p>
          <p className="mt-1 font-semibold">{currency(sale.amount?.total)}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Tally</p>
          <div className="mt-2">
            <Badge value={sale.tallyStatus} />
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Client</p>
          <div className="mt-2">
            <Badge value={sale.clientAcceptanceStatus} />
          </div>
        </Card>
      </div>

      {isClientRejected ? (
        <Card className="border-red-200 bg-red-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-800">
                Client Rejected This Delivery
              </p>
              <p className="mt-1 text-sm text-red-700">
                The client has rejected the sale/delivery. Stock is released and
                profit is not counted.
              </p>
            </div>

            <Badge value={sale.clientAcceptanceStatus} />
          </div>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-red-200 bg-white p-3">
              <p className="text-xs font-medium uppercase text-slate-500">
                Rating
              </p>
              <p className="mt-1 text-lg font-bold text-red-700">
                {clientAcceptance?.rating
                  ? `${clientAcceptance.rating}/5`
                  : "-"}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-white p-3 md:col-span-2">
              <p className="text-xs font-medium uppercase text-slate-500">
                Rejection Reason / Feedback
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                {clientAcceptance?.feedback || "-"}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {isClientAccepted ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Client Accepted This Delivery
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                The client has accepted the sale/delivery. Profit is now
                counted.
              </p>
            </div>

            <Badge value={sale.clientAcceptanceStatus} />
          </div>

          {clientAcceptance?.feedback ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
              <p className="text-xs font-medium uppercase text-slate-500">
                Client Feedback / Note
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                {clientAcceptance.feedback}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
              <p className="text-xs font-medium uppercase text-slate-500">
                Client Feedback / Note
              </p>
              <p className="mt-1 text-sm text-slate-500">
                No feedback was provided by the client.
              </p>
            </div>
          )}
        </Card>
      ) : null}

      <TableWrap>
        <table className="min-w-[1250px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Source PO</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Purchase Rate</th>
              <th className="px-4 py-3">Purchase GST</th>
              <th className="px-4 py-3">Purchase Total</th>
              <th className="px-4 py-3">Sale Rate</th>
              <th className="px-4 py-3">Sale GST</th>
              <th className="px-4 py-3">Sale Total</th>
              <th className="px-4 py-3">Profit / Loss</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {groupedSaleItems.map((item, index) => (
              <tr key={index} className="align-top hover:bg-slate-50">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {item.itemName}
                  </p>
                  {item.itemDescription ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {item.itemDescription}
                    </p>
                  ) : null}
                </td>

                <td className="px-4 py-4">
                  <PoBadgeList items={item.lines} />
                </td>

                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {item.quantity} {item.unit || ""}
                  </p>

                  {item.lines.length > 1 ? (
                    <div className="mt-2 rounded-xl bg-slate-50 p-2">
                      <LineList
                        items={item.lines}
                        renderValue={(line) => (
                          <span>
                            {line.quantity} {line.unit}
                          </span>
                        )}
                      />
                    </div>
                  ) : null}
                </td>

                <td className="px-4 py-4">
                  {item.lines.length === 1 ? (
                    <p className="font-medium text-slate-900">
                      {currency(item.lines[0].purchaseRate)}
                    </p>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-2">
                      <LineList
                        items={item.lines}
                        renderValue={(line) => currency(line.purchaseRate)}
                      />
                    </div>
                  )}
                </td>

                <td className="px-4 py-4">
                  {item.lines.length === 1 ? (
                    <p className="font-medium text-slate-900">
                      {item.lines[0].purchaseGstPercent}%
                    </p>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-2">
                      <LineList
                        items={item.lines}
                        renderValue={(line) => `${line.purchaseGstPercent}%`}
                      />
                    </div>
                  )}
                </td>

                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {currency(item.purchaseTotalAmount)}
                  </p>

                  {item.lines.length > 1 ? (
                    <div className="mt-2 rounded-xl bg-slate-50 p-2">
                      <LineList
                        items={item.lines}
                        renderValue={(line) => currency(line.purchaseTotal)}
                      />
                    </div>
                  ) : null}
                </td>

                <td className="px-4 py-4">
                  {item.lines.length === 1 ? (
                    <p className="font-medium text-slate-900">
                      {currency(item.lines[0].saleRate)}
                    </p>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-2">
                      <LineList
                        items={item.lines}
                        renderValue={(line) => currency(line.saleRate)}
                      />
                    </div>
                  )}
                </td>

                <td className="px-4 py-4">
                  {item.lines.length === 1 ? (
                    <p className="font-medium text-slate-900">
                      {item.lines[0].saleGstPercent}%
                    </p>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-2">
                      <LineList
                        items={item.lines}
                        renderValue={(line) => `${line.saleGstPercent}%`}
                      />
                    </div>
                  )}
                </td>

                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {currency(item.saleTotalAmount)}
                  </p>

                  {item.lines.length > 1 ? (
                    <div className="mt-2 rounded-xl bg-slate-50 p-2">
                      <LineList
                        items={item.lines}
                        renderValue={(line) => currency(line.saleTotal)}
                      />
                    </div>
                  ) : null}
                </td>

                <td className="px-4 py-4">
                  {isClientAccepted ? (
                    <>
                      <p className="font-semibold">
                        <ProfitValue value={item.realizedProfitAmount} />
                      </p>

                      {item.lines.length > 1 ? (
                        <div className="mt-2 rounded-xl bg-slate-50 p-2">
                          <LineList
                            items={item.lines}
                            renderValue={(line) => (
                              <ProfitValue value={line.realizedProfit} />
                            )}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <NotCountedProfit />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      {tallyModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <form onSubmit={finalPushToTally}>
              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Push Sales Voucher to Tally
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter dispatch details, then click Final Push to Tally.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setTallyModalOpen(false)}
                  disabled={tallyPushing}
                  className="rounded-xl px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Close
                </button>
              </div>

              <div className="space-y-5 p-5">
                <Card>
                  <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">
                    Voucher Details
                  </h3>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Input
                      label="Voucher Date"
                      type="date"
                      value={tallyForm.date}
                      onChange={(e) => updateTallyForm("date", e.target.value)}
                      required
                    />

                    <Input
                      label="Voucher Number"
                      value={tallyForm.voucherNumber}
                      onChange={(e) =>
                        updateTallyForm("voucherNumber", e.target.value)
                      }
                    />

                    <Input
                      label="Reference Name"
                      value={tallyForm.referenceName}
                      onChange={(e) =>
                        updateTallyForm("referenceName", e.target.value)
                      }
                    />

                    <Input
                      label="Party Ledger Name"
                      value={tallyForm.partyLedgerName}
                      onChange={(e) =>
                        updateTallyForm("partyLedgerName", e.target.value)
                      }
                      required
                    />

                    <Input
                      label="Sales Ledger Name"
                      value={tallyForm.salesLedgerName}
                      onChange={(e) =>
                        updateTallyForm("salesLedgerName", e.target.value)
                      }
                      required
                    />

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
                  </div>
                </Card>

                <Card>
                  <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">
                    Buyer / GST Details
                  </h3>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Input
                      label="Buyer State"
                      value={tallyForm.buyerStateName}
                      onChange={(e) =>
                        updateTallyForm("buyerStateName", e.target.value)
                      }
                    />

                    <Input
                      label="Place of Supply"
                      value={tallyForm.placeOfSupply}
                      onChange={(e) =>
                        updateTallyForm("placeOfSupply", e.target.value)
                      }
                    />

                    <Input
                      label="Country"
                      value={tallyForm.buyerCountryName}
                      onChange={(e) =>
                        updateTallyForm("buyerCountryName", e.target.value)
                      }
                    />

                    <Input
                      label="Buyer GSTIN"
                      value={tallyForm.buyerGstin}
                      onChange={(e) =>
                        updateTallyForm("buyerGstin", e.target.value)
                      }
                    />

                    <Input
                      label="GST Registration Type"
                      value={tallyForm.gstRegistrationType}
                      onChange={(e) =>
                        updateTallyForm("gstRegistrationType", e.target.value)
                      }
                    />

                    <div className="md:col-span-3">
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Buyer Address
                      </label>

                      <textarea
                        value={tallyForm.buyerAddress}
                        onChange={(e) =>
                          updateTallyForm("buyerAddress", e.target.value)
                        }
                        rows={3}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        placeholder="Enter address line by line"
                      />
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">
                    Dispatch Details
                  </h3>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Input
                      label="Delivery Note No(s)"
                      value={tallyForm.deliveryNoteNo}
                      onChange={(e) =>
                        updateTallyForm("deliveryNoteNo", e.target.value)
                      }
                    />

                    <Input
                      label="Delivery Note Date"
                      type="date"
                      value={tallyForm.deliveryNoteDate}
                      onChange={(e) =>
                        updateTallyForm("deliveryNoteDate", e.target.value)
                      }
                    />

                    <Input
                      label="Dispatch Doc No."
                      value={tallyForm.dispatchDocNo}
                      onChange={(e) =>
                        updateTallyForm("dispatchDocNo", e.target.value)
                      }
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
                      onChange={(e) =>
                        updateTallyForm("destination", e.target.value)
                      }
                    />

                    <Input
                      label="Carrier Name / Agent"
                      value={tallyForm.carrierName}
                      onChange={(e) =>
                        updateTallyForm("carrierName", e.target.value)
                      }
                    />

                    <Input
                      label="Bill of Lading / L-RR No."
                      value={tallyForm.billOfLadingNo}
                      onChange={(e) =>
                        updateTallyForm("billOfLadingNo", e.target.value)
                      }
                    />

                    <Input
                      label="Bill of Lading Date"
                      type="date"
                      value={tallyForm.billOfLadingDate}
                      onChange={(e) =>
                        updateTallyForm("billOfLadingDate", e.target.value)
                      }
                    />

                    <Input
                      label="Motor Vehicle No."
                      value={tallyForm.motorVehicleNo}
                      onChange={(e) =>
                        updateTallyForm("motorVehicleNo", e.target.value)
                      }
                    />
                  </div>
                </Card>

                <Card>
                  <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">
                    Items Going to Tally
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Stock Item</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Unit</th>
                          <th className="px-3 py-2">Rate</th>
                          <th className="px-3 py-2">GST</th>
                          <th className="px-3 py-2">Description</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {(sale.items || []).map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 font-semibold text-slate-900">
                              {getSaleItemName(item)}
                            </td>

                            <td className="px-3 py-2">
                              {toNum(item.quantity)}
                            </td>

                            <td className="px-3 py-2">
                              {item.unit || "NOS"}
                            </td>

                            <td className="px-3 py-2">
                              {currency(item.saleRate)}
                            </td>

                            <td className="px-3 py-2">
                              {toNum(item.gstPercent)}%
                            </td>

                            <td className="px-3 py-2 text-slate-600">
                              {item.itemDescription || item.description || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTallyModalOpen(false)}
                  disabled={tallyPushing}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={tallyPushing}>
                  {tallyPushing ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Pushing...
                    </>
                  ) : (
                    "Final Push to Tally"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}