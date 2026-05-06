// import { useEffect, useState } from "react";
// import { Link } from "react-router-dom";
// import { Plus, RefreshCw, Search } from "lucide-react";
// import Button from "../components/Button";
// import Badge from "../components/Badge";
// import Card from "../components/Card";
// import Input from "../components/Input";
// import TableWrap from "../components/TableWrap";
// import { purchaseOrderApi } from "../api/api";
// import { currency, formatDate } from "../utils/format";
// import { useAuth } from "../context/AuthContext";

// export default function PurchaseOrders() {

//   const { hasPermission } = useAuth();

//   const canCreatePurchase = hasPermission("purchase.create");
//   const canViewPurchase = hasPermission("purchase.view");

//   const [data, setData] = useState([]);
//   const [search, setSearch] = useState("");
//   const [status, setStatus] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState("");

//   const load = async () => {
//     setLoading(true);
//     try {
//       const res = await purchaseOrderApi.list({
//         page: 1,
//         pageSize: 50,
//         search,
//         status
//       });
//       setData(res.data || []);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load();
//   }, []);

//   const seedDummy = async () => {
//     if (!canCreatePurchase) {
//       setMessage("You do not have permission to create or seed purchase orders.");
//       return;
//     }

//     setMessage("");
//     try {
//       const res = await purchaseOrderApi.seedDummy();
//       setMessage(res.message);
//       await load();
//     } catch (err) {
//       setMessage(err.message);
//     }
//   };

//   const applySearch = (e) => {
//     e.preventDefault();
//     load();
//   };

//   return (
//     <div className="space-y-5">
//       <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
//         <div>
//           <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
//             Purchase Orders
//           </h1>
//           <p className="mt-1 text-sm text-slate-500">
//             Dummy PO data now. External API import can be added later.
//           </p>
//         </div>

//         {/* <div className="flex flex-wrap gap-2">
//           <Button variant="secondary" onClick={seedDummy}>
//             <RefreshCw size={16} className="mr-2" />
//             Seed Dummy PO
//           </Button>

//           <Link to="/purchase-orders/create">
//             <Button>
//               <Plus size={16} className="mr-2" />
//               Create PO
//             </Button>
//           </Link>
//         </div> */}

//         <div className="flex flex-wrap gap-2">
//           <Button
//             variant="secondary"
//             onClick={seedDummy}
//             disabled={!canCreatePurchase}
//             title={
//               canCreatePurchase
//                 ? "Seed dummy purchase orders"
//                 : "You do not have permission to create purchase orders"
//             }
//           >
//             <RefreshCw size={16} className="mr-2" />
//             Seed Dummy PO
//           </Button>

//           {canCreatePurchase ? (
//             <Link to="/purchase-orders/create">
//               <Button>
//                 <Plus size={16} className="mr-2" />
//                 Create PO
//               </Button>
//             </Link>
//           ) : (
//             <Button
//               disabled
//               title="You do not have permission to create purchase orders"
//             >
//               <Plus size={16} className="mr-2" />
//               Create PO
//             </Button>
//           )}
//         </div>
//       </div>

//       {message ? (
//         <Card className="text-sm text-slate-700">{message}</Card>
//       ) : null}

//       <Card>
//         <form onSubmit={applySearch} className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
//           <Input
//             placeholder="Search PO number, vendor code or vendor name"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//           />

//           <select
//             className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
//             value={status}
//             onChange={(e) => setStatus(e.target.value)}
//           >
//             <option value="">All Status</option>
//             <option value="pending_review">Pending Review</option>
//             <option value="accepted">Accepted</option>
//             <option value="partially_accepted">Partially Accepted</option>
//             <option value="rejected">Rejected</option>
//             <option value="moved_to_inventory">Moved to Inventory</option>
//           </select>

//           <Button type="submit">
//             <Search size={16} className="mr-2" />
//             Search
//           </Button>
//         </form>
//       </Card>

//       <TableWrap>
//         <table className="min-w-[1000px] w-full text-left text-sm">
//           <thead className="bg-slate-50 text-xs uppercase text-slate-500">
//             <tr>
//               <th className="px-4 py-3">PO Number</th>
//               <th className="px-4 py-3">PO Date</th>
//               <th className="px-4 py-3">Vendor</th>
//               <th className="px-4 py-3">Source</th>
//               <th className="px-4 py-3">Amount</th>
//               <th className="px-4 py-3">PO Status</th>
//               <th className="px-4 py-3">Inventory</th>
//               <th className="px-4 py-3">Tally</th>
//               <th className="px-4 py-3 text-right">Action</th>
//             </tr>
//           </thead>

//           <tbody className="divide-y divide-slate-100">
//             {loading ? (
//               <tr>
//                 <td className="px-4 py-6" colSpan="9">
//                   Loading...
//                 </td>
//               </tr>
//             ) : data.length === 0 ? (
//               <tr>
//                 <td className="px-4 py-6" colSpan="9">
//                   No purchase orders found.
//                 </td>
//               </tr>
//             ) : (
//               data.map((po) => (
//                 <tr key={po._id} className="hover:bg-slate-50">
//                   <td className="px-4 py-3 font-semibold text-slate-900">
//                     {po.poNumber}
//                   </td>
//                   <td className="px-4 py-3">{formatDate(po.poDate)}</td>
//                   <td className="px-4 py-3">
//                     <p className="font-medium text-slate-900">{po.vendorName}</p>
//                     <p className="text-xs text-slate-500">{po.vendorCode}</p>
//                   </td>
//                   <td className="px-4 py-3">{po.sourceType}</td>
//                   <td className="px-4 py-3">{currency(po.amount?.total)}</td>
//                   <td className="px-4 py-3"><Badge value={po.status} /></td>
//                   <td className="px-4 py-3"><Badge value={po.inventoryStatus} /></td>
//                   <td className="px-4 py-3"><Badge value={po.tallyStatus} /></td>
//                   <td className="px-4 py-3 text-right">
//                     {/* <Link to={`/purchase-orders/${po._id}`}>
//                       <Button size="sm" variant="outline">View</Button>
//                     </Link> */}

//                     {canViewPurchase ? (
//                       <Link to={`/purchase-orders/${po._id}`}>
//                         <Button size="sm" variant="outline">View</Button>
//                       </Link>
//                     ) : (
//                       <Button
//                         size="sm"
//                         variant="outline"
//                         disabled
//                         title="You do not have permission to view purchase order details"
//                       >
//                         View
//                       </Button>
//                     )}
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </TableWrap>
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw, Search } from "lucide-react";
import Button from "../components/Button";
import Badge from "../components/Badge";
import Card from "../components/Card";
import Input from "../components/Input";
import TableWrap from "../components/TableWrap";
import { purchaseOrderApi } from "../api/api";
import { currency, formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

export default function PurchaseOrders() {
  const { hasPermission } = useAuth();

  const canCreatePurchase = hasPermission("purchase.create");
  const canViewPurchase = hasPermission("purchase.view");

  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await purchaseOrderApi.list({
        page: 1,
        pageSize: 50,
        search,
        status,
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
  }, []);

  const seedDummy = async () => {
    if (!canCreatePurchase) {
      setMessage("You do not have permission to create or seed purchase orders.");
      return;
    }

    setMessage("");
    try {
      const res = await purchaseOrderApi.seedDummy();
      setMessage(res.message);
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const applySearch = (e) => {
    e.preventDefault();
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Purchase Orders
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Vendor approval based purchase order workflow.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={seedDummy}
            disabled={!canCreatePurchase}
            title={
              canCreatePurchase
                ? "Seed dummy purchase orders"
                : "You do not have permission to create purchase orders"
            }
          >
            <RefreshCw size={16} className="mr-2" />
            Seed Dummy PO
          </Button>

          {canCreatePurchase ? (
            <Link to="/purchase-orders/create">
              <Button>
                <Plus size={16} className="mr-2" />
                Create PO
              </Button>
            </Link>
          ) : (
            <Button disabled title="You do not have permission to create purchase orders">
              <Plus size={16} className="mr-2" />
              Create PO
            </Button>
          )}
        </div>
      </div>

      {message ? <Card className="text-sm text-slate-700">{message}</Card> : null}

      <Card>
        <form
          onSubmit={applySearch}
          className="grid gap-3 md:grid-cols-[1fr_240px_auto]"
        >
          <Input
            placeholder="Search PO number, vendor code, vendor name or vendor email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="pending_vendor_approval">Pending Vendor Approval</option>
            <option value="vendor_accepted">Vendor Accepted</option>
            <option value="vendor_rejected">Rejected PO</option>
            <option value="moved_to_inventory">Moved to Inventory</option>
            <option value="closed">Closed</option>
          </select>

          <Button type="submit">
            <Search size={16} className="mr-2" />
            Search
          </Button>
        </form>
      </Card>

      <TableWrap>
        <table className="min-w-[1400px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">PO Number</th>
              <th className="px-4 py-3">PO Date</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Vendor Contact</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">PO Status</th>
              <th className="px-4 py-3">Vendor Approval</th>
              <th className="px-4 py-3">Stock Status</th>
              <th className="px-4 py-3">Incoming Days</th>
              <th className="px-4 py-3">Inventory</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan="12">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan="12">
                  No purchase orders found.
                </td>
              </tr>
            ) : (
              data.map((po) => (
                <tr key={po._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {po.poNumber}
                  </td>

                  <td className="px-4 py-3">{formatDate(po.poDate)}</td>

                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {po.vendorName || "-"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {po.vendorCode || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">
                      {po.vendorEmail || "-"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {po.vendorPhone || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">{po.sourceType || "-"}</td>

                  <td className="px-4 py-3">{currency(po.amount?.total)}</td>

                  <td className="px-4 py-3">
                    <Badge value={po.status} />
                  </td>

                  <td className="px-4 py-3">
                    <Badge value={po.vendorApproval?.status || "pending"} />
                  </td>

                  <td className="px-4 py-3">
                    {po.vendorApproval?.decision ? (
                      <Badge value={po.vendorApproval.decision} />
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {po.vendorApproval?.incomingDays
                      ? `${po.vendorApproval.incomingDays} days`
                      : "-"}
                  </td>

                  <td className="px-4 py-3">
                    <Badge value={po.inventoryStatus} />
                  </td>

                  <td className="px-4 py-3 text-right">
                    {canViewPurchase ? (
                      <Link to={`/purchase-orders/${po._id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        title="You do not have permission to view purchase order details"
                      >
                        View
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}