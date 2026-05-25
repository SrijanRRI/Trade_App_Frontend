import { useEffect, useState } from "react";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Modal from "../components/Modal";
import TableWrap from "../components/TableWrap";
import { inventoryApi } from "../api/api";
import { currency, formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

export default function Inventory() {
  const { hasPermission } = useAuth();

  const canViewInventory = hasPermission("inventory.view");
  const canEditInventory = hasPermission("inventory.edit");

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);

  const [editForm, setEditForm] = useState({
    itemName: "",
    itemDescription: "",
    rate: 0,
    gstPercent: 18,
  });

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
      const res = await inventoryApi.list({
        page: 1,
        pageSize: 500,
      });
      
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

  const updateEdit = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
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

      {!canEditInventory ? (
        <Card className="border-slate-200 bg-slate-50 text-xs text-slate-600">
          Edit action is disabled because your role does not have permission.
        </Card>
      ) : null}

      <TableWrap>
        <table className="min-w-[1350px] w-full text-left text-sm">
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
              data.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">
                      {item.itemName || "-"}
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

                  <td className="px-4 py-3 text-right">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>

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