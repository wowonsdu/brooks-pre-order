import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { mockProducts } from '../../lib/mock-data';
import { usePreorders, useCustomers, addConsolidatedOrders } from '../../lib/demo-store';
import type { ConsolidatedOrder } from '../../lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Label } from '../ui/label';
import {
  ArrowLeft, ChevronDown, ChevronRight, Package, DollarSign,
  Users, Calendar, SplitSquareVertical, Plus, Trash2, ShoppingCart,
  Filter, Eye, Check
} from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';

interface ConsolidatedItemFull {
  variantId: string;
  productId: string;
  quantity: number;
  byPriority: Record<number, number>;
  byMonth: Record<string, number>;
  byPriorityMonth: Record<string, number>;
  byCustomer: Record<string, { name: string; company: string; qty: number; priority: number }>;
  preorderIds: string[];
}

interface OrderDraft {
  id: string;
  name: string;
  filters: {
    priorities: number[];
    months: string[];
    customers: string[];
  };
  items: { variantId: string; productId: string; quantity: number }[];
}

export function OrderConfigurator() {
  const navigate = useNavigate();
  const selectedBrand = 'Brooks';
  const preorders = usePreorders();
  const customers = useCustomers().filter((user) => user.role === 'b2b_customer');

  // Filter state
  const [selectedPriorities, setSelectedPriorities] = useState<Set<number>>(new Set());
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());

  // Expandable sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['quick', 'priority', 'month']));

  // Order drafts - multiple orders can be built
  const [orderDrafts, setOrderDrafts] = useState<OrderDraft[]>([]);
  const [activeTab, setActiveTab] = useState<'preview' | 'drafts' | 'unordered'>('preview');

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    next.has(section) ? next.delete(section) : next.add(section);
    setExpandedSections(next);
  };

  // Build full consolidation data
  const consolidatedItems = useMemo((): ConsolidatedItemFull[] => {
    const consolidated = new Map<string, ConsolidatedItemFull>();
    preorders
      .filter(po => po.status === 'pending')
      .forEach(preorder => {
        const customer = customers.find(u => u.id === preorder.customerId);
        preorder.items.forEach(item => {
          const product = mockProducts.find(p => p.id === item.productId);
          if (product?.brand !== selectedBrand) return;

          const key = item.variantId;
          const month = product.expectedDeliveryDate
            ? new Date(product.expectedDeliveryDate).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
            : 'Nieznany';

          const existing = consolidated.get(key);
          if (existing) {
            existing.quantity += item.quantity;
            existing.byPriority[preorder.priority] = (existing.byPriority[preorder.priority] || 0) + item.quantity;
            existing.byMonth[month] = (existing.byMonth[month] || 0) + item.quantity;
            const comboKey = `${preorder.priority}|${month}`;
            existing.byPriorityMonth[comboKey] = (existing.byPriorityMonth[comboKey] || 0) + item.quantity;
            if (existing.byCustomer[preorder.customerId]) {
              existing.byCustomer[preorder.customerId].qty += item.quantity;
            } else {
              existing.byCustomer[preorder.customerId] = {
                name: customer?.name || preorder.customerName,
                company: preorder.companyName,
                qty: item.quantity,
                priority: preorder.priority,
              };
            }
            if (!existing.preorderIds.includes(preorder.id)) {
              existing.preorderIds.push(preorder.id);
            }
          } else {
            consolidated.set(key, {
              variantId: item.variantId,
              productId: item.productId,
              quantity: item.quantity,
              byPriority: { [preorder.priority]: item.quantity },
              byMonth: { [month]: item.quantity },
              byPriorityMonth: { [`${preorder.priority}|${month}`]: item.quantity },
              byCustomer: {
                [preorder.customerId]: {
                  name: customer?.name || preorder.customerName,
                  company: preorder.companyName,
                  qty: item.quantity,
                  priority: preorder.priority,
                },
              },
              preorderIds: [preorder.id],
            });
          }
        });
      });

    return Array.from(consolidated.values());
  }, [preorders, customers, mockProducts]);

  // Available filter options
  const availablePriorities = useMemo(() => {
    const set = new Set<number>();
    consolidatedItems.forEach(item => Object.keys(item.byPriority).forEach(p => set.add(parseInt(p))));
    return Array.from(set).sort();
  }, [consolidatedItems]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    consolidatedItems.forEach(item => Object.keys(item.byMonth).forEach(m => set.add(m)));
    return Array.from(set);
  }, [consolidatedItems]);

  const availableCustomers = useMemo(() => {
    const map = new Map<string, { name: string; company: string; priority: number; totalQty: number }>();
    consolidatedItems.forEach(item => {
      Object.entries(item.byCustomer).forEach(([custId, info]) => {
        const existing = map.get(custId);
        if (existing) {
          existing.totalQty += info.qty;
        } else {
          map.set(custId, { name: info.name, company: info.company, priority: info.priority, totalQty: info.qty });
        }
      });
    });
    return Array.from(map.entries()).sort((a, b) => a[1].priority - b[1].priority);
  }, [consolidatedItems]);

  // Filtered items based on current selection
  const filteredItems = useMemo(() => {
    const hasPriorityFilter = selectedPriorities.size > 0;
    const hasMonthFilter = selectedMonths.size > 0;
    const hasCustomerFilter = selectedCustomers.size > 0;

    if (!hasPriorityFilter && !hasMonthFilter && !hasCustomerFilter) {
      return consolidatedItems.map(item => ({ ...item }));
    }

    return consolidatedItems
      .map(item => {
        let qty = 0;

        // If we have customer filter, calculate from customer level
        if (hasCustomerFilter) {
          Object.entries(item.byCustomer).forEach(([custId, info]) => {
            if (selectedCustomers.has(custId)) {
              if (hasPriorityFilter && !selectedPriorities.has(info.priority)) return;
              qty += info.qty;
            }
          });
        } else if (hasPriorityFilter && hasMonthFilter) {
          Object.entries(item.byPriorityMonth).forEach(([comboKey, comboQty]) => {
            const [priority, month] = comboKey.split('|');
            if (selectedPriorities.has(parseInt(priority)) && selectedMonths.has(month)) {
              qty += comboQty;
            }
          });
        } else if (hasPriorityFilter) {
          Object.entries(item.byPriority).forEach(([p, q]) => {
            if (selectedPriorities.has(parseInt(p))) qty += q;
          });
        } else if (hasMonthFilter) {
          Object.entries(item.byMonth).forEach(([m, q]) => {
            if (selectedMonths.has(m)) qty += q;
          });
        }

        if (qty <= 0) return null;
        return { ...item, quantity: qty };
      })
      .filter(Boolean) as ConsolidatedItemFull[];
  }, [consolidatedItems, selectedPriorities, selectedMonths, selectedCustomers]);

  // Summary stats
  const totalQty = filteredItems.reduce((s, i) => s + i.quantity, 0);
  const totalValue = filteredItems.reduce((s, i) => {
    const p = mockProducts.find(pr => pr.id === i.productId);
    return s + i.quantity * (p?.basePrice || 0);
  }, 0);
  const uniqueProducts = new Set(filteredItems.map(i => i.productId)).size;

  const getProductDetails = (productId: string, variantId: string) => {
    const product = mockProducts.find(p => p.id === productId);
    const variant = product?.variants.find(v => v.id === variantId);
    return { product, variant };
  };

  const consolidatedByVariant = useMemo(() => {
    const map = new Map<string, ConsolidatedItemFull>();
    consolidatedItems.forEach(item => map.set(item.variantId, item));
    return map;
  }, [consolidatedItems]);

  const orderedByVariantCombo = useMemo(() => {
    const map = new Map<string, number>();
    if (orderDrafts.length === 0) return map;

    const splitByCombo = (itemDemandByCombo: Record<string, number>, draftQty: number, priorities: number[], months: string[]) => {
      const prioritySet = new Set(priorities);
      const monthSet = new Set(months);
      const hasPriorityFilter = prioritySet.size > 0;
      const hasMonthFilter = monthSet.size > 0;

      const candidates = Object.entries(itemDemandByCombo)
        .map(([comboKey, comboQty]) => {
          const [priorityRaw, month] = comboKey.split('|');
          const priority = parseInt(priorityRaw, 10);
          if (hasPriorityFilter && !prioritySet.has(priority)) return null;
          if (hasMonthFilter && !monthSet.has(month)) return null;
          if (comboQty <= 0) return null;
          return { comboKey, comboQty };
        })
        .filter(Boolean) as { comboKey: string; comboQty: number; }[];

      if (candidates.length === 0 || draftQty <= 0) return new Map<string, number>();

      const totalCandidateQty = candidates.reduce((sum, c) => sum + c.comboQty, 0);
      const normalizedDraftQty = Math.min(draftQty, totalCandidateQty);
      const rows = candidates.map(candidate => {
        const exact = normalizedDraftQty * (candidate.comboQty / totalCandidateQty);
        const base = Math.floor(exact);
        return { comboKey: candidate.comboKey, base, frac: exact - base };
      });

      let remaining = normalizedDraftQty - rows.reduce((sum, row) => sum + row.base, 0);
      rows.sort((a, b) => b.frac - a.frac);
      for (let i = 0; i < rows.length && remaining > 0; i += 1) {
        rows[i].base += 1;
        remaining -= 1;
      }

      const result = new Map<string, number>();
      rows.forEach(row => {
        if (row.base > 0) {
          result.set(row.comboKey, row.base);
        }
      });
      return result;
    };

    orderDrafts.forEach(draft => {
      draft.items.forEach(draftItem => {
        const demandItem = consolidatedByVariant.get(draftItem.variantId);
        if (!demandItem) return;

        const allocation = splitByCombo(
          demandItem.byPriorityMonth,
          draftItem.quantity,
          draft.filters.priorities,
          draft.filters.months
        );

        allocation.forEach((qty, comboKey) => {
          const mapKey = `${draftItem.variantId}|${comboKey}`;
          map.set(mapKey, (map.get(mapKey) || 0) + qty);
        });
      });
    });

    return map;
  }, [orderDrafts, consolidatedByVariant]);

  const orderedByVariant = useMemo(() => {
    const map = new Map<string, number>();
    orderDrafts.forEach(draft => {
      draft.items.forEach(item => {
        map.set(item.variantId, (map.get(item.variantId) || 0) + item.quantity);
      });
    });
    return map;
  }, [orderDrafts]);

  const unorderedItems = useMemo(() => {
    return consolidatedItems
      .map(item => {
        const ordered = orderedByVariant.get(item.variantId) || 0;
        const remainingQty = Math.max(item.quantity - ordered, 0);
        if (remainingQty <= 0) return null;

        return { ...item, quantity: remainingQty };
      })
      .filter(Boolean) as ConsolidatedItemFull[];
  }, [consolidatedItems, orderedByVariant]);

  const unorderedTotalsQty = unorderedItems.reduce((sum, item) => sum + item.quantity, 0);
  const unorderedTotalsValue = unorderedItems.reduce((sum, item) => {
    const product = mockProducts.find(pr => pr.id === item.productId);
    return sum + item.quantity * (product?.basePrice || 0);
  }, 0);

  interface UnorderedComboRow {
    priority: number;
    month: string;
    quantity: number;
    items: {
      variantId: string;
      productId: string;
      quantity: number;
    }[];
  }

  const unorderedCombinations = useMemo(() => {
    const map = new Map<string, UnorderedComboRow>();

    consolidatedItems.forEach(item => {
      Object.entries(item.byPriorityMonth).forEach(([comboKey, comboQty]) => {
        const orderedComboQty = orderedByVariantCombo.get(`${item.variantId}|${comboKey}`) || 0;
        const remaining = Math.max(comboQty - orderedComboQty, 0);
        if (remaining <= 0) return;

        const [priorityRaw, month] = comboKey.split('|');
        const priority = parseInt(priorityRaw, 10);
        const key = comboKey;
        const existing = map.get(key);
        if (existing) {
          existing.quantity += remaining;
          existing.items.push({
            variantId: item.variantId,
            productId: item.productId,
            quantity: remaining,
          });
        } else {
          map.set(key, {
            priority,
            month,
            quantity: remaining,
            items: [{
              variantId: item.variantId,
              productId: item.productId,
              quantity: remaining,
            }],
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.priority - b.priority || a.month.localeCompare(b.month));
  }, [consolidatedItems, orderedByVariantCombo]);

  const addUnorderedCombinationToDraft = (combo: UnorderedComboRow) => {
    if (combo.items.length === 0) return;

    const draft: OrderDraft = {
      id: `draft-combo-${combo.priority}-${combo.month}-${Date.now()}`,
      name: `Brooks Europe (P${combo.priority} / ${combo.month})`,
      filters: {
        priorities: [combo.priority],
        months: [combo.month],
        customers: [],
      },
      items: combo.items,
    };

    if (draft.items.length === 0) return;

    setOrderDrafts(prev => [...prev, draft]);
    setActiveTab('drafts');
    toast.success('Dodano pozycje z kombinacji do listy', {
      description: draft.name,
    });
  };

  const addAllUnorderedToDraft = () => {
    if (unorderedItems.length === 0) return;

    const draft: OrderDraft = {
      id: `draft-unordered-${Date.now()}`,
      name: 'Brooks Europe (Niezamówione)',
      filters: { priorities: [], months: [], customers: [] },
      items: unorderedItems.map(item => ({
        variantId: item.variantId,
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    setOrderDrafts(prev => [...prev, draft]);
    setActiveTab('drafts');
    toast.success('Dodano wszystkie niezamówione pozycje', {
      description: draft.name,
    });
  };

  const togglePriority = (p: number) => {
    const next = new Set(selectedPriorities);
    next.has(p) ? next.delete(p) : next.add(p);
    setSelectedPriorities(next);
  };

  const toggleMonth = (m: string) => {
    const next = new Set(selectedMonths);
    next.has(m) ? next.delete(m) : next.add(m);
    setSelectedMonths(next);
  };

  const toggleCustomer = (c: string) => {
    const next = new Set(selectedCustomers);
    next.has(c) ? next.delete(c) : next.add(c);
    setSelectedCustomers(next);
  };

  const clearAllFilters = () => {
    setSelectedPriorities(new Set());
    setSelectedMonths(new Set());
    setSelectedCustomers(new Set());
  };

  const hasActiveFilters = selectedPriorities.size > 0 || selectedMonths.size > 0 || selectedCustomers.size > 0;

  // Add current filtered selection as a new order draft
  const addToDrafts = () => {
    if (filteredItems.length === 0) return;

    const filterDesc: string[] = [];
    if (selectedPriorities.size > 0) filterDesc.push(`P${Array.from(selectedPriorities).sort().join(',P')}`);
    if (selectedMonths.size > 0) filterDesc.push(Array.from(selectedMonths).join(', '));
    if (selectedCustomers.size > 0) {
      const names = Array.from(selectedCustomers).map(id => {
        const c = availableCustomers.find(([cid]) => cid === id);
        return c ? c[1].company : id;
      });
      filterDesc.push(names.join(', '));
    }

    const draft: OrderDraft = {
      id: `draft-${Date.now()}`,
      name: filterDesc.length > 0
        ? `Brooks Europe (${filterDesc.join(' / ')})`
        : `Brooks Europe - Całość`,
      filters: {
        priorities: Array.from(selectedPriorities),
        months: Array.from(selectedMonths),
        customers: Array.from(selectedCustomers),
      },
      items: filteredItems.map(item => ({
        variantId: item.variantId,
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    setOrderDrafts(prev => [...prev, draft]);
    toast.success('Dodano zamówienie do listy', { description: draft.name });
    setActiveTab('drafts');
  };

  const removeDraft = (id: string) => {
    setOrderDrafts(prev => prev.filter(d => d.id !== id));
  };

  // Create all draft orders
  const createAllOrders = () => {
    if (orderDrafts.length === 0) return;

    const newOrders: ConsolidatedOrder[] = orderDrafts.map(draft => ({
      id: `co-${Date.now()}-${draft.id}`,
      supplier: draft.name,
      brand: selectedBrand,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      items: draft.items,
    }));

    addConsolidatedOrders(newOrders);
    toast.success(`Utworzono ${newOrders.length} zamówień`, {
      description: `Łącznie ${newOrders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0)} szt.`,
    });
    navigate('/admin/consolidation');
  };

  // Quick split presets
  const quickSplitByPriority = () => {
    const drafts: OrderDraft[] = [];
    availablePriorities.forEach(p => {
      const items = consolidatedItems
        .map(item => {
          const qty = item.byPriority[p] || 0;
          if (qty <= 0) return null;
          return { variantId: item.variantId, productId: item.productId, quantity: qty };
        })
        .filter(Boolean) as OrderDraft['items'];

      if (items.length > 0) {
        drafts.push({
          id: `draft-p${p}-${Date.now()}`,
          name: `Brooks Europe (Priorytet ${p})`,
          filters: { priorities: [p], months: [], customers: [] },
          items,
        });
      }
    });
    setOrderDrafts(drafts);
    setActiveTab('drafts');
    toast.success(`Wygenerowano ${drafts.length} zamówień wg priorytetu`);
  };

  const quickSplitByMonth = () => {
    const drafts: OrderDraft[] = [];
    availableMonths.forEach(m => {
      const items = consolidatedItems
        .map(item => {
          const qty = item.byMonth[m] || 0;
          if (qty <= 0) return null;
          return { variantId: item.variantId, productId: item.productId, quantity: qty };
        })
        .filter(Boolean) as OrderDraft['items'];

      if (items.length > 0) {
        drafts.push({
          id: `draft-m${m}-${Date.now()}`,
          name: `Brooks Europe (${m})`,
          filters: { priorities: [], months: [m], customers: [] },
          items,
        });
      }
    });
    setOrderDrafts(drafts);
    setActiveTab('drafts');
    toast.success(`Wygenerowano ${drafts.length} zamówień wg miesiąca`);
  };

  const quickSplitCombined = () => {
    const drafts: OrderDraft[] = [];
    availablePriorities.forEach(p => {
      availableMonths.forEach(m => {
        const items = consolidatedItems
          .map(item => {
            const totalQty = item.quantity;
            const pRatio = (item.byPriority[p] || 0) / totalQty;
            const mRatio = (item.byMonth[m] || 0) / totalQty;
            const qty = Math.round(totalQty * pRatio * mRatio);
            if (qty <= 0) return null;
            return { variantId: item.variantId, productId: item.productId, quantity: qty };
          })
          .filter(Boolean) as OrderDraft['items'];

        if (items.length > 0) {
          drafts.push({
            id: `draft-p${p}-${m}-${Date.now()}`,
            name: `Brooks Europe (P${p} / ${m})`,
            filters: { priorities: [p], months: [m], customers: [] },
            items,
          });
        }
      });
    });
    setOrderDrafts(drafts);
    setActiveTab('drafts');
    toast.success(`Wygenerowano ${drafts.length} zamówień (priorytet × miesiąc)`);
  };

  const priorityColors: Record<number, string> = {
    1: 'bg-red-100 text-red-800 border-red-200',
    2: 'bg-orange-100 text-orange-800 border-orange-200',
    3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    4: 'bg-green-100 text-green-800 border-green-200',
    5: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/consolidation')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Powrót
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <h1 className="text-lg font-semibold text-gray-900">Konfigurator Zamówień — {selectedBrand}</h1>
        </div>
        <div className="flex items-center gap-3">
          {orderDrafts.length > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {orderDrafts.length} {orderDrafts.length === 1 ? 'zamówienie' : orderDrafts.length < 5 ? 'zamówienia' : 'zamówień'} w kolejce
            </Badge>
          )}
          <Button
            onClick={createAllOrders}
            disabled={orderDrafts.length === 0}
            className="gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Utwórz zamówienia ({orderDrafts.length})
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        {/* LEFT PANEL - Filters & Config */}
        <div className="w-80 xl:w-96 bg-white border-r overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtry zamówienia
              </h2>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-gray-500">
                  Wyczyść
                </Button>
              )}
            </div>
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1 mb-2">
                {Array.from(selectedPriorities).sort().map(p => (
                  <Badge key={p} variant="outline" className={`${priorityColors[p]} cursor-pointer text-xs`} onClick={() => togglePriority(p)}>
                    P{p} ✕
                  </Badge>
                ))}
                {Array.from(selectedMonths).map(m => (
                  <Badge key={m} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 cursor-pointer text-xs" onClick={() => toggleMonth(m)}>
                    {m} ✕
                  </Badge>
                ))}
                {Array.from(selectedCustomers).map(c => {
                  const cust = availableCustomers.find(([id]) => id === c);
                  return (
                    <Badge key={c} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 cursor-pointer text-xs" onClick={() => toggleCustomer(c)}>
                      {cust ? cust[1].company : c} ✕
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Split */}
          <div className="border-b">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
              onClick={() => toggleSection('quick')}
            >
              <div className="flex items-center gap-2">
                <SplitSquareVertical className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm">Szybki podział</span>
              </div>
              {expandedSections.has('quick') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedSections.has('quick') && (
              <div className="px-4 pb-4 space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={quickSplitByMonth}>
                  <Calendar className="w-3 h-3 mr-2" />
                  Osobne zamówienie per miesiąc
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={quickSplitCombined}>
                  <SplitSquareVertical className="w-3 h-3 mr-2" />
                  miesiąc x priorytet (kombinowany)
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => {
                  clearAllFilters();
                  setOrderDrafts([{
                    id: `draft-full-${Date.now()}`,
                    name: 'Brooks Europe - Pełna konsolidacja',
                    filters: { priorities: [], months: [], customers: [] },
                    items: consolidatedItems.map(i => ({ variantId: i.variantId, productId: i.productId, quantity: i.quantity })),
                  }]);
                  setActiveTab('drafts');
                  toast.success('Utworzono jedno zamówienie całościowe');
                }}>
                  <Package className="w-3 h-3 mr-2" />
                  Jedno zamówienie (całość)
                </Button>
              </div>
            )}
          </div>

          {/* Month Section */}
          <div className="border-b">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
              onClick={() => toggleSection('month')}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm">Miesiąc dostawy</span>
              </div>
              {expandedSections.has('month') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedSections.has('month') && (
              <div className="px-4 pb-4 space-y-2">
                {availableMonths.map(m => {
                  const qty = consolidatedItems.reduce((s, i) => s + (i.byMonth[m] || 0), 0);
                  const val = consolidatedItems.reduce((s, i) => {
                    const pr = mockProducts.find(x => x.id === i.productId);
                    return s + (i.byMonth[m] || 0) * (pr?.basePrice || 0);
                  }, 0);
                  const isSelected = selectedMonths.has(m);
                  return (
                    <button
                      key={m}
                      onClick={() => toggleMonth(m)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-purple-50 text-purple-800 border-purple-300 ring-1 ring-purple-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                          isSelected ? 'bg-purple-200 border-purple-400' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-medium text-sm capitalize">{m}</span>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-semibold">{qty} szt.</div>
                        <div className="text-gray-500">{val.toLocaleString('pl-PL')} EUR</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority Section */}
          <div className="border-b">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
              onClick={() => toggleSection('priority')}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm">Priorytet klienta</span>
              </div>
              {expandedSections.has('priority') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedSections.has('priority') && (
              <div className="px-4 pb-4 space-y-2">
                {availablePriorities.map(p => {
                  const qty = consolidatedItems.reduce((s, i) => s + (i.byPriority[p] || 0), 0);
                  const val = consolidatedItems.reduce((s, i) => {
                    const pr = mockProducts.find(x => x.id === i.productId);
                    return s + (i.byPriority[p] || 0) * (pr?.basePrice || 0);
                  }, 0);
                  const isSelected = selectedPriorities.has(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePriority(p)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? `${priorityColors[p]} border-current ring-1 ring-current/20`
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                          isSelected ? 'bg-current/20 border-current' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-medium text-sm">Priorytet {p}</span>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-semibold">{qty} szt.</div>
                        <div className="text-gray-500">{val.toLocaleString('pl-PL')} EUR</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customer Section */}
          <div className="border-b">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
              onClick={() => toggleSection('customer')}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm">Klient</span>
                <Badge variant="outline" className="text-xs">{availableCustomers.length}</Badge>
              </div>
              {expandedSections.has('customer') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedSections.has('customer') && (
              <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
                {availableCustomers.map(([custId, info]) => {
                  const isSelected = selectedCustomers.has(custId);
                  return (
                    <button
                      key={custId}
                      onClick={() => toggleCustomer(custId)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-teal-50 text-teal-800 border-teal-300 ring-1 ring-teal-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-xs ${
                          isSelected ? 'bg-teal-200 border-teal-400' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{info.company}</div>
                          <div className="text-xs text-gray-500">P{info.priority}</div>
                        </div>
                      </div>
                      <div className="text-right text-xs flex-shrink-0">
                        <div className="font-semibold">{info.totalQty} szt.</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add to drafts button */}
          <div className="p-4">
            <Button
              className="w-full gap-2"
              onClick={addToDrafts}
              disabled={filteredItems.length === 0}
            >
              <Plus className="w-4 h-4" />
              Dodaj do zamówień
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {hasActiveFilters
                ? `Wybrano ${totalQty} szt. / ${totalValue.toLocaleString('pl-PL')} EUR`
                : 'Wybierz filtry lub dodaj całość'}
            </p>
          </div>
        </div>

        {/* RIGHT PANEL - Preview & Drafts */}
        <div className="flex-1 overflow-y-auto">
          {/* Tab switcher */}
          <div className="bg-white border-b px-6 pt-4 flex gap-1">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'preview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('preview')}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Podgląd ({filteredItems.length} pozycji)
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'drafts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('drafts')}
            >
              <ShoppingCart className="w-4 h-4 inline mr-2" />
              Zamówienia ({orderDrafts.length})
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'unordered'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('unordered')}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Niezamówione ({unorderedItems.length} pozycji)
            </button>
          </div>

          {activeTab === 'preview' && (
            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Ilość</p>
                        <p className="text-xl font-semibold">{totalQty.toLocaleString('pl-PL')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Wartość</p>
                        <p className="text-xl font-semibold">{totalValue.toLocaleString('pl-PL')} EUR</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <SplitSquareVertical className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Warianty</p>
                        <p className="text-xl font-semibold">{filteredItems.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Produkty</p>
                        <p className="text-xl font-semibold">{uniqueProducts}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Priority Breakdown */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Rozkład wg priorytetu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {availablePriorities.map(p => {
                        const qty = filteredItems.reduce((s, i) => s + (i.byPriority[p] || 0), 0);
                        const pct = totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0;
                        if (qty === 0) return null;
                        return (
                          <div key={p} className="flex items-center gap-3">
                            <Badge variant="outline" className={`${priorityColors[p]} text-xs w-14 justify-center`}>P{p}</Badge>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gray-400 rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: p === 1 ? '#ef4444' : p === 2 ? '#f97316' : p === 3 ? '#eab308' : p === 4 ? '#22c55e' : '#3b82f6' }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-20 text-right">{qty} szt. ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Month Breakdown */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Rozkład wg miesiąca</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {availableMonths.map(m => {
                        const qty = filteredItems.reduce((s, i) => s + (i.byMonth[m] || 0), 0);
                        const pct = totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0;
                        if (qty === 0) return null;
                        return (
                          <div key={m} className="flex items-center gap-3">
                            <span className="text-xs font-medium w-24 capitalize truncate">{m}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 w-20 text-right">{qty} szt. ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Items Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Pozycje zamówienia</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">SKU</TableHead>
                          <TableHead className="text-xs">Produkt</TableHead>
                          <TableHead className="text-xs">Kolor</TableHead>
                          <TableHead className="text-xs">Rozmiar</TableHead>
                          <TableHead className="text-xs text-right">Ilość</TableHead>
                          <TableHead className="text-xs text-right">Wartość</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.slice(0, 50).map(item => {
                          const { product, variant } = getProductDetails(item.productId, item.variantId);
                          if (!product || !variant) return null;
                          return (
                            <TableRow key={item.variantId}>
                              <TableCell className="font-mono text-xs">{variant.sku}</TableCell>
                              <TableCell className="text-xs font-medium">{product.name}</TableCell>
                              <TableCell className="text-xs">{variant.color}</TableCell>
                              <TableCell className="text-xs">{variant.size}</TableCell>
                              <TableCell className="text-xs text-right font-semibold">{item.quantity}</TableCell>
                              <TableCell className="text-xs text-right">{(item.quantity * product.basePrice).toLocaleString('pl-PL')} EUR</TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredItems.length > 50 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-xs text-gray-500 py-3">
                              ...i {filteredItems.length - 50} kolejnych pozycji
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

            {activeTab === 'drafts' && (
            <div className="p-6 space-y-4">
              {orderDrafts.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium mb-1">Brak zamówień w kolejce</p>
                  <p className="text-sm">Wybierz filtry po lewej i kliknij "Dodaj do zamówień"<br/>lub skorzystaj z szybkiego podziału</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Zamówienia do utworzenia</h2>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setOrderDrafts([])}>
                        <Trash2 className="w-3 h-3 mr-2" />
                        Wyczyść wszystko
                      </Button>
                      <Button size="sm" onClick={createAllOrders} className="gap-2">
                        <Check className="w-3 h-3" />
                        Utwórz wszystkie ({orderDrafts.length})
                      </Button>
                    </div>
                  </div>

                  {orderDrafts.map((draft, idx) => {
                    const draftQty = draft.items.reduce((s, i) => s + i.quantity, 0);
                    const draftVal = draft.items.reduce((s, i) => {
                      const p = mockProducts.find(pr => pr.id === i.productId);
                      return s + i.quantity * (p?.basePrice || 0);
                    }, 0);

                    return (
                      <Card key={draft.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="bg-gray-100 text-xs">{idx + 1}</Badge>
                                <h3 className="font-semibold text-sm">{draft.name}</h3>
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                {draft.filters.priorities.map(p => (
                                  <Badge key={p} variant="outline" className={`${priorityColors[p]} text-xs`}>P{p}</Badge>
                                ))}
                                {draft.filters.months.map(m => (
                                  <Badge key={m} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">{m}</Badge>
                                ))}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeDraft(draft.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-3">
                            <div>
                              <p className="text-xs text-gray-500">Pozycje</p>
                              <p className="font-semibold text-sm">{draft.items.length}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Ilość</p>
                              <p className="font-semibold text-sm">{draftQty.toLocaleString('pl-PL')} szt.</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Wartość</p>
                              <p className="font-semibold text-sm">{draftVal.toLocaleString('pl-PL')} EUR</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Total summary */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-blue-600">Razem zamówień</p>
                          <p className="font-semibold text-lg text-blue-900">{orderDrafts.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600">Razem ilość</p>
                          <p className="font-semibold text-lg text-blue-900">
                            {orderDrafts.reduce((s, d) => s + d.items.reduce((ss, i) => ss + i.quantity, 0), 0).toLocaleString('pl-PL')} szt.
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600">Razem wartość</p>
                          <p className="font-semibold text-lg text-blue-900">
                            {orderDrafts.reduce((s, d) => s + d.items.reduce((ss, i) => {
                              const p = mockProducts.find(pr => pr.id === i.productId);
                              return ss + i.quantity * (p?.basePrice || 0);
                            }, 0), 0).toLocaleString('pl-PL')} EUR
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {activeTab === 'unordered' && (
            <div className="p-6 space-y-4">
              {unorderedItems.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium mb-1">Brak niezamówionych pozycji</p>
                  <p className="text-sm">
                    Wszystkie pozycje zostały już dodane do zamówień w kolejce
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Niezamówione pozycje</h2>
                    <Button size="sm" onClick={addAllUnorderedToDraft} className="gap-2">
                      <Plus className="w-3 h-3" />
                      Dodaj wszystkie ({unorderedItems.length}) pozycje
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Niezamówione pozycje</p>
                        <p className="text-xl font-semibold">{unorderedItems.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Łączna ilość</p>
                        <p className="text-xl font-semibold">{unorderedTotalsQty.toLocaleString('pl-PL')} szt.</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Łączna wartość</p>
                        <p className="text-xl font-semibold">{unorderedTotalsValue.toLocaleString('pl-PL')} EUR</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Niezamówione kombinacje (priorytet × miesiąc)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Priorytet</TableHead>
                              <TableHead className="text-xs">Miesiąc</TableHead>
                              <TableHead className="text-xs text-right">Ilość pozycji</TableHead>
                              <TableHead className="text-xs text-right">Ilość sztuk</TableHead>
                              <TableHead className="text-xs text-right">Akcje</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unorderedCombinations.map(combo => (
                              <TableRow key={`${combo.priority}-${combo.month}`}>
                                <TableCell className="text-xs">P{combo.priority}</TableCell>
                                <TableCell className="text-xs">{combo.month}</TableCell>
                                <TableCell className="text-xs text-right">{combo.items.length}</TableCell>
                                <TableCell className="text-xs text-right">{combo.quantity} szt.</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addUnorderedCombinationToDraft(combo)}
                                    className="gap-2"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Dodaj
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            {unorderedCombinations.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-xs text-gray-500 py-3">
                                  Brak ruchów niezamówionych
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
