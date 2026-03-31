import { createBrowserRouter } from "react-router";
import { AuthWrapper } from "./components/AuthWrapper";
import { RootLayout } from "./components/RootLayout";
import { HomePage } from "./components/HomePage";
import { LoginPage } from "./components/LoginPage";
import { NotFoundPage } from "./components/NotFoundPage";

// B2B Customer Routes
import { CatalogPage } from "./components/customer/CatalogPage";
import { MyOrdersPage } from "./components/customer/MyOrdersPage";
import { CartPage } from "./components/customer/CartPage";

// Admin Routes
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { PreordersListPage } from "./components/admin/PreordersListPage";
import { ConsolidationPage } from "./components/admin/ConsolidationPage";
import { DeliveriesPage } from "./components/admin/DeliveriesPage";
import { AllocationPage } from "./components/admin/AllocationPage";
import { CustomersManagementPage } from "./components/admin/CustomersManagementPage";
import { OrderConfigurator } from "./components/admin/OrderConfigurator";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AuthWrapper,
    children: [
      {
        path: "/",
        Component: RootLayout,
        children: [
          { index: true, Component: HomePage },
          { path: "login", Component: LoginPage },
          
          // B2B Customer Routes
          { path: "catalog", Component: CatalogPage },
          { path: "my-orders", Component: MyOrdersPage },
          { path: "cart", Component: CartPage },
          
          // Admin Routes
          { path: "admin", Component: AdminDashboard },
          { path: "admin/preorders", Component: PreordersListPage },
          { path: "admin/consolidation", Component: ConsolidationPage },
          { path: "admin/deliveries", Component: DeliveriesPage },
          { path: "admin/allocation/:deliveryId", Component: AllocationPage },
          { path: "admin/customers", Component: CustomersManagementPage },
          { path: "admin/order-configurator", Component: OrderConfigurator },
          
          // 404
          { path: "*", Component: NotFoundPage },
        ],
      },
    ],
  },
]);