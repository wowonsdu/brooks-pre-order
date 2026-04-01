import { useSyncExternalStore } from 'react';
import { mockProducts, mockUsers, mockPreorders, mockConsolidatedOrders, mockDeliveries } from './mock-data';
import type { ConsolidatedOrder, DebtDecision, Delivery, Preorder, PreorderSeason, PreorderItem, User } from './mock-data';

const DEMO_STATE_STORAGE_KEY = 'brooks-preorder-demo-state-v1';

const MONTH_IN_SEASON_SPRING = [10, 11, 0, 1, 2];
const MONTH_IN_SEASON_WINTER = [4, 5, 6, 7, 8];
const DEFAULT_ALLOW_ORDERS = true;
const DEMO_DEBT_PROFILES: Record<string, Pick<User, 'debtAmountPln' | 'debtSince' | 'allowOrders'>> = {
  customer_2: { debtAmountPln: 18450, debtSince: '2026-01-12', allowOrders: false },
  customer_5: { debtAmountPln: 9200, debtSince: '2026-02-03', allowOrders: true },
  customer_8: { debtAmountPln: 27600, debtSince: '2025-12-18', allowOrders: false },
};

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

const applyDefaultDebtProfile = (user: User): User => {
  if (user.role !== 'b2b_customer') return user;
  const defaults = DEMO_DEBT_PROFILES[user.id];
  return {
    ...user,
    allowOrders: user.allowOrders ?? defaults?.allowOrders ?? DEFAULT_ALLOW_ORDERS,
    debtAmountPln: user.debtAmountPln ?? defaults?.debtAmountPln,
    debtSince: user.debtSince ?? defaults?.debtSince,
  };
};

export const isCustomerDelinquent = (customer?: Pick<User, 'role' | 'debtAmountPln' | 'debtSince'> | null) => {
  if (!customer || customer.role !== 'b2b_customer') return false;
  return (customer.debtAmountPln ?? 0) > 0 && Boolean(customer.debtSince);
};

export const getDebtDurationInDays = (debtSince?: string) => {
  if (!debtSince) return 0;
  const parsed = new Date(debtSince);
  if (Number.isNaN(parsed.getTime())) return 0;
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / millisecondsPerDay));
};

export const getDebtDurationLabel = (debtSince?: string) => {
  const days = getDebtDurationInDays(debtSince);
  if (days <= 0) return '0 dni';
  if (days === 1) return '1 dzień';
  return `${days} dni`;
};

export const getDebtDecisionLabel = (decision: DebtDecision) => {
  switch (decision) {
    case 'approved':
      return 'Dopuszczony';
    case 'rejected':
      return 'Wstrzymany';
    case 'pending_review':
      return 'Oczekuje decyzji';
    case 'not_required':
    default:
      return 'Bez ograniczeń';
  }
};

const normalizeDebtDecision = (preorder: Preorder, customer?: User): Preorder => {
  if (!isCustomerDelinquent(customer)) {
    return {
      ...preorder,
      debtDecision: 'not_required',
      debtDecisionAt: undefined,
      debtDecisionBy: undefined,
    };
  }

  const nextDecision: DebtDecision = preorder.debtDecision === 'approved' || preorder.debtDecision === 'rejected'
    ? preorder.debtDecision
    : 'pending_review';

  return {
    ...preorder,
    debtDecision: nextDecision,
  };
};

const syncDebtStateForPreorders = (preorders: Preorder[], users: User[]) => {
  const usersById = new Map(users.map((user) => [user.id, user]));
  return preorders.map((preorder) => normalizeDebtDecision(preorder, usersById.get(preorder.customerId)));
};

export const isPreorderEligibleForConsolidation = (preorder: Preorder, customer?: User | null) => {
  if (!isCustomerDelinquent(customer)) {
    return true;
  }
  return preorder.debtDecision === 'approved';
};

const comparePreordersByMonthAndOrder = (a: Preorder, b: Preorder) => {
  const monthDiff = (a.deliveryMonth ?? 99) - (b.deliveryMonth ?? 99);
  if (monthDiff !== 0) return monthDiff;

  const orderDiff = (a.allocationOrder ?? 0) - (b.allocationOrder ?? 0);
  if (orderDiff !== 0) return orderDiff;

  return a.orderNumber.localeCompare(b.orderNumber);
};

const comparePreordersByMonthAndPriority = (a: Preorder, b: Preorder) => {
  const monthDiff = (a.deliveryMonth ?? 99) - (b.deliveryMonth ?? 99);
  if (monthDiff !== 0) return monthDiff;

  const priorityDiff = (a.priority ?? 99) - (b.priority ?? 99);
  if (priorityDiff !== 0) return priorityDiff;

  return a.orderNumber.localeCompare(b.orderNumber);
};

const assignAllocationOrder = (preorders: Preorder[]) => {
  const monthCounters = new Map<number, number>();

  preorders.forEach((preorder) => {
    const monthIndex = preorder.deliveryMonth ?? 99;
    const nextPosition = (monthCounters.get(monthIndex) ?? 0) + 1;
    monthCounters.set(monthIndex, nextPosition);
    preorder.allocationOrder = nextPosition;
  });
};

const normalizePreorders = (preorders: Preorder[], users: User[]) =>
  syncDebtStateForPreorders(preorders, users).map((preorder, index) => {
    const customerPriority = preorder.customerPriority ?? preorder.priority ?? 5;
    return {
      ...preorder,
      priority: preorder.priority ?? customerPriority,
      customerPriority,
      seasonWindow: preorder.seasonWindow ?? 'spring',
      deliveryMonth: preorder.deliveryMonth ?? ((index + 1) % 12),
      debtDecision: preorder.debtDecision ?? 'not_required',
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
    const withDebtProfile = applyDefaultDebtProfile(user);
    return {
      ...withDebtProfile,
      priority: withDebtProfile.priority ?? 5,
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
    const mergedUsers = normalizeUsers(
      persisted.users.length > 0 ? persisted.users : mockUsers
    );
    const mergedPreorders = normalizePreorders(
      persisted.preorders.length > 0
        ? persisted.preorders
        : mockPreorders,
      mergedUsers,
    );
    mergedPreorders.sort(comparePreordersByMonthAndOrder);
    assignAllocationOrder(mergedPreorders);
    const mergedConsolidated = persisted.consolidatedOrders ?? mockConsolidatedOrders;
    const mergedDeliveries = persisted.deliveries ?? mockDeliveries;

    return {
      preorders: mergedPreorders,
      users: mergedUsers,
      consolidatedOrders: mergedConsolidated.map((order) => ({ ...order })),
      deliveries: mergedDeliveries.map((delivery) => ({ ...delivery })),
    };
  }

  const seededUsers = normalizeUsers(clone(mockUsers));
  const seededPreorders = normalizePreorders(clone(mockPreorders), seededUsers);
  seededPreorders.sort(comparePreordersByMonthAndPriority);
  assignAllocationOrder(seededPreorders);

  return {
    preorders: seededPreorders,
    users: seededUsers,
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
// Return the stable user list here; callers can derive filtered views without
// forcing a fresh array from the external store on every snapshot read.
export const useCustomers = () => useDemoState((snapshot) => snapshot.users);
export const useCustomersAll = () => useDemoState((snapshot) => snapshot.users);
export const useConsolidatedOrders = () => useDemoState((snapshot) => snapshot.consolidatedOrders);
export const useDeliveries = () => useDemoState((snapshot) => snapshot.deliveries);

export const reorderPreorders = (sourcePreorderId: string, targetPreorderId: string) => {
  if (sourcePreorderId === targetPreorderId) return;

  updateState((draft) => {
    draft.preorders.sort(comparePreordersByMonthAndOrder);

    const fromIndex = draft.preorders.findIndex((item) => item.id === sourcePreorderId);
    const toIndex = draft.preorders.findIndex((item) => item.id === targetPreorderId);
    if (fromIndex === -1 || toIndex === -1) return;

    const source = draft.preorders[fromIndex];
    const target = draft.preorders[toIndex];
    if ((source.deliveryMonth ?? 99) !== (target.deliveryMonth ?? 99)) {
      return;
    }

    const [moved] = draft.preorders.splice(fromIndex, 1);
    draft.preorders.splice(toIndex, 0, moved);
    assignAllocationOrder(draft.preorders);
    draft.preorders.sort(comparePreordersByMonthAndOrder);
  });
};

export const setPreorderAllocationPosition = (preorderId: string, targetPosition: number) => {
  updateState((draft) => {
    draft.preorders.sort(comparePreordersByMonthAndOrder);

    const source = draft.preorders.find((item) => item.id === preorderId);
    if (!source) return;

    const monthIndex = source.deliveryMonth ?? 99;
    const monthPreorders = draft.preorders.filter((item) => (item.deliveryMonth ?? 99) === monthIndex);
    if (monthPreorders.length === 0) return;

    const normalizedTarget = Math.min(monthPreorders.length, Math.max(1, targetPosition));
    const target = monthPreorders[normalizedTarget - 1];
    if (!target || target.id === preorderId) return;

    const fromIndex = draft.preorders.findIndex((item) => item.id === preorderId);
    const toIndex = draft.preorders.findIndex((item) => item.id === target.id);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = draft.preorders.splice(fromIndex, 1);
    draft.preorders.splice(toIndex, 0, moved);
    assignAllocationOrder(draft.preorders);
    draft.preorders.sort(comparePreordersByMonthAndOrder);
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

    draft.preorders = syncDebtStateForPreorders(draft.preorders, draft.users);
  });
};

export const setCustomerDebtProfile = (
  customerId: string,
  payload: {
    debtAmountPln?: number;
    debtSince?: string;
    allowOrders?: boolean;
  },
) => {
  updateState((draft) => {
    draft.users = draft.users.map((user) => {
      if (user.id !== customerId || user.role !== 'b2b_customer') {
        return user;
      }

      return {
        ...user,
        debtAmountPln: payload.debtAmountPln && payload.debtAmountPln > 0 ? Math.round(payload.debtAmountPln) : undefined,
        debtSince: payload.debtSince || undefined,
        allowOrders: payload.allowOrders ?? user.allowOrders ?? DEFAULT_ALLOW_ORDERS,
      };
    });

    draft.preorders = syncDebtStateForPreorders(draft.preorders, draft.users);
  });
};

export const setPreorderDebtDecision = (preorderId: string, decision: DebtDecision, adminName?: string) => {
  updateState((draft) => {
    const usersById = new Map(draft.users.map((user) => [user.id, user]));
    draft.preorders = draft.preorders.map((preorder) => {
      if (preorder.id !== preorderId) {
        return preorder;
      }

      const customer = usersById.get(preorder.customerId);
      if (!isCustomerDelinquent(customer)) {
        return {
          ...preorder,
          debtDecision: 'not_required',
          debtDecisionAt: undefined,
          debtDecisionBy: undefined,
        };
      }

      return {
        ...preorder,
        debtDecision: decision,
        debtDecisionAt: new Date().toISOString(),
        debtDecisionBy: adminName,
      };
    });
  });
};

export const setCompanyDebtDecision = (customerId: string, decision: DebtDecision, adminName?: string) => {
  updateState((draft) => {
    const customer = draft.users.find((user) => user.id === customerId);
    if (!isCustomerDelinquent(customer)) {
      draft.preorders = syncDebtStateForPreorders(draft.preorders, draft.users);
      return;
    }

    draft.preorders = draft.preorders.map((preorder) =>
      preorder.customerId === customerId && preorder.status === 'pending'
        ? {
            ...preorder,
            debtDecision: decision,
            debtDecisionAt: new Date().toISOString(),
            debtDecisionBy: adminName,
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
  const isDelinquent = isCustomerDelinquent(customer);

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
    debtDecision: isDelinquent ? 'pending_review' : 'not_required',
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
