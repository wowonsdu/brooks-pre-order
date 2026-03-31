import { useSyncExternalStore } from 'react';
import { mockProducts, mockUsers, mockPreorders, mockConsolidatedOrders, mockDeliveries } from './mock-data';
import type { ConsolidatedOrder, Delivery, Preorder, PreorderSeason, PreorderItem, User } from './mock-data';

const DEMO_STATE_STORAGE_KEY = 'brooks-preorder-demo-state-v1';

const MONTH_IN_SEASON_SPRING = [10, 11, 0, 1, 2];
const MONTH_IN_SEASON_WINTER = [4, 5, 6, 7, 8];

type DemoState = {
  preorders: Preorder[];
  users: User[];
  consolidatedOrders: ConsolidatedOrder[];
  deliveries: Delivery[];
};

type Listener = () => void;

const listeners = new Set<Listener>();

const parseStoredState = (): DemoState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEMO_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const clone = <T,>(value: T): T => structuredClone(value);

const assignAllocationOrder = (preorders: Preorder[]) => {
  preorders.forEach((preorder, index) => {
    preorder.allocationOrder = preorder.allocationOrder ?? index + 1;
  });
  preorders.sort((a, b) => (a.allocationOrder ?? 0) - (b.allocationOrder ?? 0));
  preorders.forEach((preorder, index) => {
    preorder.allocationOrder = index + 1;
  });
};

const normalizePreorders = (preorders: Preorder[]) =>
  preorders.map((preorder, index) => {
    const customerPriority = preorder.customerPriority ?? preorder.priority ?? 5;
    return {
      ...preorder,
      priority: preorder.priority ?? customerPriority,
      customerPriority,
      seasonWindow: preorder.seasonWindow ?? 'spring',
      deliveryMonth: preorder.deliveryMonth ?? ((index + 1) % 12),
    } satisfies Preorder;
  });

const getProductDeliveryMonth = (productId: string, variantId: string) => {
  const product = mockProducts.find((item) => item.id === productId);
  const variant = product?.variants.find((item) => item.id === variantId);
  if (!product?.expectedDeliveryDate) {
    return undefined;
  }

  const month = new Date(product.expectedDeliveryDate).getMonth();
  return Number.isNaN(month) ? undefined : month;
};

const seasonWindowFromMonth = (monthIndex: number): PreorderSeason => {
  if (MONTH_IN_SEASON_SPRING.includes(monthIndex)) {
    return 'spring';
  }
  if (MONTH_IN_SEASON_WINTER.includes(monthIndex)) {
    return 'winter';
  }
  return 'spring';
};

const summarizeDeliveryWindow = (lines: Array<{ productId: string; variantId: string }>) => {
  const counts = new Map<number, number>();

  lines.forEach((line) => {
    const month = getProductDeliveryMonth(line.productId, line.variantId);
    if (month === undefined) return;
    counts.set(month, (counts.get(month) ?? 0) + 1);
  });

  if (counts.size === 0) {
    const month = new Date(0).getMonth();
    return {
      seasonWindow: seasonWindowFromMonth(month),
      deliveryMonth: month,
    };
  }

  let preferredMonth = -1;
  let maxCount = -1;
  counts.forEach((qty, month) => {
    if (qty > maxCount) {
      preferredMonth = month;
      maxCount = qty;
    }
  });

  const month = preferredMonth === -1 ? new Date(0).getMonth() : preferredMonth;
  return {
    seasonWindow: seasonWindowFromMonth(month),
    deliveryMonth: month,
  };
};

const nextPreorderNumber = (preorders: Preorder[]) => {
  const years = new Date().getFullYear();
  const highestSuffix = preorders
    .map((po) => {
      const match = po.orderNumber.match(/PO-(\d{4})-(\d+)/);
      return match ? Number.parseInt(match[2], 10) : 0;
    })
    .filter((num) => Number.isFinite(num))
    .sort((a, b) => b - a)[0] ?? 0;

  const suffix = String(highestSuffix + 1).padStart(4, '0');
  return `PO-${years}-${suffix}`;
};

const normalizeUsers = (users: User[]) =>
  users.map(user => {
    if (user.role !== 'b2b_customer') return user;
    return {
      ...user,
      priority: user.priority ?? 5,
    };
  });

const seedState: DemoState = {
  preorders: [],
  users: [],
  consolidatedOrders: [],
  deliveries: [],
};

const hydratePreorders = (): DemoState => {
  const persisted = parseStoredState();

  if (persisted) {
    const mergedPreorders = normalizePreorders(
      persisted.preorders.length > 0
        ? persisted.preorders
        : mockPreorders
    );
    const mergedUsers = normalizeUsers(
      persisted.users.length > 0 ? persisted.users : mockUsers
    );
    const mergedConsolidated = persisted.consolidatedOrders ?? mockConsolidatedOrders;
    const mergedDeliveries = persisted.deliveries ?? mockDeliveries;

    return {
      preorders: mergedPreorders,
      users: mergedUsers,
      consolidatedOrders: mergedConsolidated.map((order) => ({ ...order })),
      deliveries: mergedDeliveries.map((delivery) => ({ ...delivery })),
    };
  }

  const seededPreorders = normalizePreorders(clone(mockPreorders));
  assignAllocationOrder(seededPreorders);

  return {
    preorders: seededPreorders,
    users: normalizeUsers(clone(mockUsers)),
    consolidatedOrders: clone(mockConsolidatedOrders),
    deliveries: clone(mockDeliveries),
  };
};

let state: DemoState = {
  preorders: [],
  users: [],
  consolidatedOrders: [],
  deliveries: [],
};

let initialized = false;

const ensureSeeded = () => {
  if (initialized) return;
  state = hydratePreorders();
  initialized = true;
  persistState();
};

const notify = () => {
  listeners.forEach((listener) => listener());
};

const persistState = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_STATE_STORAGE_KEY, JSON.stringify({
    preorders: state.preorders,
    users: state.users,
    consolidatedOrders: state.consolidatedOrders,
    deliveries: state.deliveries,
  }));
};

const updateState = (draft: (current: DemoState) => void) => {
  ensureSeeded();
  const next = {
    preorders: state.preorders.map((preorder) => ({ ...preorder })),
    users: state.users.map((user) => ({ ...user })),
    consolidatedOrders: state.consolidatedOrders.map((order) => ({ ...order })),
    deliveries: state.deliveries.map((delivery) => ({ ...delivery })),
  };
  draft(next);
  state = next;
  persistState();
  notify();
};

const useDemoState = <T,>(selector: (snapshot: DemoState) => T): T =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => {
      ensureSeeded();
      return selector(state);
    },
    () => selector(seedState),
  );

export const usePreorders = () => useDemoState((snapshot) => snapshot.preorders);
export const useCustomers = () => useDemoState((snapshot) => snapshot.users.filter((user) => user.role === 'b2b_customer'));
export const useCustomersAll = () => useDemoState((snapshot) => snapshot.users);
export const useConsolidatedOrders = () => useDemoState((snapshot) => snapshot.consolidatedOrders);
export const useDeliveries = () => useDemoState((snapshot) => snapshot.deliveries);

export const reorderPreorders = (sourcePreorderId: string, targetPreorderId: string) => {
  if (sourcePreorderId === targetPreorderId) return;

  updateState((draft) => {
    const fromIndex = draft.preorders.findIndex((item) => item.id === sourcePreorderId);
    const toIndex = draft.preorders.findIndex((item) => item.id === targetPreorderId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = draft.preorders.splice(fromIndex, 1);
    const nextIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    draft.preorders.splice(nextIndex, 0, moved);
    assignAllocationOrder(draft.preorders);
  });
};

export const setPreorderPriority = (preorderId: string, priority: number) => {
  const normalizedPriority = Math.min(5, Math.max(1, priority));
  updateState((draft) => {
    draft.preorders = draft.preorders.map((preorder) =>
      preorder.id === preorderId
        ? {
            ...preorder,
            priority: normalizedPriority,
          }
        : preorder
    );
  });
};

export const setPreorderSeasonWindow = (preorderId: string, seasonWindow: PreorderSeason) => {
  updateState((draft) => {
    draft.preorders = draft.preorders.map((preorder) =>
      preorder.id === preorderId
        ? {
            ...preorder,
            seasonWindow,
            priority: preorder.priority,
          }
        : preorder
    );
  });
};

export const setCustomerPriority = (customerId: string, priority: number) => {
  const normalizedPriority = Math.min(5, Math.max(1, priority));
  updateState((draft) => {
    draft.users = draft.users.map((user) =>
      user.id === customerId && user.role === 'b2b_customer'
        ? { ...user, priority: normalizedPriority }
        : user
    );

    draft.preorders = draft.preorders.map((preorder) =>
      preorder.customerId === customerId
        ? {
            ...preorder,
            customerPriority: normalizedPriority,
            priority: preorder.priority === preorder.customerPriority
              ? normalizedPriority
              : preorder.priority,
          }
        : preorder
    );
  });
};

export const updateConsolidatedOrders = (updater: (prev: ConsolidatedOrder[]) => ConsolidatedOrder[]) => {
  updateState((draft) => {
    draft.consolidatedOrders = updater(draft.consolidatedOrders.map((order) => ({ ...order })));
  });
};

export const addConsolidatedOrders = (orders: ConsolidatedOrder[]) => {
  if (orders.length === 0) return;
  updateState((draft) => {
    draft.consolidatedOrders = [...orders, ...draft.consolidatedOrders];
  });
};

export const setDeliveryAwizementData = (
  deliveryId: string,
  payload: {
    awizementAllocationPlan?: Delivery['awizementAllocationPlan'];
    matchedOrderSummary?: Delivery['matchedOrderSummary'];
  }
) => {
  updateState((draft) => {
    draft.deliveries = draft.deliveries.map((delivery) =>
      delivery.id === deliveryId
        ? {
            ...delivery,
            awizementAllocationPlan: payload.awizementAllocationPlan
              ? clone(payload.awizementAllocationPlan)
              : delivery.awizementAllocationPlan,
            matchedOrderSummary: payload.matchedOrderSummary
              ? clone(payload.matchedOrderSummary)
              : delivery.matchedOrderSummary,
          }
        : delivery
    );
  });
};

export const setDeliveryStatus = (deliveryId: string, status: Delivery['status']) => {
  updateState((draft) => {
    draft.deliveries = draft.deliveries.map((delivery) =>
      delivery.id === deliveryId
        ? { ...delivery, status }
        : delivery
    );
  });
};

export const createDelivery = (partial: Omit<Delivery, 'id' | 'status' | 'items' | 'createdAt'> & { items?: Delivery['items'] }) => {
  const seedDelivery: Delivery = {
    id: `delivery_${Date.now()}`,
    items: partial.items ?? [],
    status: 'announced',
    createdAt: new Date().toISOString(),
    supplier: partial.supplier,
    brand: partial.brand,
    deliveryNumber: partial.deliveryNumber,
    invoiceNumber: partial.invoiceNumber,
    expectedDate: partial.expectedDate,
  };

  updateState((draft) => {
    draft.deliveries = [seedDelivery, ...draft.deliveries];
  });

  return seedDelivery;
};

export const createPreorder = (
  params: {
    customerId: string;
    notes?: string;
    items: Array<{ productId: string; variantId: string; quantity: number }>;
  }
) => {
  const { customerId, items, notes } = params;

  if (!customerId || items.length === 0) {
    return null;
  }

  const customer = state.users.find((entry) => entry.id === customerId);
  if (!customer) return null;

  const normalizedItems = items
    .map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: Math.max(1, Math.round(item.quantity)),
    }))
    .filter(item => item.quantity > 0);

  if (normalizedItems.length === 0) {
    return null;
  }

  const { deliveryMonth, seasonWindow } = summarizeDeliveryWindow(normalizedItems);
  const customerPriority = customer.priority ?? 5;

  const preorderItems: PreorderItem[] = normalizedItems.map((item) => ({
    id: `poi_${Date.now()}_${item.variantId}`,
    ...item,
    quantityAllocated: 0,
    quantityDelivered: 0,
  }));

  const id = `preorder_${Date.now()}`;
  const order: Preorder = {
    id,
    orderNumber: nextPreorderNumber(state.preorders),
    customerId: customer.id,
    customerName: customer.name,
    companyName: customer.companyName || customer.name,
    priority: customerPriority,
    customerPriority,
    items: preorderItems,
    status: 'pending',
    createdAt: new Date().toISOString(),
    notes,
    seasonWindow,
    deliveryMonth,
    allocationOrder: state.preorders.length + 1,
  };

  updateState((draft) => {
    draft.preorders = [...draft.preorders, order];
    assignAllocationOrder(draft.preorders);
  });

  return order;
};

export const findCustomerNameById = (customerId: string) => {
  ensureSeeded();
  const customer = state.users.find((entry) => entry.id === customerId);
  return customer?.name ?? '';
};

export const getProductById = (productId: string) =>
  mockProducts.find((product) => product.id === productId);

export const getVariantById = (productId: string, variantId: string) =>
  getProductById(productId)?.variants.find((variant) => variant.id === variantId);

export const getSeasonLabel = (monthIndex: number) => {
  const month = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  return month[monthIndex] ?? '';
};

export const getSeasonWindowLabel = (window: PreorderSeason | undefined) => {
  if (window === 'spring') return 'Wiosenny (Listopad-Marzec)';
  if (window === 'winter') return 'Zimowy (Maj-Wrzesień)';
  return 'Bez okresu';
};

export const syncDemoState = () => {
  ensureSeeded();
  assignAllocationOrder(state.preorders);
  persistState();
  notify();
};

export const resetDemoStateForDev = () => {
  state = hydratePreorders();
  persistState();
  notify();
};

type AllocationAllocationEntry = {
  preorderId: string;
  variantId: string;
  quantityAllocated: number;
};

const rebuildPreorderItemAllocations = (
  preorder: Preorder,
  allocationsByPreorder: Map<string, Map<string, number>>,
) => {
  const lines = allocationsByPreorder.get(preorder.id);
  if (!lines) return preorder;

  let hasAllocation = false;

  const items: PreorderItem[] = preorder.items.map((item: PreorderItem) => {
    const allocated = lines.get(item.variantId) ?? 0;
    if (allocated > 0) {
      hasAllocation = true;
    }

    return {
      ...item,
      quantityAllocated: Math.max(0, Math.min(allocated, item.quantity)),
    };
  });

  if (!hasAllocation) {
    return preorder;
  }

  const totalOrdered = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalAllocated = items.reduce((acc, item) => acc + item.quantityAllocated, 0);

  let status = preorder.status;
  if (totalAllocated === 0) {
    if (status === 'allocated') {
      status = 'pending';
    } else if (status === 'partially_allocated') {
      status = 'pending';
    }
  } else if (totalAllocated >= totalOrdered) {
    status = 'allocated';
  } else {
    status = 'partially_allocated';
  }

  return {
    ...preorder,
    items,
    status,
  };
};

export const applyDeliveryAllocation = (deliveryId: string, allocations: AllocationAllocationEntry[]) => {
  const allocationByVariant = new Map<string, Map<string, number>>();
  const allocationByPreorder = new Map<string, Map<string, number>>();

  allocations.forEach((entry) => {
    const qty = Math.max(0, Math.round(entry.quantityAllocated));
    if (qty <= 0) return;

    if (!allocationByVariant.has(entry.variantId)) {
      allocationByVariant.set(entry.variantId, new Map());
    }
    const perVariant = allocationByVariant.get(entry.variantId)!;
    const currentVariantQty = perVariant.get(entry.preorderId) ?? 0;
    perVariant.set(entry.preorderId, currentVariantQty + qty);

    if (!allocationByPreorder.has(entry.preorderId)) {
      allocationByPreorder.set(entry.preorderId, new Map());
    }
    const perPreorder = allocationByPreorder.get(entry.preorderId)!;
    const currentOrderQty = perPreorder.get(entry.variantId) ?? 0;
    perPreorder.set(entry.variantId, currentOrderQty + qty);
  });

  updateState((draft) => {
    draft.deliveries = draft.deliveries.map((delivery) => {
      if (delivery.id !== deliveryId) return delivery;

      const items = delivery.items.map((item) => {
        const byPreorder = allocationByVariant.get(item.variantId);
        const totalAllocated = byPreorder
          ? Array.from(byPreorder.values()).reduce((sum, value) => sum + value, 0)
          : 0;
        const normalizedQty = Math.min(item.quantityAnnounced, Math.max(0, totalAllocated));
        return {
          ...item,
          quantityAllocated: normalizedQty,
        };
      });

      const announcedQty = items.reduce((acc, item) => acc + item.quantityAnnounced, 0);
      const allocatedQty = items.reduce((acc, item) => acc + (item.quantityAllocated || 0), 0);
      const nextStatus = (): Delivery['status'] => {
        if (announcedQty === 0) return 'announced';
        if (allocatedQty === 0) return 'announced';
        if (allocatedQty >= announcedQty) return 'allocated';
        return 'in_allocation';
      };

      return {
        ...delivery,
        items,
        status: nextStatus(),
      };
    });

    draft.preorders = draft.preorders.map((preorder) =>
      rebuildPreorderItemAllocations(preorder, allocationByPreorder)
    );
  });
};

export const getDemoStateSeed = () => state;
