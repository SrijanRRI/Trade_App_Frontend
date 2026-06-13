import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail";
import CreatePO from "./pages/CreatePO";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import SaleDetail from "./pages/SaleDetail";
import ClientAcceptance from "./pages/ClientAcceptance";
import TallyLogs from "./pages/TallyLogs";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import VendorPOApproval from "./pages/VendorPOApproval";
import CreateSalesOrder from "./pages/CreateSalesOrder";
import CreateBills from "./pages/CreateBills";

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicOnly({ children }) {
  const { token, loading } = useAuth();

  if (loading) return null;

  if (token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />

      <Route path="/client-acceptance/:token" element={<ClientAcceptance />} />
      <Route path="/vendor-po-approval/:token" element={<VendorPOApproval />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="purchase-orders/create" element={<CreatePO />} />
        <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="sales" element={<Sales />} />
        <Route path="sales/create" element={<CreateSalesOrder />} />
        <Route path="sales/:id" element={<SaleDetail />} />
        <Route path="tally-logs" element={<TallyLogs />} />
        <Route path="reports" element={<Reports />} />
        <Route path="admin" element={<Admin />} />
        <Route path="create-Tally-bills" element={<CreateBills />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}