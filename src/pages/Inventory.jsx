// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Badge from "../components/Badge";
// import Button from "../components/Button";
// import Card from "../components/Card";
// import Input from "../components/Input";
// import Modal from "../components/Modal";
// import TableWrap from "../components/TableWrap";
// import { inventoryApi, saleApi } from "../api/api";
// import { currency } from "../utils/format";
// import { useAuth } from "../context/AuthContext";

// export default function Inventory() {
//   const navigate = useNavigate();
//   const { hasPermission } = useAuth();

//   const canViewInventory = hasPermission("inventory.view");
//   const canEditInventory = hasPermission("inventory.edit");
//   const canCreateSale = hasPermission("sales.create");

//   const [data, setData] = useState([]);
//   const [selected, setSelected] = useState(null);

//   const [saleForm, setSaleForm] = useState({
//     customerName: "",
//     customerEmail: "",
//     customerPhone: "",
//     quantity: 1,
//     saleRate: 0,
//     gstPercent: 18,
//     discountPercent: 0
//   });

//   const [editForm, setEditForm] = useState({
//     itemName: "",
//     itemDescription: "",
//     rate: 0,
//     gstPercent: 18
//   });

//   const [saleModalOpen, setSaleModalOpen] = useState(false);
//   const [editModalOpen, setEditModalOpen] = useState(false);

//   const [message, setMessage] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [actionLoading, setActionLoading] = useState(false);

//   const load = async () => {
//     if (!canViewInventory) {
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     try {
//       const res = await inventoryApi.list({ page: 1, pageSize: 100 });
//       setData(res.data || []);
//     } catch (err) {
//       setMessage(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load();
//   }, [canViewInventory]);

//   const openSaleModal = (item) => {
//     setMessage("");

//     if (!canCreateSale) {
//       setMessage("You do not have permission to create sales.");
//       return;
//     }

//     if (Number(item.availableQuantity || 0) <= 0) {
//       setMessage("This inventory item has no available quantity.");
//       return;
//     }

//     setSelected(item);
//     setSaleForm({
//       customerName: "",
//       customerEmail: "",
//       customerPhone: "",
//       quantity: 1,
//       saleRate: item.rate || 0,
//       gstPercent: item.gstPercent || 18,
//       discountPercent: 0
//     });
//     setSaleModalOpen(true);
//   };

//   const openEditModal = (item) => {
//     setMessage("");

//     if (!canEditInventory) {
//       setMessage("You do not have permission to edit inventory.");
//       return;
//     }

//     setSelected(item);
//     setEditForm({
//       itemName: item.itemName || "",
//       itemDescription: item.itemDescription || "",
//       rate: item.rate || 0,
//       gstPercent: item.gstPercent || 18
//     });
//     setEditModalOpen(true);
//   };

//   const updateSale = (key, value) => {
//     setSaleForm((prev) => ({ ...prev, [key]: value }));
//   };

//   const updateEdit = (key, value) => {
//     setEditForm((prev) => ({ ...prev, [key]: value }));
//   };

//   const createSale = async () => {
//     if (!canCreateSale) {
//       setMessage("You do not have permission to create sales.");
//       return;
//     }

//     setMessage("");
//     setActionLoading(true);

//     try {
//       const res = await saleApi.create({
//         customerName: saleForm.customerName,
//         customerEmail: saleForm.customerEmail,
//         customerPhone: saleForm.customerPhone,
//         items: [
//           {
//             inventoryId: selected._id,
//             quantity: Number(saleForm.quantity),
//             saleRate: Number(saleForm.saleRate),
//             gstPercent: Number(saleForm.gstPercent),
//             discountPercent: Number(saleForm.discountPercent)
//           }
//         ]
//       });

//       setSaleModalOpen(false);
//       navigate(`/sales/${res.sale._id}`);
//     } catch (err) {
//       setMessage(err.message);
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const updateInventory = async () => {
//     if (!canEditInventory) {
//       setMessage("You do not have permission to edit inventory.");
//       return;
//     }

//     setMessage("");
//     setActionLoading(true);

//     try {
//       await inventoryApi.update(selected._id, {
//         itemName: editForm.itemName,
//         itemDescription: editForm.itemDescription,
//         rate: Number(editForm.rate),
//         gstPercent: Number(editForm.gstPercent)
//       });

//       setEditModalOpen(false);
//       setSelected(null);
//       setMessage("Inventory item updated successfully.");
//       await load();
//     } catch (err) {
//       setMessage(err.message);
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   if (!canViewInventory) {
//     return (
//       <div className="space-y-5">
//         <div>
//           <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
//             Inventory
//           </h1>
//           <p className="mt-1 text-sm text-slate-500">
//             Accepted PO items become available inventory.
//           </p>
//         </div>

//         <Card className="border-amber-200 bg-amber-50 text-sm text-amber-800">
//           <p className="font-semibold">Access Restricted</p>
//           <p className="mt-1">
//             You do not have permission to view inventory.
//           </p>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-5">
//       <div>
//         <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
//           Inventory
//         </h1>
//         <p className="mt-1 text-sm text-slate-500">
//           Accepted PO items become available inventory.
//         </p>
//       </div>

//       {message ? (
//         <Card className="text-sm text-slate-700">{message}</Card>
//       ) : null}

//       {(!canEditInventory || !canCreateSale) ? (
//         <Card className="border-slate-200 bg-slate-50 text-xs text-slate-600">
//           Some actions may be disabled because your role does not have permission.
//         </Card>
//       ) : null}

//       <TableWrap>
//         <table className="min-w-[1200px] w-full text-left text-sm">
//           <thead className="bg-slate-50 text-xs uppercase text-slate-500">
//             <tr>
//               <th className="px-4 py-3">Item</th>
//               <th className="px-4 py-3">Source PO</th>
//               <th className="px-4 py-3">Vendor</th>
//               <th className="px-4 py-3">Purchased</th>
//               <th className="px-4 py-3">Available</th>
//               <th className="px-4 py-3">Reserved</th>
//               <th className="px-4 py-3">Sold</th>
//               <th className="px-4 py-3">Rate</th>
//               <th className="px-4 py-3">Inventory</th>
//               <th className="px-4 py-3">Tally</th>
//               <th className="px-4 py-3 text-right">Action</th>
//             </tr>
//           </thead>

//           <tbody className="divide-y divide-slate-100">
//             {loading ? (
//               <tr>
//                 <td className="px-4 py-6" colSpan="11">
//                   Loading...
//                 </td>
//               </tr>
//             ) : data.length === 0 ? (
//               <tr>
//                 <td className="px-4 py-6" colSpan="11">
//                   No inventory found.
//                 </td>
//               </tr>
//             ) : (
//               data.map((item) => {
//                 const hasAvailableQty = Number(item.availableQuantity || 0) > 0;

//                 return (
//                   <tr key={item._id} className="hover:bg-slate-50">
//                     <td className="px-4 py-3">
//                       <p className="font-semibold text-slate-900">
//                         {item.itemName || "-"}
//                       </p>

//                       <p className="text-xs text-slate-500">
//                         {item.itemCode || "-"}
//                       </p>

//                       {item.itemDescription ? (
//                         <p className="mt-1 max-w-xs text-xs leading-5 text-slate-600">
//                           {item.itemDescription}
//                         </p>
//                       ) : null}
//                     </td>

//                     <td className="px-4 py-3">{item.sourcePoNumber}</td>
//                     <td className="px-4 py-3">{item.vendorName}</td>
//                     <td className="px-4 py-3">{item.purchasedQuantity}</td>
//                     <td className="px-4 py-3 font-semibold">
//                       {item.availableQuantity}
//                     </td>
//                     <td className="px-4 py-3">{item.reservedQuantity}</td>
//                     <td className="px-4 py-3">{item.soldQuantity}</td>
//                     <td className="px-4 py-3">{currency(item.rate)}</td>
//                     <td className="px-4 py-3">
//                       <Badge value={item.inventoryStatus} />
//                     </td>
//                     <td className="px-4 py-3">
//                       <Badge value={item.tallyStatus} />
//                     </td>

//                     <td className="px-4 py-3">
//                       <div className="flex justify-end gap-2">
//                         <Button
//                           size="sm"
//                           variant="outline"
//                           disabled={!canEditInventory}
//                           title={
//                             canEditInventory
//                               ? "Edit inventory item"
//                               : "You do not have permission to edit inventory"
//                           }
//                           onClick={() => openEditModal(item)}
//                         >
//                           Edit
//                         </Button>

//                         <Button
//                           size="sm"
//                           disabled={!canCreateSale || !hasAvailableQty}
//                           title={
//                             !canCreateSale
//                               ? "You do not have permission to create sales"
//                               : !hasAvailableQty
//                                 ? "No available quantity"
//                                 : "Create sale from this inventory"
//                           }
//                           onClick={() => openSaleModal(item)}
//                         >
//                           Create Sale
//                         </Button>
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })
//             )}
//           </tbody>
//         </table>
//       </TableWrap>

//       <Modal
//         open={saleModalOpen}
//         title="Create Sale from Inventory"
//         onClose={() => setSaleModalOpen(false)}
//         footer={
//           <>
//             <Button variant="secondary" onClick={() => setSaleModalOpen(false)}>
//               Cancel
//             </Button>
//             <Button
//               onClick={createSale}
//               disabled={actionLoading || !canCreateSale}
//             >
//               {actionLoading ? "Creating..." : "Create Sale"}
//             </Button>
//           </>
//         }
//       >
//         {selected ? (
//           <div className="space-y-4">
//             <Card>
//               <p className="font-semibold text-slate-900">
//                 {selected.itemName}
//               </p>
//               <p className="text-sm text-slate-500">
//                 Available: {selected.availableQuantity} {selected.unit}
//               </p>
//             </Card>

//             <div className="grid gap-4 md:grid-cols-2">
//               <Input
//                 label="Customer Name"
//                 value={saleForm.customerName}
//                 onChange={(e) => updateSale("customerName", e.target.value)}
//                 required
//               />

//               <Input
//                 label="Customer Email"
//                 type="email"
//                 value={saleForm.customerEmail}
//                 onChange={(e) => updateSale("customerEmail", e.target.value)}
//                 required
//               />

//               <Input
//                 label="Customer Phone"
//                 value={saleForm.customerPhone}
//                 onChange={(e) => updateSale("customerPhone", e.target.value)}
//               />

//               <Input
//                 label="Quantity"
//                 type="number"
//                 value={saleForm.quantity}
//                 onChange={(e) => updateSale("quantity", e.target.value)}
//               />

//               <Input
//                 label="Sale Rate"
//                 type="number"
//                 value={saleForm.saleRate}
//                 onChange={(e) => updateSale("saleRate", e.target.value)}
//               />

//               <Input
//                 label="GST %"
//                 type="number"
//                 value={saleForm.gstPercent}
//                 onChange={(e) => updateSale("gstPercent", e.target.value)}
//               />

//               <Input
//                 label="Discount %"
//                 type="number"
//                 value={saleForm.discountPercent}
//                 onChange={(e) => updateSale("discountPercent", e.target.value)}
//               />
//             </div>
//           </div>
//         ) : null}
//       </Modal>

//       <Modal
//         open={editModalOpen}
//         title="Edit Inventory Item"
//         onClose={() => setEditModalOpen(false)}
//         footer={
//           <>
//             <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
//               Cancel
//             </Button>
//             <Button
//               onClick={updateInventory}
//               disabled={actionLoading || !canEditInventory}
//             >
//               {actionLoading ? "Saving..." : "Save Changes"}
//             </Button>
//           </>
//         }
//       >
//         {selected ? (
//           <div className="space-y-4">
//             <Card>
//               <p className="font-semibold text-slate-900">
//                 {selected.itemCode || "-"}
//               </p>
//               <p className="text-sm text-slate-500">
//                 Source PO: {selected.sourcePoNumber || "-"}
//               </p>
//             </Card>

//             <div className="grid gap-4 md:grid-cols-2">
//               <Input
//                 label="Item Name"
//                 value={editForm.itemName}
//                 onChange={(e) => updateEdit("itemName", e.target.value)}
//               />

//               <Input
//                 label="Rate"
//                 type="number"
//                 value={editForm.rate}
//                 onChange={(e) => updateEdit("rate", e.target.value)}
//               />

//               <Input
//                 label="GST %"
//                 type="number"
//                 value={editForm.gstPercent}
//                 onChange={(e) => updateEdit("gstPercent", e.target.value)}
//               />

//               <div className="md:col-span-2">
//                 <Input
//                   label="Description"
//                   value={editForm.itemDescription}
//                   onChange={(e) =>
//                     updateEdit("itemDescription", e.target.value)
//                   }
//                 />
//               </div>
//             </div>
//           </div>
//         ) : null}
//       </Modal>
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Modal from "../components/Modal";
import TableWrap from "../components/TableWrap";
import { inventoryApi, saleApi } from "../api/api";
import { currency, formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

export default function Inventory() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canViewInventory = hasPermission("inventory.view");
  const canEditInventory = hasPermission("inventory.edit");
  const canCreateSale = hasPermission("sales.create");

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);

  const [saleForm, setSaleForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    quantity: 1,
    saleRate: 0,
    gstPercent: 18,
    discountPercent: 0,
  });

  const [editForm, setEditForm] = useState({
    itemName: "",
    itemDescription: "",
    rate: 0,
    gstPercent: 18,
  });

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!canViewInventory) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await inventoryApi.list({ page: 1, pageSize: 100 });
      setData(res.data || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [canViewInventory]);

  // const isIncomingStock = (item) => {
  //   return item.vendorStockStatus === "incoming" || item.inventoryStatus === "incoming";
  // };

  const openSaleModal = (item) => {
    setMessage("");

    if (!canCreateSale) {
      setMessage("You do not have permission to create sales.");
      return;
    }

    if (Number(item.availableQuantity || 0) <= 0) {
      setMessage("This inventory item has no available quantity.");
      return;
    }

    // if (isIncomingStock(item)) {
    //   setMessage("This item is incoming stock. Sale can be created only after stock is ready.");
    //   return;
    // }

    setSelected(item);
    setSaleForm({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      quantity: 1,
      saleRate: item.rate || 0,
      gstPercent: item.gstPercent || 18,
      discountPercent: 0,
    });
    setSaleModalOpen(true);
  };

  const openEditModal = (item) => {
    setMessage("");

    if (!canEditInventory) {
      setMessage("You do not have permission to edit inventory.");
      return;
    }

    setSelected(item);
    setEditForm({
      itemName: item.itemName || "",
      itemDescription: item.itemDescription || "",
      rate: item.rate || 0,
      gstPercent: item.gstPercent || 18,
    });
    setEditModalOpen(true);
  };

  const updateSale = (key, value) => {
    setSaleForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateEdit = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const createSale = async () => {
    if (!canCreateSale) {
      setMessage("You do not have permission to create sales.");
      return;
    }

    // if (selected && isIncomingStock(selected)) {
    //   setMessage("This item is incoming stock. Sale can be created only after stock is ready.");
    //   return;
    // }

    setMessage("");
    setActionLoading(true);

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
            discountPercent: Number(saleForm.discountPercent),
          },
        ],
      });

      setSaleModalOpen(false);
      navigate(`/sales/${res.sale._id}`);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const updateInventory = async () => {
    if (!canEditInventory) {
      setMessage("You do not have permission to edit inventory.");
      return;
    }

    setMessage("");
    setActionLoading(true);

    try {
      await inventoryApi.update(selected._id, {
        itemName: editForm.itemName,
        itemDescription: editForm.itemDescription,
        rate: Number(editForm.rate),
        gstPercent: Number(editForm.gstPercent),
      });

      setEditModalOpen(false);
      setSelected(null);
      setMessage("Inventory item updated successfully.");
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!canViewInventory) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Vendor accepted PO items become inventory.
          </p>
        </div>

        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-800">
          <p className="font-semibold">Access Restricted</p>
          <p className="mt-1">You do not have permission to view inventory.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Inventory
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Vendor accepted PO items appear here as ready stock or incoming stock.
        </p>
      </div>

      {message ? <Card className="text-sm text-slate-700">{message}</Card> : null}

      {!canEditInventory || !canCreateSale ? (
        <Card className="border-slate-200 bg-slate-50 text-xs text-slate-600">
          Some actions may be disabled because your role does not have permission.
        </Card>
      ) : null}

      <TableWrap>
        <table className="min-w-[1500px] w-full text-left text-sm">
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
              <th className="px-4 py-3">Vendor Stock</th>
              <th className="px-4 py-3">Incoming Days</th>
              <th className="px-4 py-3">Expected Date</th>
              <th className="px-4 py-3">Inventory</th>
              <th className="px-4 py-3">Tally</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan="14">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan="14">
                  No inventory found.
                </td>
              </tr>
            ) : (
              data.map((item) => {
                // const hasAvailableQty = Number(item.availableQuantity || 0) > 0;
                // const incoming = isIncomingStock(item);
                // const canCreateSaleFromItem = canCreateSale && hasAvailableQty && !incoming;

                const hasAvailableQty = Number(item.availableQuantity || 0) > 0;
                const canCreateSaleFromItem = canCreateSale && hasAvailableQty;

                return (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {item.itemName || "-"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.itemCode || "-"}
                      </p>
                      {item.itemDescription ? (
                        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-600">
                          {item.itemDescription}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">{item.sourcePoNumber || "-"}</td>
                    <td className="px-4 py-3">{item.vendorName || "-"}</td>
                    <td className="px-4 py-3">{item.purchasedQuantity}</td>
                    <td className="px-4 py-3 font-semibold">
                      {item.availableQuantity}
                    </td>
                    <td className="px-4 py-3">{item.reservedQuantity}</td>
                    <td className="px-4 py-3">{item.soldQuantity}</td>
                    <td className="px-4 py-3">{currency(item.rate)}</td>

                    <td className="px-4 py-3">
                      <Badge value={item.vendorStockStatus || item.inventoryStatus} />
                    </td>

                    <td className="px-4 py-3">
                      {item.incomingDays ? `${item.incomingDays} days` : "-"}
                    </td>

                    <td className="px-4 py-3">
                      {formatDate(item.expectedAvailabilityDate)}
                    </td>

                    <td className="px-4 py-3">
                      <Badge value={item.inventoryStatus} />
                    </td>

                    <td className="px-4 py-3">
                      <Badge value={item.tallyStatus} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canEditInventory}
                          title={
                            canEditInventory
                              ? "Edit inventory item"
                              : "You do not have permission to edit inventory"
                          }
                          onClick={() => openEditModal(item)}
                        >
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          disabled={!canCreateSaleFromItem}
                          // title={
                          //   !canCreateSale
                          //     ? "You do not have permission to create sales"
                          //     : !hasAvailableQty
                          //       ? "No available quantity"
                          //       : incoming
                          //         ? "Incoming stock cannot be sold yet"
                          //         : "Create sale from this inventory"
                          // }
                          title={
                            !canCreateSale
                              ? "You do not have permission to create sales"
                              : !hasAvailableQty
                                ? "No available quantity"
                                : "Create sale from this inventory"
                          }
                          onClick={() => openSaleModal(item)}
                        >
                          Create Sale
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableWrap>

      <Modal
        open={saleModalOpen}
        title="Create Sale from Inventory"
        onClose={() => setSaleModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSaleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createSale} disabled={actionLoading || !canCreateSale}>
              {actionLoading ? "Creating..." : "Create Sale"}
            </Button>
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
              <p className="mt-1 text-sm text-slate-500">
                Stock:{" "}
                <span className="font-semibold">
                  {(selected.vendorStockStatus || selected.inventoryStatus || "-").replaceAll(
                    "_",
                    " ",
                  )}
                </span>
              </p>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Customer Name"
                value={saleForm.customerName}
                onChange={(e) => updateSale("customerName", e.target.value)}
                required
              />

              <Input
                label="Customer Email"
                type="email"
                value={saleForm.customerEmail}
                onChange={(e) => updateSale("customerEmail", e.target.value)}
                required
              />

              <Input
                label="Customer Phone"
                type="tel"
                maxLength={10}
                value={saleForm.customerPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                  updateSale("customerPhone", value);
                }}
              />

              <Input
                label="Quantity"
                type="number"
                value={saleForm.quantity}
                onChange={(e) => updateSale("quantity", e.target.value)}
              />

              <Input
                label="Sale Rate"
                type="number"
                value={saleForm.saleRate}
                onChange={(e) => updateSale("saleRate", e.target.value)}
              />

              <Input
                label="GST %"
                type="number"
                value={saleForm.gstPercent}
                onChange={(e) => updateSale("gstPercent", e.target.value)}
              />

              <Input
                label="Discount %"
                type="number"
                value={saleForm.discountPercent}
                onChange={(e) => updateSale("discountPercent", e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={editModalOpen}
        title="Edit Inventory Item"
        onClose={() => setEditModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateInventory} disabled={actionLoading || !canEditInventory}>
              {actionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <Card>
              <p className="font-semibold text-slate-900">
                {selected.itemCode || "-"}
              </p>
              <p className="text-sm text-slate-500">
                Source PO: {selected.sourcePoNumber || "-"}
              </p>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Item Name"
                value={editForm.itemName}
                onChange={(e) => updateEdit("itemName", e.target.value)}
              />

              <Input
                label="Rate"
                type="number"
                value={editForm.rate}
                onChange={(e) => updateEdit("rate", e.target.value)}
              />

              <Input
                label="GST %"
                type="number"
                value={editForm.gstPercent}
                onChange={(e) => updateEdit("gstPercent", e.target.value)}
              />

              <div className="md:col-span-2">
                <Input
                  label="Description"
                  value={editForm.itemDescription}
                  onChange={(e) => updateEdit("itemDescription", e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}