// Mock data for the B2B Preorder System
// Using real SKU data from Brooks catalog

export type UserRole = 'admin' | 'b2b_customer';

export type PreorderSeason = 'spring' | 'winter';
export type DebtDecision = 'not_required' | 'pending_review' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyName?: string;
  priority?: number; // 1-5, where 1 is highest priority
  debtAmountPln?: number;
  debtSince?: string;
  allowOrders?: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  availableStock: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  imageUrl: string;
  basePrice: number;
  variants: ProductVariant[];
  season: string;
  expectedDeliveryDate?: string;
}

export interface CartItem {
  variantId: string;
  productId: string;
  quantity: number;
}

export interface PreorderItem {
  id: string;
  variantId: string;
  productId: string;
  quantity: number;
  quantityAllocated: number;
  quantityDelivered: number;
}

export interface Preorder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  companyName: string;
  priority: number;
  customerPriority: number;
  items: PreorderItem[];
  status: 'pending' | 'partially_allocated' | 'allocated' | 'partially_delivered' | 'completed' | 'cancelled';
  createdAt: string;
  notes?: string;
  allocationOrder?: number;
  seasonWindow?: PreorderSeason;
  deliveryMonth?: number;
  debtDecision: DebtDecision;
  debtDecisionAt?: string;
  debtDecisionBy?: string;
}

export interface ConsolidatedOrder {
  id: string;
  supplier: string;
  brand: string;
  status: 'draft' | 'sent' | 'confirmed' | 'delivered';
  items: {
    variantId: string;
    productId: string;
    quantity: number;
  }[];
  createdAt: string;
  sentAt?: string;
  expectedDeliveryDate?: string;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  supplier: string;
  brand: string;
  consolidatedOrderId?: string;
  status: 'announced' | 'in_allocation' | 'allocated' | 'received';
  items: {
    variantId: string;
    productId: string;
    quantityAnnounced: number;
    quantityAllocated?: number;
  }[];
  invoiceNumber?: string;
  expectedDate?: string;
  receivedDate?: string;
  createdAt: string;
  matchedOrderSummary?: DeliveryOrderMatchSummary[];
  awizementAllocationPlan?: Record<string, DeliveryAwizmentMatch[]>;
}

export interface DeliveryAwizmentMatch {
  orderId: string;
  orderNumber: string;
  requested: number;
}

export interface DeliveryOrderMatchSummary {
  orderNumber: string;
  orderId?: string;
  companyName?: string;
  requested: number;
  totalOrderQuantity: number;
  allocationRate: number;
}

export interface AllocationItem {
  preorderId: string;
  variantId: string;
  quantity: number;
}

// Import data generation functions
import {
  generateProducts,
  generateCustomers,
  generatePreorders,
  generateConsolidatedOrders,
  generateDeliveries
} from './generate-mock-data';

// Generate all data
const generatedProducts = generateProducts();
const generatedCustomers = generateCustomers();
const generatedPreorders = generatePreorders(generatedCustomers, generatedProducts);
const generatedConsolidatedOrders = generateConsolidatedOrders(generatedPreorders, generatedProducts);
const generatedDeliveries = generateDeliveries(generatedProducts, generatedPreorders);

// Export mock data
export const mockUsers: User[] = [
  {
    id: 'admin-1',
    email: 'admin@brookspl.com',
    name: 'Jan Kowalski',
    role: 'admin',
  },
  ...generatedCustomers
];

export const mockProducts: Product[] = generatedProducts;
export const mockPreorders: Preorder[] = generatedPreorders;
export const mockConsolidatedOrders: ConsolidatedOrder[] = generatedConsolidatedOrders;
export const mockDeliveries: Delivery[] = generatedDeliveries;
