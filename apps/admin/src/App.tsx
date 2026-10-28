import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminShell } from './components/AdminShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { ContentPage } from './pages/ContentPage';
import { AdminsPage } from './pages/AdminsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import {
  CouponsPage,
  CustomersPage,
  InventoryPage,
  ReportsPage,
  SettingsPage,
} from './pages/OtherPages';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AdminShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:productId/edit" element={<ProductFormPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:orderId" element={<OrderDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="audit" element={<AuditLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
