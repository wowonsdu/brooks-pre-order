import { useState, useMemo } from 'react';
import { mockProducts } from '../../lib/mock-data';
import { addConsolidatedOrders, isPreorderEligibleForConsolidation, updateConsolidatedOrders, useConsolidatedOrders, useCustomers, usePreorders } from '../../lib/demo-store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { FileText, Download, Send, Plus, ChevronDown, ChevronUp, SplitSquareVertical, X, List, LayoutGrid, Shield, CalendarDays, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import { useNavigate } from 'react-router';

interface ConsolidatedItemWithDetails {
  variantId: string;
  productId: string;
  quantity: number;
  byPriority: Record<number, number>; // priority -> quantity
  byMonth: Record<string, number>; // month -> quantity
  preorderIds: string[];
}

type SplitMode = 'full' | 'priority' | 'month' | 'quantity' | 'price' | 'combined';

interface SplitConfig {
  mode: SplitMode;
  maxQuantity?: number;
  maxPrice?: number;
}

export function ConsolidationPage() {
  const navigate = useNavigate();
  const preorders = usePreorders();
  const customers = useCustomers();
  const consolidatedOrders = useConsolidatedOrders();
  const [selectedBrand, setSelectedBrand] = useState<string>('Brooks');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showOrderPlanner, setShowOrderPlanner] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [splitMode, setSplitMode] = useState<SplitMode | null>(null);
  const [splitQuantityLimit, setSplitQuantityLimit] = useState<number>(1000);
  const [splitPriceLimit, setSplitPriceLimit] = useState<number>(50000);
  const [viewMode, setViewMode] = useState<'variant' | 'product' | 'priority' | 'month'>('variant');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedPriorities, setExpandedPriorities] = useState<Set<number>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );
  const eligiblePendingPreorders = useMemo(
    () => preorders.filter((preorder) => preorder.status === 'pending' && isPreorderEligibleForConsolidation(preorder, customerById.get(preorder.customerId))),
    [customerById, preorders],
  );
  const blockedBrandSummary = useMemo(() => {
    const blocked = preorders.filter((preorder) => {
      if (preorder.status !== 'pending') return false;
      if (isPreorderEligibleForConsolidation(preorder, customerById.get(preorder.customerId))) return false;
      return preorder.items.some((item) => mockProducts.find((product) => product.id === item.productId)?.brand === selectedBrand);
    });

    return {
      preorderCount: blocked.length,
      customerCount: new Set(blocked.map((preorder) => preorder.customerId)).size,
      totalQuantity: blocked.reduce((sum, preorder) => sum + preorder.items.reduce((itemSum, item) => {
        const product = mockProducts.find((entry) => entry.id === item.productId);
        return product?.brand === selectedBrand ? itemSum + item.quantity : itemSum;
      }, 0), 0),
    };
  }, [customerById, preorders, selectedBrand]);

  // Get all brands from products
  const brands = Array.from(new Set(mockProducts.map(p => p.brand)));

  const toggleItemExpanded = (variantId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(variantId)) {
      newExpanded.delete(variantId);
    } else {
      newExpanded.add(variantId);
    }
    setExpandedItems(newExpanded);
  };

  const toggleItemSelection = (variantId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedItems(newSelected);
  };

  // Consolidate preorders by brand and variant
  const consolidatePreorders = (): ConsolidatedItemWithDetails[] => {
    const consolidated = new Map<string, ConsolidatedItemWithDetails>();

    eligiblePendingPreorders
      .forEach(preorder => {
        preorder.items.forEach(item => {
          const product = mockProducts.find(p => p.id === item.productId);
          if (product?.brand === selectedBrand) {
            const key = item.variantId;
            const month = product.expectedDeliveryDate 
              ? new Date(product.expectedDeliveryDate).toLocaleDateString('pl-PL', { month: 'long' })
              : 'Nieznany';
            
            const existing = consolidated.get(key);
            if (existing) {
              existing.quantity += item.quantity;
              existing.byPriority[preorder.priority] = (existing.byPriority[preorder.priority] || 0) + item.quantity;
              existing.byMonth[month] = (existing.byMonth[month] || 0) + item.quantity;
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
                preorderIds: [preorder.id],
              });
            }
          }
        });
      });

    return Array.from(consolidated.values());
  };

  const consolidatedItems = consolidatePreorders();

  // Group consolidated items by product for product view
  const groupedByProduct = useMemo(() => {
    const groups = new Map<string, {
      productId: string;
      productName: string;
      model: string;
      totalQuantity: number;
      variantCount: number;
      totalValue: number;
      variants: Array<{
        variantId: string;
        sku: string;
        color: string;
        size: string;
        quantity: number;
        byPriority: Record<number, number>;
        byMonth: Record<string, number>;
        preorderIds: string[];
      }>;
      byPriority: Record<number, number>;
      byMonth: Record<string, number>;
    }>();

    consolidatedItems.forEach(item => {
      const product = mockProducts.find(p => p.id === item.productId);
      const variant = product?.variants.find(v => v.id === item.variantId);
      if (!product || !variant) return;

      const existing = groups.get(item.productId);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalValue += item.quantity * product.basePrice;
        existing.variantCount += 1;
        existing.variants.push({
          variantId: item.variantId,
          sku: variant.sku,
          color: variant.color,
          size: variant.size,
          quantity: item.quantity,
          byPriority: item.byPriority,
          byMonth: item.byMonth,
          preorderIds: item.preorderIds,
        });
        Object.entries(item.byPriority).forEach(([p, q]) => {
          existing.byPriority[parseInt(p)] = (existing.byPriority[parseInt(p)] || 0) + q;
        });
        Object.entries(item.byMonth).forEach(([m, q]) => {
          existing.byMonth[m] = (existing.byMonth[m] || 0) + q;
        });
      } else {
        groups.set(item.productId, {
          productId: item.productId,
          productName: product.name,
          model: product.model,
          totalQuantity: item.quantity,
          totalValue: item.quantity * product.basePrice,
          variantCount: 1,
          variants: [{
            variantId: item.variantId,
            sku: variant.sku,
            color: variant.color,
            size: variant.size,
            quantity: item.quantity,
            byPriority: item.byPriority,
            byMonth: item.byMonth,
            preorderIds: item.preorderIds,
          }],
          byPriority: { ...item.byPriority },
          byMonth: { ...item.byMonth },
        });
      }
    });

    // Sort variants within each group by SKU
    groups.forEach(group => {
      group.variants.sort((a, b) => a.sku.localeCompare(b.sku));
    });

    return Array.from(groups.values());
  }, [consolidatedItems]);

  // Group by priority
  const groupedByPriority = useMemo(() => {
    const priorityMap = new Map<number, {
      priority: number;
      totalQuantity: number;
      totalValue: number;
      products: Map<string, {
        productId: string;
        productName: string;
        model: string;
        totalQuantity: number;
        totalValue: number;
        variants: Array<{ variantId: string; sku: string; color: string; size: string; quantity: number }>;
      }>;
      byMonth: Record<string, number>;
    }>();

    eligiblePendingPreorders.forEach(preorder => {
      preorder.items.forEach(item => {
        const product = mockProducts.find(p => p.id === item.productId);
        if (product?.brand !== selectedBrand) return;
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) return;
        const month = product.expectedDeliveryDate
          ? new Date(product.expectedDeliveryDate).toLocaleDateString('pl-PL', { month: 'long' }) : 'Nieznany';

        let group = priorityMap.get(preorder.priority);
        if (!group) {
          group = { priority: preorder.priority, totalQuantity: 0, totalValue: 0, products: new Map(), byMonth: {} };
          priorityMap.set(preorder.priority, group);
        }
        group.totalQuantity += item.quantity;
        group.totalValue += item.quantity * product.basePrice;
        group.byMonth[month] = (group.byMonth[month] || 0) + item.quantity;

        let prod = group.products.get(item.productId);
        if (!prod) {
          prod = { productId: item.productId, productName: product.name, model: product.model, totalQuantity: 0, totalValue: 0, variants: [] };
          group.products.set(item.productId, prod);
        }
        prod.totalQuantity += item.quantity;
        prod.totalValue += item.quantity * product.basePrice;
        const ev = prod.variants.find(v => v.variantId === item.variantId);
        if (ev) { ev.quantity += item.quantity; } else {
          prod.variants.push({ variantId: item.variantId, sku: variant.sku, color: variant.color, size: variant.size, quantity: item.quantity });
        }
      });
    });

    return Array.from(priorityMap.values()).sort((a, b) => a.priority - b.priority).map(g => ({
      ...g,
      productCount: g.products.size,
      variantCount: Array.from(g.products.values()).reduce((s, p) => s + p.variants.length, 0),
      productsList: Array.from(g.products.values()).sort((a, b) => a.productName.localeCompare(b.productName)),
    }));
  }, [eligiblePendingPreorders, consolidatedItems, selectedBrand]);

  // Group by month
  const groupedByMonth = useMemo(() => {
    const monthMap = new Map<string, {
      month: string;
      totalQuantity: number;
      totalValue: number;
      products: Map<string, {
        productId: string;
        productName: string;
        model: string;
        totalQuantity: number;
        totalValue: number;
        variants: Array<{ variantId: string; sku: string; color: string; size: string; quantity: number }>;
      }>;
      byPriority: Record<number, number>;
    }>();

    eligiblePendingPreorders.forEach(preorder => {
      preorder.items.forEach(item => {
        const product = mockProducts.find(p => p.id === item.productId);
        if (product?.brand !== selectedBrand) return;
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) return;
        const month = product.expectedDeliveryDate
          ? new Date(product.expectedDeliveryDate).toLocaleDateString('pl-PL', { month: 'long' }) : 'Nieznany';

        let group = monthMap.get(month);
        if (!group) {
          group = { month, totalQuantity: 0, totalValue: 0, products: new Map(), byPriority: {} };
          monthMap.set(month, group);
        }
        group.totalQuantity += item.quantity;
        group.totalValue += item.quantity * product.basePrice;
        group.byPriority[preorder.priority] = (group.byPriority[preorder.priority] || 0) + item.quantity;

        let prod = group.products.get(item.productId);
        if (!prod) {
          prod = { productId: item.productId, productName: product.name, model: product.model, totalQuantity: 0, totalValue: 0, variants: [] };
          group.products.set(item.productId, prod);
        }
        prod.totalQuantity += item.quantity;
        prod.totalValue += item.quantity * product.basePrice;
        const ev = prod.variants.find(v => v.variantId === item.variantId);
        if (ev) { ev.quantity += item.quantity; } else {
          prod.variants.push({ variantId: item.variantId, sku: variant.sku, color: variant.color, size: variant.size, quantity: item.quantity });
        }
      });
    });

    return Array.from(monthMap.values()).map(g => ({
      ...g,
      productCount: g.products.size,
      variantCount: Array.from(g.products.values()).reduce((s, p) => s + p.variants.length, 0),
      productsList: Array.from(g.products.values()).sort((a, b) => a.productName.localeCompare(b.productName)),
    }));
  }, [eligiblePendingPreorders, consolidatedItems, selectedBrand]);

  const togglePriorityExpanded = (p: number) => {
    const next = new Set(expandedPriorities);
    next.has(p) ? next.delete(p) : next.add(p);
    setExpandedPriorities(next);
  };
  const toggleMonthExpanded = (m: string) => {
    const next = new Set(expandedMonths);
    next.has(m) ? next.delete(m) : next.add(m);
    setExpandedMonths(next);
  };

  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (prev?.column === column) return prev.direction === 'asc' ? { column, direction: 'desc' } : null;
      return { column, direction: 'asc' };
    });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.column !== column) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" /> : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  const SortableHead = ({ column, children, className = '' }: { column: string; children: React.ReactNode; className?: string }) => (
    <TableHead className={`cursor-pointer select-none hover:bg-gray-50 ${className}`} onClick={() => handleSort(column)}>
      <span className="inline-flex items-center">{children}<SortIcon column={column} /></span>
    </TableHead>
  );

  const priorityColors: Record<string, string> = {
    '1': 'bg-red-100 text-red-800', '2': 'bg-orange-100 text-orange-800',
    '3': 'bg-yellow-100 text-yellow-800', '4': 'bg-green-100 text-green-800', '5': 'bg-blue-100 text-blue-800',
  };

  const sortData = <T,>(items: T[], getVal: (item: T) => string | number): T[] => {
    if (!sortConfig) return items;
    return [...items].sort((a, b) => {
      const va = getVal(a); const vb = getVal(b);
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  };

  const toggleProductExpanded = (productId: string) => {
    const next = new Set(expandedProducts);
    next.has(productId) ? next.delete(productId) : next.add(productId);
    setExpandedProducts(next);
  };

  const getProductDetails = (productId: string, variantId: string) => {
    const product = mockProducts.find(p => p.id === productId);
    const variant = product?.variants.find(v => v.id === variantId);
    return { product, variant };
  };

  const handleCreateOrder = () => {
    const newOrder = {
      id: `co-${Date.now()}`,
      supplier: selectedBrand === 'Brooks' ? 'Brooks Europe' : `${selectedBrand} Supplier`,
      brand: selectedBrand,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      items: consolidatedItems.map(ci => ({
        variantId: ci.variantId,
        productId: ci.productId,
        quantity: ci.quantity,
      })),
    };

    addConsolidatedOrders([newOrder]);
    toast.success('Utworzono zamówienie konsolidacyjne', {
      description: `Zamówienie dla ${selectedBrand} - ${consolidatedItems.reduce((s, i) => s + i.quantity, 0)} szt.`,
    });
  };

  // Split by priority: create separate orders for each priority level
  const handleSplitByPriority = () => {
    const priorities = new Set<number>();
    consolidatedItems.forEach(item => {
      Object.keys(item.byPriority).forEach(p => priorities.add(parseInt(p)));
    });

    const newOrders = Array.from(priorities).sort().map(priority => {
      const items = consolidatedItems
        .filter(item => item.byPriority[priority])
        .map(item => ({
          variantId: item.variantId,
          productId: item.productId,
          quantity: item.byPriority[priority] || 0,
        }))
        .filter(i => i.quantity > 0);

      return {
        id: `co-${Date.now()}-p${priority}`,
        supplier: `${selectedBrand === 'Brooks' ? 'Brooks Europe' : selectedBrand} (P${priority})`,
        brand: selectedBrand,
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        items,
      };
    }).filter(o => o.items.length > 0);

    addConsolidatedOrders(newOrders);
    toast.success(`Utworzono ${newOrders.length} zamówień wg priorytetu`, {
      description: newOrders.map(o => `${o.supplier}: ${o.items.reduce((s, i) => s + i.quantity, 0)} szt.`).join(', '),
    });
    setShowOrderPlanner(false);
    setSplitMode(null);
  };

  // Split by month
  const handleSplitByMonth = () => {
    const months = new Set<string>();
    consolidatedItems.forEach(item => {
      Object.keys(item.byMonth).forEach(m => months.add(m));
    });

    const newOrders = Array.from(months).map(month => {
      const items = consolidatedItems
        .filter(item => item.byMonth[month])
        .map(item => ({
          variantId: item.variantId,
          productId: item.productId,
          quantity: item.byMonth[month] || 0,
        }))
        .filter(i => i.quantity > 0);

      return {
        id: `co-${Date.now()}-${month}`,
        supplier: `${selectedBrand === 'Brooks' ? 'Brooks Europe' : selectedBrand} (${month})`,
        brand: selectedBrand,
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        items,
      };
    }).filter(o => o.items.length > 0);

    addConsolidatedOrders(newOrders);
    toast.success(`Utworzono ${newOrders.length} zamówień wg miesiąca`, {
      description: newOrders.map(o => `${o.supplier}: ${o.items.reduce((s, i) => s + i.quantity, 0)} szt.`).join(', '),
    });
    setShowOrderPlanner(false);
    setSplitMode(null);
  };

  // Split by quantity limit
  const handleSplitByQuantity = () => {
    const limit = splitQuantityLimit;
    const allItems = consolidatedItems.map(item => ({
      variantId: item.variantId,
      productId: item.productId,
      quantity: item.quantity,
    }));

    const orders: typeof allItems[] = [];
    let currentBatch: typeof allItems = [];
    let currentQty = 0;

    allItems.forEach(item => {
      let remaining = item.quantity;
      while (remaining > 0) {
        const spaceLeft = limit - currentQty;
        const take = Math.min(remaining, spaceLeft);
        currentBatch.push({ ...item, quantity: take });
        currentQty += take;
        remaining -= take;
        if (currentQty >= limit) {
          orders.push(currentBatch);
          currentBatch = [];
          currentQty = 0;
        }
      }
    });
    if (currentBatch.length > 0) orders.push(currentBatch);

    const newOrders = orders.map((items, idx) => ({
      id: `co-${Date.now()}-q${idx + 1}`,
      supplier: `${selectedBrand === 'Brooks' ? 'Brooks Europe' : selectedBrand} (Część ${idx + 1}/${orders.length})`,
      brand: selectedBrand,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      items,
    }));

    addConsolidatedOrders(newOrders);
    toast.success(`Utworzono ${newOrders.length} zamówień (max ${limit} szt. każde)`, {
      description: newOrders.map(o => `${o.supplier}: ${o.items.reduce((s, i) => s + i.quantity, 0)} szt.`).join(', '),
    });
    setShowOrderPlanner(false);
    setSplitMode(null);
  };

  // Split by price limit
  const handleSplitByPrice = () => {
    const limit = splitPriceLimit;
    const allItems = consolidatedItems.map(item => {
      const product = mockProducts.find(p => p.id === item.productId);
      return {
        variantId: item.variantId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product?.basePrice || 0,
      };
    });

    const orders: { variantId: string; productId: string; quantity: number }[][] = [];
    let currentBatch: { variantId: string; productId: string; quantity: number }[] = [];
    let currentValue = 0;

    allItems.forEach(item => {
      let remaining = item.quantity;
      while (remaining > 0) {
        const spaceLeft = limit - currentValue;
        const maxUnits = item.unitPrice > 0 ? Math.floor(spaceLeft / item.unitPrice) : remaining;
        const take = Math.min(remaining, Math.max(maxUnits, 1));
        currentBatch.push({ variantId: item.variantId, productId: item.productId, quantity: take });
        currentValue += take * item.unitPrice;
        remaining -= take;
        if (currentValue >= limit) {
          orders.push(currentBatch);
          currentBatch = [];
          currentValue = 0;
        }
      }
    });
    if (currentBatch.length > 0) orders.push(currentBatch);

    const newOrders = orders.map((items, idx) => ({
      id: `co-${Date.now()}-v${idx + 1}`,
      supplier: `${selectedBrand === 'Brooks' ? 'Brooks Europe' : selectedBrand} (Wartość ${idx + 1}/${orders.length})`,
      brand: selectedBrand,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      items,
    }));

    addConsolidatedOrders(newOrders);
    toast.success(`Utworzono ${newOrders.length} zamówień (max ${limit.toLocaleString()} EUR każde)`);
    setShowOrderPlanner(false);
    setSplitMode(null);
  };

  // Combined: priority + month
  const handleSplitCombined = () => {
    const combos = new Map<string, { variantId: string; productId: string; quantity: number }[]>();

    consolidatedItems.forEach(item => {
      Object.entries(item.byPriority).forEach(([priority, _]) => {
        Object.entries(item.byMonth).forEach(([month, qty]) => {
          // Approximate: distribute proportionally
          const totalPriorityQty = Object.values(item.byPriority).reduce((s, v) => s + v, 0);
          const totalMonthQty = Object.values(item.byMonth).reduce((s, v) => s + v, 0);
          const pRatio = (item.byPriority[parseInt(priority)] || 0) / totalPriorityQty;
          const mRatio = qty / totalMonthQty;
          const approxQty = Math.round(item.quantity * pRatio * mRatio);
          if (approxQty <= 0) return;

          const key = `P${priority}-${month}`;
          if (!combos.has(key)) combos.set(key, []);
          combos.get(key)!.push({
            variantId: item.variantId,
            productId: item.productId,
            quantity: approxQty,
          });
        });
      });
    });

    const newOrders = Array.from(combos.entries())
      .filter(([, items]) => items.length > 0)
      .map(([key, items], idx) => ({
        id: `co-${Date.now()}-c${idx}`,
        supplier: `${selectedBrand === 'Brooks' ? 'Brooks Europe' : selectedBrand} (${key})`,
        brand: selectedBrand,
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        items,
      }));

    addConsolidatedOrders(newOrders);
    toast.success(`Utworzono ${newOrders.length} zamówień (priorytet + miesiąc)`);
    setShowOrderPlanner(false);
    setSplitMode(null);
  };

  const handleExportOrder = (orderId: string) => {
    const order = consolidatedOrders.find(o => o.id === orderId);
    if (!order) return;

    // Mock Excel export
    let csvContent = 'SKU,Product,Color,Size,Quantity\n';
    order.items.forEach(item => {
      const { product, variant } = getProductDetails(item.productId, item.variantId);
      if (product && variant) {
        csvContent += `${variant.sku},${product.name},${variant.color},${variant.size},${item.quantity}\n`;
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${order.supplier}-${Date.now()}.csv`;
    a.click();

    toast.success('Wyeksportowano zamówienie');
  };

  const handleSendOrder = (orderId: string) => {
    updateConsolidatedOrders(orders =>
      orders.map(o =>
        o.id === orderId
          ? { ...o, status: 'sent' as const, sentAt: new Date().toISOString() }
          : o
      )
    );
    toast.success('Zamówienie oznaczone jako wysłane');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'Wersja robocza', variant: 'secondary' as const },
      sent: { label: 'Wysłane', variant: 'default' as const },
      confirmed: { label: 'Potwierdzone', variant: 'default' as const },
      delivered: { label: 'Dostarczone', variant: 'default' as const },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Konsolidacja Zamówień</h1>
        <p className="text-gray-600 mt-1">Agreguj preordery i generuj zamówienia do dostawców</p>
      </div>

      <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Wybierz Markę</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm">
                <Label htmlFor="brand" className="mb-2 block">Marka/Dostawca</Label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger id="brand">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Skonsolidowane Zapotrzebowanie - {selectedBrand}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const csvContent = consolidatedItems.map(item => {
                        const { product, variant } = getProductDetails(item.productId, item.variantId);
                        return product && variant 
                          ? `${variant.sku},${product.name},${variant.color},${variant.size},${item.quantity}`
                          : '';
                      }).filter(Boolean).join('\n');
                      
                      const blob = new Blob([`SKU,Product,Color,Size,Quantity\n${csvContent}`], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `consolidated-${selectedBrand}-${Date.now()}.csv`;
                      a.click();
                      toast.success('Wyeksportowano zestawienie');
                    }}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Eksportuj
                  </Button>
                  <Button
                    onClick={() => navigate('/admin/order-configurator')}
                    disabled={consolidatedItems.length === 0}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Utwórz Zamówienie
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {blockedBrandSummary.preorderCount > 0 && (
                <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                  Wstrzymane przez zaległości: {blockedBrandSummary.preorderCount} preorderów od {blockedBrandSummary.customerCount} klientów, łącznie {blockedBrandSummary.totalQuantity} szt. Nie są uwzględnione w konsolidacji. Przejdź do dashboardu, aby je dopuścić lub wstrzymać.
                </div>
              )}
              {consolidatedItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Brak aktywnych preorderów dla marki {selectedBrand}</p>
                </div>
              ) : (
                <>
                  {/* View mode toggle */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-gray-500">Widok:</span>
                    <div className="flex border rounded-lg overflow-hidden">
                      {([
                        { key: 'variant' as const, icon: List, label: 'Per wariant' },
                        { key: 'product' as const, icon: LayoutGrid, label: 'Per produkt' },
                        { key: 'priority' as const, icon: Shield, label: 'Per priorytet' },
                        { key: 'month' as const, icon: CalendarDays, label: 'Per miesiąc' },
                      ] as const).map(({ key, icon: Icon, label }, idx) => (
                        <button
                          key={key}
                          onClick={() => { setViewMode(key); setSortConfig(null); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${idx > 0 ? 'border-l' : ''} ${
                            viewMode === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {viewMode === 'variant' ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <SortableHead column="sku">SKU</SortableHead>
                        <SortableHead column="model">Model</SortableHead>
                        <SortableHead column="color">Kolor</SortableHead>
                        <SortableHead column="size">Rozmiar</SortableHead>
                        <SortableHead column="quantity" className="text-right">Ilość</SortableHead>
                        <SortableHead column="value" className="text-right">Wartość (EUR)</SortableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(consolidatedItems, item => {
                        if (!sortConfig) return 0;
                        const { product, variant } = getProductDetails(item.productId, item.variantId);
                        if (!product || !variant) return '';
                        switch (sortConfig.column) {
                          case 'sku': return variant.sku;
                          case 'model': return product.model;
                          case 'color': return variant.color;
                          case 'size': return variant.size;
                          case 'quantity': return item.quantity;
                          case 'value': return item.quantity * product.basePrice;
                          default: return 0;
                        }
                      }).map(item => {
                        const { product, variant } = getProductDetails(item.productId, item.variantId);
                        if (!product || !variant) return null;
                        const isExpanded = expandedItems.has(item.variantId);

                        return (
                          <React.Fragment key={item.variantId}>
                            <TableRow className="hover:bg-gray-50">
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleItemExpanded(item.variantId)}
                                  className="p-1 h-auto"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                              <TableCell className="font-medium">{product.model}</TableCell>
                              <TableCell>{variant.color}</TableCell>
                              <TableCell>{variant.size}</TableCell>
                              <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                              <TableCell className="text-right font-semibold">{(item.quantity * product.basePrice).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={7} className="bg-gray-50 p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* By Priority */}
                                    <div>
                                      <h4 className="font-semibold mb-2 text-sm">Według priorytetu klienta:</h4>
                                      <div className="space-y-1">
                                        {Object.entries(item.byPriority)
                                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                          .map(([priority, qty]) => {
                                            const priorityColors: Record<string, string> = {
                                              '1': 'bg-red-100 text-red-800',
                                              '2': 'bg-orange-100 text-orange-800',
                                              '3': 'bg-yellow-100 text-yellow-800',
                                              '4': 'bg-green-100 text-green-800',
                                              '5': 'bg-blue-100 text-blue-800',
                                            };
                                            return (
                                              <div key={priority} className="flex justify-between items-center text-sm">
                                                <Badge variant="outline" className={priorityColors[priority] || 'bg-gray-100'}>
                                                  Priorytet {priority}
                                                </Badge>
                                                <span className="font-medium">{qty} szt.</span>
                                              </div>
                                            );
                                          })}
                                      </div>
                                    </div>

                                    {/* By Month */}
                                    <div>
                                      <h4 className="font-semibold mb-2 text-sm">Według miesiąca dostawy:</h4>
                                      <div className="space-y-1">
                                        {Object.entries(item.byMonth).map(([month, qty]) => (
                                          <div key={month} className="flex justify-between items-center text-sm">
                                            <Badge variant="outline" className="bg-blue-50 text-blue-800">
                                              {month}
                                            </Badge>
                                            <span className="font-medium">{qty} szt.</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-3 text-xs text-gray-500">
                                    Z {item.preorderIds.length} preorderów
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-semibold">
                          Suma:
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {consolidatedItems.reduce((sum, item) => sum + item.quantity, 0)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {consolidatedItems.reduce((sum, item) => {
                            const { product } = getProductDetails(item.productId, item.variantId);
                            return sum + item.quantity * (product?.basePrice || 0);
                          }, 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  ) : viewMode === 'product' ? (
                  /* Product grouped view */
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <SortableHead column="product">Produkt</SortableHead>
                        <TableHead>Miesiąc dostawy</TableHead>
                        <SortableHead column="variants" className="text-center">Warianty</SortableHead>
                        <SortableHead column="quantity" className="text-right">Ilość</SortableHead>
                        <SortableHead column="value" className="text-right">Wartość (EUR)</SortableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(groupedByProduct, g => {
                        if (!sortConfig) return 0;
                        switch (sortConfig.column) {
                          case 'product': return g.productName;
                          case 'variants': return g.variantCount;
                          case 'quantity': return g.totalQuantity;
                          case 'value': return g.totalValue;
                          default: return 0;
                        }
                      }).map(group => {
                        const isExpanded = expandedProducts.has(group.productId);
                        return (
                          <React.Fragment key={group.productId}>
                            <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleProductExpanded(group.productId)}>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-auto"
                                  onClick={e => { e.stopPropagation(); toggleProductExpanded(group.productId); }}
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{group.productName}</span>
                                <span className="text-gray-500 text-xs ml-2">{group.model}</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Object.keys(group.byMonth).map(month => (
                                    <Badge key={month} variant="outline" className="bg-blue-50 text-blue-800 text-xs">
                                      {month}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="bg-gray-100">{group.variantCount}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold">{group.totalQuantity.toLocaleString('pl-PL')}</TableCell>
                              <TableCell className="text-right font-semibold">{group.totalValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={6} className="p-0">
                                  <div className="bg-gray-50 border-y">
                                    {/* Priority & Month summary */}
                                    <div className="px-6 py-3 border-b bg-gray-100/50">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <h4 className="font-semibold mb-1.5 text-xs text-gray-500 uppercase tracking-wide">Priorytet klienta</h4>
                                          <div className="flex flex-wrap gap-2">
                                            {Object.entries(group.byPriority)
                                              .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                              .map(([priority, qty]) => {
                                                const colors: Record<string, string> = {
                                                  '1': 'bg-red-100 text-red-800',
                                                  '2': 'bg-orange-100 text-orange-800',
                                                  '3': 'bg-yellow-100 text-yellow-800',
                                                  '4': 'bg-green-100 text-green-800',
                                                  '5': 'bg-blue-100 text-blue-800',
                                                };
                                                return (
                                                  <Badge key={priority} variant="outline" className={`${colors[priority] || 'bg-gray-100'} text-xs`}>
                                                    P{priority}: {qty} szt.
                                                  </Badge>
                                                );
                                              })}
                                          </div>
                                        </div>
                                        <div>
                                          <h4 className="font-semibold mb-1.5 text-xs text-gray-500 uppercase tracking-wide">Miesiąc dostawy</h4>
                                          <div className="flex flex-wrap gap-2">
                                            {Object.entries(group.byMonth).map(([month, qty]) => (
                                              <Badge key={month} variant="outline" className="bg-blue-50 text-blue-800 text-xs">
                                                {month}: {qty} szt.
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {/* Variant sub-table */}
                                    <table className="w-full">
                                      <thead>
                                        <tr className="text-xs text-gray-500 border-b">
                                          <th className="text-left py-2 px-6 font-medium">SKU</th>
                                          <th className="text-left py-2 px-3 font-medium">Kolor</th>
                                          <th className="text-left py-2 px-3 font-medium">Rozmiar</th>
                                          <th className="text-right py-2 px-3 font-medium">Ilość</th>
                                          <th className="text-right py-2 px-6 font-medium">Wartość</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {group.variants.map(v => {
                                          const product = mockProducts.find(p => p.id === group.productId);
                                          const unitPrice = product?.basePrice || 0;
                                          return (
                                            <tr key={v.variantId} className="border-b last:border-b-0 hover:bg-gray-100/50 text-sm">
                                              <td className="py-2 px-6 font-mono text-xs text-gray-700">{v.sku}</td>
                                              <td className="py-2 px-3">{v.color}</td>
                                              <td className="py-2 px-3">{v.size}</td>
                                              <td className="py-2 px-3 text-right font-medium">{v.quantity}</td>
                                              <td className="py-2 px-6 text-right text-gray-600">{(v.quantity * unitPrice).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-semibold">Suma:</TableCell>
                        <TableCell className="text-right font-bold">
                          {groupedByProduct.reduce((s, g) => s + g.totalQuantity, 0).toLocaleString('pl-PL')}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {groupedByProduct.reduce((s, g) => s + g.totalValue, 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  ) : viewMode === 'priority' ? (
                  /* Priority grouped view */
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <SortableHead column="priority">Priorytet</SortableHead>
                        <TableHead>Miesiące</TableHead>
                        <SortableHead column="products" className="text-center">Produkty</SortableHead>
                        <SortableHead column="variants" className="text-center">Warianty</SortableHead>
                        <SortableHead column="quantity" className="text-right">Ilość</SortableHead>
                        <SortableHead column="value" className="text-right">Wartość (EUR)</SortableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(groupedByPriority, g => {
                        if (!sortConfig) return 0;
                        switch (sortConfig.column) {
                          case 'priority': return g.priority;
                          case 'products': return g.productCount;
                          case 'variants': return g.variantCount;
                          case 'quantity': return g.totalQuantity;
                          case 'value': return g.totalValue;
                          default: return 0;
                        }
                      }).map(group => {
                        const isExpanded = expandedPriorities.has(group.priority);
                        return (
                          <React.Fragment key={group.priority}>
                            <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => togglePriorityExpanded(group.priority)}>
                              <TableCell>
                                <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={e => { e.stopPropagation(); togglePriorityExpanded(group.priority); }}>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`${priorityColors[String(group.priority)] || 'bg-gray-100'}`}>
                                  Priorytet {group.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Object.keys(group.byMonth).map(m => (
                                    <Badge key={m} variant="outline" className="bg-blue-50 text-blue-800 text-xs">{m}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-gray-100">{group.productCount}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-gray-100">{group.variantCount}</Badge></TableCell>
                              <TableCell className="text-right font-semibold">{group.totalQuantity.toLocaleString('pl-PL')}</TableCell>
                              <TableCell className="text-right font-semibold">{group.totalValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={7} className="p-0">
                                  <div className="bg-gray-50 border-y">
                                    <div className="px-6 py-3 border-b bg-gray-100/50">
                                      <h4 className="font-semibold mb-1.5 text-xs text-gray-500 uppercase tracking-wide">Rozkład wg miesiąca</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {Object.entries(group.byMonth).map(([month, qty]) => (
                                          <Badge key={month} variant="outline" className="bg-blue-50 text-blue-800 text-xs">{month}: {qty} szt.</Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <table className="w-full">
                                      <thead>
                                        <tr className="text-xs text-gray-500 border-b">
                                          <th className="text-left py-2 px-6 font-medium">Produkt</th>
                                          <th className="text-left py-2 px-3 font-medium">Model</th>
                                          <th className="text-center py-2 px-3 font-medium">Warianty</th>
                                          <th className="text-right py-2 px-3 font-medium">Ilość</th>
                                          <th className="text-right py-2 px-6 font-medium">Wartość</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {group.productsList.map(prod => (
                                          <tr key={prod.productId} className="border-b last:border-b-0 hover:bg-gray-100/50 text-sm">
                                            <td className="py-2 px-6 font-medium">{prod.productName}</td>
                                            <td className="py-2 px-3 text-gray-600">{prod.model}</td>
                                            <td className="py-2 px-3 text-center">{prod.variants.length}</td>
                                            <td className="py-2 px-3 text-right font-medium">{prod.totalQuantity}</td>
                                            <td className="py-2 px-6 text-right text-gray-600">{prod.totalValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-semibold">Suma:</TableCell>
                        <TableCell className="text-right font-bold">{groupedByPriority.reduce((s, g) => s + g.totalQuantity, 0).toLocaleString('pl-PL')}</TableCell>
                        <TableCell className="text-right font-bold">{groupedByPriority.reduce((s, g) => s + g.totalValue, 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  ) : (
                  /* Month grouped view */
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <SortableHead column="month">Miesiąc dostawy</SortableHead>
                        <TableHead>Priorytety</TableHead>
                        <SortableHead column="products" className="text-center">Produkty</SortableHead>
                        <SortableHead column="variants" className="text-center">Warianty</SortableHead>
                        <SortableHead column="quantity" className="text-right">Ilość</SortableHead>
                        <SortableHead column="value" className="text-right">Wartość (EUR)</SortableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(groupedByMonth, g => {
                        if (!sortConfig) return 0;
                        switch (sortConfig.column) {
                          case 'month': return g.month;
                          case 'products': return g.productCount;
                          case 'variants': return g.variantCount;
                          case 'quantity': return g.totalQuantity;
                          case 'value': return g.totalValue;
                          default: return 0;
                        }
                      }).map(group => {
                        const isExpanded = expandedMonths.has(group.month);
                        return (
                          <React.Fragment key={group.month}>
                            <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleMonthExpanded(group.month)}>
                              <TableCell>
                                <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={e => { e.stopPropagation(); toggleMonthExpanded(group.month); }}>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-800">{group.month}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(group.byPriority).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([p, qty]) => (
                                    <Badge key={p} variant="outline" className={`${priorityColors[p] || 'bg-gray-100'} text-xs`}>P{p}: {qty}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-gray-100">{group.productCount}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-gray-100">{group.variantCount}</Badge></TableCell>
                              <TableCell className="text-right font-semibold">{group.totalQuantity.toLocaleString('pl-PL')}</TableCell>
                              <TableCell className="text-right font-semibold">{group.totalValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={7} className="p-0">
                                  <div className="bg-gray-50 border-y">
                                    <div className="px-6 py-3 border-b bg-gray-100/50">
                                      <h4 className="font-semibold mb-1.5 text-xs text-gray-500 uppercase tracking-wide">Rozkład wg priorytetu</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {Object.entries(group.byPriority).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([p, qty]) => (
                                          <Badge key={p} variant="outline" className={`${priorityColors[p] || 'bg-gray-100'} text-xs`}>Priorytet {p}: {qty} szt.</Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <table className="w-full">
                                      <thead>
                                        <tr className="text-xs text-gray-500 border-b">
                                          <th className="text-left py-2 px-6 font-medium">Produkt</th>
                                          <th className="text-left py-2 px-3 font-medium">Model</th>
                                          <th className="text-center py-2 px-3 font-medium">Warianty</th>
                                          <th className="text-right py-2 px-3 font-medium">Ilość</th>
                                          <th className="text-right py-2 px-6 font-medium">Wartość</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {group.productsList.map(prod => (
                                          <tr key={prod.productId} className="border-b last:border-b-0 hover:bg-gray-100/50 text-sm">
                                            <td className="py-2 px-6 font-medium">{prod.productName}</td>
                                            <td className="py-2 px-3 text-gray-600">{prod.model}</td>
                                            <td className="py-2 px-3 text-center">{prod.variants.length}</td>
                                            <td className="py-2 px-3 text-right font-medium">{prod.totalQuantity}</td>
                                            <td className="py-2 px-6 text-right text-gray-600">{prod.totalValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-semibold">Suma:</TableCell>
                        <TableCell className="text-right font-bold">{groupedByMonth.reduce((s, g) => s + g.totalQuantity, 0).toLocaleString('pl-PL')}</TableCell>
                        <TableCell className="text-right font-bold">{groupedByMonth.reduce((s, g) => s + g.totalValue, 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  )}

                  {/* Order Planner Modal */}
                  {showOrderPlanner && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle>Planer Zamówień - {selectedBrand}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => { setShowOrderPlanner(false); setSplitMode(null); }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-gray-600">
                            {!splitMode 
                              ? 'Wybierz sposób podziału zamówienia na mniejsze części'
                              : splitMode === 'quantity' 
                                ? 'Ustaw maksymalną ilość sztuk na jedno zamówienie'
                                : splitMode === 'price'
                                  ? 'Ustaw maksymalną wartość jednego zamówienia'
                                  : 'Konfiguracja podziału'}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {!splitMode ? (
                            <>
                              <Button
                                variant="outline"
                                className="w-full justify-start h-auto py-4"
                                onClick={() => {
                                  handleCreateOrder();
                                  setShowOrderPlanner(false);
                                }}
                              >
                                <div className="text-left">
                                  <div className="font-semibold">Zamówienie Całościowe</div>
                                  <div className="text-sm text-gray-600">
                                    Jedna pełna konsolidacja wszystkich pozycji ({consolidatedItems.reduce((s, i) => s + i.quantity, 0)} szt.)
                                  </div>
                                </div>
                              </Button>

                              <Button
                                variant="outline"
                                className="w-full justify-start h-auto py-4"
                                onClick={() => handleSplitByPriority()}
                              >
                                <div className="text-left">
                                  <div className="font-semibold">Podział według Priorytetu Klienta</div>
                                  <div className="text-sm text-gray-600">
                                    Osobne zamówienia dla P1, P2, P3, P4, P5
                                  </div>
                                </div>
                              </Button>

                              <Button
                                variant="outline"
                                className="w-full justify-start h-auto py-4"
                                onClick={() => handleSplitByMonth()}
                              >
                                <div className="text-left">
                                  <div className="font-semibold">Podział według Miesiąca Dostawy</div>
                                  <div className="text-sm text-gray-600">
                                    Osobne zamówienia dla Maj, Czerwiec, etc.
                                  </div>
                                </div>
                              </Button>

                              <Button
                                variant="outline"
                                className="w-full justify-start h-auto py-4"
                                onClick={() => setSplitMode('quantity')}
                              >
                                <div className="text-left">
                                  <div className="font-semibold">Podział według Ilości Sztuk</div>
                                  <div className="text-sm text-gray-600">
                                    Zamówienia po np. 1000, 2000 lub 5000 sztuk
                                  </div>
                                </div>
                              </Button>

                              <Button
                                variant="outline"
                                className="w-full justify-start h-auto py-4"
                                onClick={() => setSplitMode('price')}
                              >
                                <div className="text-left">
                                  <div className="font-semibold">Podział według Ceny Zamówienia</div>
                                  <div className="text-sm text-gray-600">
                                    Zamówienia o określonej wartości (np. max 50k EUR)
                                  </div>
                                </div>
                              </Button>

                              <Button
                                variant="outline"
                                className="w-full justify-start h-auto py-4"
                                onClick={() => handleSplitCombined()}
                              >
                                <div className="text-left">
                                  <div className="font-semibold">Podział Kombinowany</div>
                                  <div className="text-sm text-gray-600">
                                    Priorytet × Miesiąc dostawy
                                  </div>
                                </div>
                              </Button>
                            </>
                          ) : splitMode === 'quantity' ? (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="qty-limit" className="mb-2 block">Maksymalna ilość sztuk na zamówienie</Label>
                                <div className="flex gap-2 flex-wrap">
                                  {[500, 1000, 2000, 5000].map(val => (
                                    <Button
                                      key={val}
                                      variant={splitQuantityLimit === val ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setSplitQuantityLimit(val)}
                                    >
                                      {val.toLocaleString()} szt.
                                    </Button>
                                  ))}
                                </div>
                                <input
                                  id="qty-limit"
                                  type="number"
                                  value={splitQuantityLimit}
                                  onChange={e => setSplitQuantityLimit(Number(e.target.value))}
                                  className="mt-2 w-full border rounded-md px-3 py-2 text-sm"
                                  min={1}
                                />
                              </div>
                              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600">
                                Łączna ilość: <span className="font-semibold">{consolidatedItems.reduce((s, i) => s + i.quantity, 0).toLocaleString()} szt.</span>
                                {' → '}
                                Szacunkowa liczba zamówień: <span className="font-semibold">{Math.ceil(consolidatedItems.reduce((s, i) => s + i.quantity, 0) / splitQuantityLimit)}</span>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setSplitMode(null)}>Wstecz</Button>
                                <Button onClick={() => handleSplitByQuantity()}>
                                  <SplitSquareVertical className="w-4 h-4 mr-2" />
                                  Podziel zamówienie
                                </Button>
                              </div>
                            </div>
                          ) : splitMode === 'price' ? (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="price-limit" className="mb-2 block">Maksymalna wartość zamówienia (EUR)</Label>
                                <div className="flex gap-2 flex-wrap">
                                  {[10000, 25000, 50000, 100000].map(val => (
                                    <Button
                                      key={val}
                                      variant={splitPriceLimit === val ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setSplitPriceLimit(val)}
                                    >
                                      {val.toLocaleString()} EUR
                                    </Button>
                                  ))}
                                </div>
                                <input
                                  id="price-limit"
                                  type="number"
                                  value={splitPriceLimit}
                                  onChange={e => setSplitPriceLimit(Number(e.target.value))}
                                  className="mt-2 w-full border rounded-md px-3 py-2 text-sm"
                                  min={1}
                                />
                              </div>
                              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600">
                                Szacunkowa wartość łączna: <span className="font-semibold">
                                  {consolidatedItems.reduce((s, i) => {
                                    const p = mockProducts.find(pr => pr.id === i.productId);
                                    return s + i.quantity * (p?.basePrice || 0);
                                  }, 0).toLocaleString()} EUR
                                </span>
                                {' → '}
                                Szacunkowa liczba zamówień: <span className="font-semibold">
                                  {Math.ceil(consolidatedItems.reduce((s, i) => {
                                    const p = mockProducts.find(pr => pr.id === i.productId);
                                    return s + i.quantity * (p?.basePrice || 0);
                                  }, 0) / splitPriceLimit)}
                                </span>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setSplitMode(null)}>Wstecz</Button>
                                <Button onClick={() => handleSplitByPrice()}>
                                  <SplitSquareVertical className="w-4 h-4 mr-2" />
                                  Podziel zamówienie
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
