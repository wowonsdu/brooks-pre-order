import { useMemo, useRef, useState } from 'react';
import { Preorder } from '../../lib/mock-data';
import { getDebtDecisionLabel, getDebtDurationLabel, getProductById, getSeasonLabel, isCustomerDelinquent, reorderPreorders, setPreorderAllocationPosition, useCustomers, usePreorders } from '../../lib/demo-store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, Filter, Download, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import React from 'react';

type SortField = 'allocationOrder' | 'orderNumber' | 'customerName' | 'companyName' | 'customerPriority' | 'priority' | 'items' | 'totalQuantity' | 'status' | 'createdAt' | 'deliveryMonth';
type SortDirection = 'asc' | 'desc';

export function PreordersListPage() {
  const preorders = usePreorders();
  const customers = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deliveryMonthFilter, setDeliveryMonthFilter] = useState<string>('all');
  const [groupByMonth, setGroupByMonth] = useState(false);
  const [expandedPreorder, setExpandedPreorder] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({ field: 'deliveryMonth', direction: 'asc' });
  const [draggedPreorderId, setDraggedPreorderId] = useState<string | null>(null);
  const [dropTargetPreorderId, setDropTargetPreorderId] = useState<string | null>(null);
  const dragStateRef = useRef<{ draggedId: string | null; dropTargetId: string | null }>({
    draggedId: null,
    dropTargetId: null,
  });
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const preorderById = useMemo(
    () => new Map(preorders.map((preorder) => [preorder.id, preorder])),
    [preorders],
  );
  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const handleSort = (field: SortField) => {
    setSortConfig((current) => {
      if (current.field === field) {
        return {
          field,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        field,
        direction: 'asc',
      };
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field === field) {
      return sortConfig.direction === 'asc'
        ? <ChevronUp className="ml-1 w-4 h-4" />
        : <ChevronDown className="ml-1 w-4 h-4" />;
    }
    return null;
  };

  const getDeliveryMonth = (preorder: Preorder): string => {
    const monthIndex = preorder.deliveryMonth;
    if (monthIndex === undefined) {
      return 'Brak';
    }
    return getSeasonLabel(monthIndex);
  };

  const availableDeliveryMonths = useMemo(() => {
    const monthIndexes = Array.from(
      new Set(preorders.map((preorder) => preorder.deliveryMonth).filter((month): month is number => month !== undefined))
    ).sort((a, b) => a - b);

    return monthIndexes.map((monthIndex) => ({
      value: String(monthIndex),
      label: getSeasonLabel(monthIndex),
    }));
  }, [preorders]);

  const filteredPreorders = preorders.filter(preorder => {
    const matchesSearch = 
      preorder.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preorder.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preorder.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || preorder.status === statusFilter;
    const matchesDeliveryMonth = deliveryMonthFilter === 'all' || String(preorder.deliveryMonth ?? '') === deliveryMonthFilter;
    
    return matchesSearch && matchesStatus && matchesDeliveryMonth;
  }).sort((a, b) => {
    const getSortValue = (preorder: Preorder, field: SortField) => {
      switch (field) {
        case 'allocationOrder':
          return preorder.allocationOrder ?? preorder.priority ?? 999;
        case 'orderNumber':
          return preorder.orderNumber;
        case 'customerName':
          return preorder.customerName;
        case 'companyName':
          return preorder.companyName;
        case 'customerPriority':
          return preorder.customerPriority ?? preorder.priority ?? 999;
        case 'priority':
          return preorder.priority;
        case 'items':
          return preorder.items.length;
        case 'totalQuantity':
          return preorder.items.reduce((sum, item) => sum + item.quantity, 0);
        case 'status':
          return preorder.status;
        case 'createdAt':
          return new Date(preorder.createdAt).getTime();
        case 'deliveryMonth':
          return preorder.deliveryMonth ?? 99;
        default:
          return '';
      }
    };

    const compareValues = (valA: any, valB: any) => {
      if (typeof valA === 'number' && typeof valB === 'number') {
        return valA - valB;
      }
      return String(valA).localeCompare(String(valB));
    };

    const sortValA = getSortValue(a, sortConfig.field);
    const sortValB = getSortValue(b, sortConfig.field);
    let comparison = compareValues(sortValA, sortValB);

    if (sortConfig.direction === 'desc') {
      comparison = -comparison;
    }

    if (comparison !== 0) {
      return comparison;
    }

    return (a.deliveryMonth ?? 99) - (b.deliveryMonth ?? 99)
      || (a.allocationOrder ?? 999) - (b.allocationOrder ?? 999)
      || a.orderNumber.localeCompare(b.orderNumber);
  });

  const monthPriorityById = useMemo(() => {
    const ordered = [...preorders].sort((a, b) =>
      (a.deliveryMonth ?? 99) - (b.deliveryMonth ?? 99)
      || (a.allocationOrder ?? 999) - (b.allocationOrder ?? 999)
      || a.orderNumber.localeCompare(b.orderNumber)
    );
    const counters = new Map<number, number>();
    const positions = new Map<string, number>();

    ordered.forEach((preorder) => {
      const monthIndex = preorder.deliveryMonth ?? 99;
      const nextPosition = (counters.get(monthIndex) ?? 0) + 1;
      counters.set(monthIndex, nextPosition);
      positions.set(preorder.id, nextPosition);
    });

    return positions;
  }, [preorders]);

  const monthCountByIndex = useMemo(() => {
    const counts = new Map<number, number>();

    preorders.forEach((preorder) => {
      const monthIndex = preorder.deliveryMonth ?? 99;
      counts.set(monthIndex, (counts.get(monthIndex) ?? 0) + 1);
    });

    return counts;
  }, [preorders]);

  const groupedPreorders = useMemo(() => {
    const groups = new Map<string, { monthLabel: string; monthIndex: number; items: Preorder[] }>();

    filteredPreorders.forEach((preorder) => {
      const monthIndex = preorder.deliveryMonth ?? 99;
      const key = String(monthIndex);
      const existing = groups.get(key);

      if (existing) {
        existing.items.push(preorder);
        return;
      }

      groups.set(key, {
        monthLabel: getDeliveryMonth(preorder),
        monthIndex,
        items: [preorder],
      });
    });

    return Array.from(groups.values()).sort((a, b) => a.monthIndex - b.monthIndex);
  }, [filteredPreorders]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Oczekuje', variant: 'secondary' as const },
      partially_allocated: { label: 'Częściowo alokowane', variant: 'default' as const },
      allocated: { label: 'Alokowane', variant: 'default' as const },
      partially_delivered: { label: 'Częściowo dostarczone', variant: 'default' as const },
      completed: { label: 'Zakończone', variant: 'default' as const },
      cancelled: { label: 'Anulowane', variant: 'destructive' as const },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDebtDecisionBadge = (preorder: Preorder) => {
    if (preorder.debtDecision === 'rejected') {
      return <Badge variant="destructive">Wstrzymane</Badge>;
    }
    if (preorder.debtDecision === 'pending_review') {
      return <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">Review</Badge>;
    }
    if (preorder.debtDecision === 'approved') {
      return <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">Dopuszczone</Badge>;
    }
    return null;
  };

  const getPriorityBadge = (priority: number) => {
    const colors = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-orange-100 text-orange-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-green-100 text-green-800',
      5: 'bg-blue-100 text-blue-800',
    };

    return (
      <Badge variant="outline" className={colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        P{priority}
      </Badge>
    );
  };

  const getProductDetails = (productId: string, variantId: string) => {
    const product = getProductById(productId);
    const variant = product?.variants.find(v => v.id === variantId);
    return { product, variant };
  };

  const renderDebtSummary = (preorder: Preorder) => {
    const customer = customerById.get(preorder.customerId);
    const isDelinquent = isCustomerDelinquent(customer);

    return (
      <div className={`mb-4 rounded-lg border px-4 py-3 ${isDelinquent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {isDelinquent ? <Badge variant="destructive">Zalega</Badge> : <Badge variant="outline">Brak zaległości</Badge>}
              {getDebtDecisionBadge(preorder)}
            </div>
            <div className="grid gap-1 text-sm text-gray-700">
              <div>Czy zalega: <span className="font-medium">{isDelinquent ? 'Tak' : 'Nie'}</span></div>
              <div>Ile zalega: <span className="font-medium">{isDelinquent ? `${(customer?.debtAmountPln ?? 0).toLocaleString('pl-PL')} PLN` : '0 PLN'}</span></div>
              <div>Jak długo: <span className="font-medium">{isDelinquent ? getDebtDurationLabel(customer?.debtSince) : '0 dni'}</span></div>
              <div>Pozwól na zamówienia: <span className="font-medium">{customer?.allowOrders === false ? 'Nie' : 'Tak'}</span></div>
            </div>
          </div>
          <div className="space-y-1 text-sm text-gray-700 lg:text-right">
            <div>Status review: <span className="font-medium">{getDebtDecisionLabel(preorder.debtDecision)}</span></div>
            {preorder.debtDecisionAt && (
              <div>Decyzja: <span className="font-medium">{new Date(preorder.debtDecisionAt).toLocaleDateString('pl-PL')}</span></div>
            )}
            {preorder.debtDecisionBy && (
              <div>Przez: <span className="font-medium">{preorder.debtDecisionBy}</span></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handlePreorderPositionChange = (preorderId: string, value: string) => {
    const position = Number.parseInt(value, 10);
    if (!Number.isFinite(position)) {
      return;
    }
    setPreorderAllocationPosition(preorderId, position);
  };

  const updateDraggedDropTarget = (targetPreorderId: string | null) => {
    const draggedId = dragStateRef.current.draggedId;
    if (!draggedId || !targetPreorderId || draggedId === targetPreorderId) {
      return;
    }

    const draggedPreorder = preorderById.get(draggedId);
    const targetPreorder = preorderById.get(targetPreorderId);
    if (!draggedPreorder || !targetPreorder) {
      return;
    }

    if ((draggedPreorder.deliveryMonth ?? 99) !== (targetPreorder.deliveryMonth ?? 99)) {
      return;
    }

    dragStateRef.current.dropTargetId = targetPreorderId;
    setDropTargetPreorderId(targetPreorderId);
  };

  const handleMouseDragStart = (event: React.MouseEvent<HTMLElement>, preorderId: string) => {
    event.preventDefault();
    event.stopPropagation();

    dragCleanupRef.current?.();
    dragStateRef.current.draggedId = preorderId;
    dragStateRef.current.dropTargetId = preorderId;
    setDraggedPreorderId(preorderId);
    setDropTargetPreorderId(preorderId);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const updateMouseTarget = (mouseEvent: MouseEvent) => {
      const target = document.elementFromPoint(mouseEvent.clientX, mouseEvent.clientY);
      const row = target?.closest('[data-preorder-row-id]') as HTMLElement | null;
      updateDraggedDropTarget(row?.dataset.preorderRowId ?? null);
    };

    const cleanupMouseDrag = () => {
      window.removeEventListener('mousemove', updateMouseTarget);
      window.removeEventListener('mouseup', finalizeMouseDrag);
      dragCleanupRef.current = null;
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
      dragStateRef.current.draggedId = null;
      dragStateRef.current.dropTargetId = null;
      setDraggedPreorderId(null);
      setDropTargetPreorderId(null);
    };

    const finalizeMouseDrag = () => {
      const targetPreorderId = dragStateRef.current.dropTargetId;
      if (targetPreorderId && targetPreorderId !== preorderId) {
        reorderPreorders(preorderId, targetPreorderId);
      }

      cleanupMouseDrag();
    };

    window.addEventListener('mousemove', updateMouseTarget);
    window.addEventListener('mouseup', finalizeMouseDrag);
    dragCleanupRef.current = cleanupMouseDrag;
  };

  const exportToCSV = () => {
    // Mock CSV export
    const csvContent = filteredPreorders.map(po => 
      `${po.orderNumber},${po.companyName},${po.status},${po.items.reduce((s, i) => s + i.quantity, 0)}`
    ).join('\n');
    
    const blob = new Blob([`Numer,Firma,Status,Ilość\n${csvContent}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'preordery.csv';
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Lista Preorderów</h1>
        <p className="text-gray-600 mt-1">Zarządzaj wszystkimi zamówieniami B2B</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search" className="mb-2 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Szukaj
              </Label>
              <Input
                id="search"
                placeholder="Numer zamówienia, firma, klient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status" className="mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="pending">Oczekujące</SelectItem>
                  <SelectItem value="partially_allocated">Częściowo alokowane</SelectItem>
                  <SelectItem value="allocated">Alokowane</SelectItem>
                  <SelectItem value="partially_delivered">Częściowo dostarczone</SelectItem>
                  <SelectItem value="completed">Zakończone</SelectItem>
                  <SelectItem value="cancelled">Anulowane</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="delivery-month" className="mb-2 flex items-center gap-2">
                Miesiąc dostawy
              </Label>
              <Select value={deliveryMonthFilter} onValueChange={setDeliveryMonthFilter}>
                <SelectTrigger id="delivery-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie miesiące</SelectItem>
                  {availableDeliveryMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
              <Switch
                id="group-by-month"
                checked={groupByMonth}
                onCheckedChange={setGroupByMonth}
              />
              <Label htmlFor="group-by-month" className="cursor-pointer">
                Zgrupuj
              </Label>
            </div>
            <Button variant="outline" onClick={exportToCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Eksportuj CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preorders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Preordery ({filteredPreorders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('deliveryMonth')}>
                  Miesiąc dostawy
                  {getSortIcon('deliveryMonth')}
                </TableHead>
                <TableHead />
                <TableHead className="cursor-pointer" onClick={() => handleSort('orderNumber')}>
                  Numer
                  {getSortIcon('orderNumber')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('companyName')}>
                  Firma
                  {getSortIcon('companyName')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('customerPriority')}>
                  Priorytet firmy
                  {getSortIcon('customerPriority')}
                </TableHead>
                <TableHead>Priorytet preorderu</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('items')}>
                  Pozycje
                  {getSortIcon('items')}
                </TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('totalQuantity')}>
                  Suma szt.
                  {getSortIcon('totalQuantity')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                  Status
                  {getSortIcon('status')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                  Data
                  {getSortIcon('createdAt')}
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(groupByMonth ? groupedPreorders.flatMap((group) => group.items) : filteredPreorders).length > 0 && groupByMonth && groupedPreorders.map((group) => {
                const groupTotalQuantity = group.items.reduce(
                  (sum, preorder) => sum + preorder.items.reduce((itemsSum, item) => itemsSum + item.quantity, 0),
                  0
                );

                return (
                  <React.Fragment key={`group-${group.monthIndex}`}>
                    <TableRow className="bg-slate-100/80 hover:bg-slate-100/80">
                      <TableCell colSpan={11} className="py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-white">
                              {group.monthLabel}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {group.items.length} {group.items.length === 1 ? 'preorder' : group.items.length < 5 ? 'preordery' : 'preorderów'}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {groupTotalQuantity} szt.
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {group.items.map((preorder) => {
                      const customer = customerById.get(preorder.customerId);
                      const isDelinquent = isCustomerDelinquent(customer);
                      const totalQuantity = preorder.items.reduce((sum, item) => sum + item.quantity, 0);
                      const totalAllocated = preorder.items.reduce((sum, item) => sum + item.quantityAllocated, 0);
                      const totalDelivered = preorder.items.reduce((sum, item) => sum + item.quantityDelivered, 0);
                      const isDragged = draggedPreorderId === preorder.id;
                      const isDropTarget = dropTargetPreorderId === preorder.id && draggedPreorderId !== preorder.id;
                      const monthPriority = monthPriorityById.get(preorder.id) ?? 1;
                      const monthOptionsCount = monthCountByIndex.get(preorder.deliveryMonth ?? 99) ?? 1;

                      return (
                        <React.Fragment key={preorder.id}>
                          <TableRow
                            data-preorder-row-id={preorder.id}
                            onMouseEnter={() => updateDraggedDropTarget(preorder.id)}
                            className={`hover:bg-gray-50 ${groupByMonth ? 'bg-slate-50/60' : ''} ${isDragged ? 'bg-blue-50' : ''} ${isDropTarget ? 'bg-amber-50 ring-1 ring-amber-200' : ''}`}
                          >
                            <TableCell className={groupByMonth ? 'pl-8' : undefined}>
                              <div className={groupByMonth ? 'border-l-2 border-slate-200 pl-4' : undefined}>
                                {getDeliveryMonth(preorder)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                data-drag-handle="true"
                                className="inline-flex text-gray-500 cursor-grab active:cursor-grabbing"
                                onMouseDown={(event) => handleMouseDragStart(event, preorder.id)}
                                onDragStart={(event) => event.preventDefault()}
                                title="Przeciągnij, aby zmienić kolejność"
                              >
                                <GripVertical className="w-4 h-4" />
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{preorder.orderNumber}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div>{preorder.companyName}</div>
                                {isDelinquent && <Badge variant="destructive">Zalega</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>{getPriorityBadge(preorder.customerPriority ?? preorder.priority)}</TableCell>
                            <TableCell>
                              <Select
                                value={String(monthPriority)}
                                onValueChange={(value) => handlePreorderPositionChange(preorder.id, value)}
                                onOpenChange={(open) => {
                                  if (open) {
                                    dragCleanupRef.current?.();
                                  }
                                }}
                              >
                                <SelectTrigger className="w-20 h-7" onMouseDown={(event) => event.stopPropagation()}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: monthOptionsCount }, (_, index) => String(index + 1)).map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">{preorder.items.length}</TableCell>
                            <TableCell className="text-right">
                              <div className="text-sm">
                                <div className="font-medium">{totalQuantity}</div>
                                {totalAllocated > 0 && (
                                  <div className="text-xs text-blue-600">alok: {totalAllocated}</div>
                                )}
                                {totalDelivered > 0 && (
                                  <div className="text-xs text-green-600">dost: {totalDelivered}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {getStatusBadge(preorder.status)}
                                {getDebtDecisionBadge(preorder)}
                              </div>
                            </TableCell>
                            <TableCell>{new Date(preorder.createdAt).toLocaleDateString('pl-PL')}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedPreorder(
                                  expandedPreorder === preorder.id ? null : preorder.id
                                )}
                              >
                                {expandedPreorder === preorder.id ? 'Zwiń' : 'Rozwiń'}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedPreorder === preorder.id && (
                            <TableRow>
                              <TableCell colSpan={11} className="bg-gray-50">
                                <div className="p-4">
                                  {renderDebtSummary(preorder)}
                                  <h4 className="font-semibold mb-3">Pozycje zamówienia:</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Produkt</TableHead>
                                        <TableHead>Wariant</TableHead>
                                        <TableHead className="text-right">Zamówione</TableHead>
                                        <TableHead className="text-right">Alokowane</TableHead>
                                        <TableHead className="text-right">Dostarczone</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {preorder.items.map(item => {
                                        const { product, variant } = getProductDetails(item.productId, item.variantId);
                                        if (!product || !variant) return null;

                                        return (
                                          <TableRow key={item.id}>
                                            <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                                            <TableCell>{product.name}</TableCell>
                                            <TableCell>
                                              <div className="text-sm">
                                                {variant.color} / Rozm. {variant.size}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                                            <TableCell className="text-right text-blue-600">
                                              {item.quantityAllocated || '-'}
                                            </TableCell>
                                            <TableCell className="text-right text-green-600">
                                              {item.quantityDelivered || '-'}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {!groupByMonth && filteredPreorders.map((preorder) => {
                const customer = customerById.get(preorder.customerId);
                const isDelinquent = isCustomerDelinquent(customer);
                const totalQuantity = preorder.items.reduce((sum, item) => sum + item.quantity, 0);
                const totalAllocated = preorder.items.reduce((sum, item) => sum + item.quantityAllocated, 0);
                const totalDelivered = preorder.items.reduce((sum, item) => sum + item.quantityDelivered, 0);
                const isDragged = draggedPreorderId === preorder.id;
                const isDropTarget = dropTargetPreorderId === preorder.id && draggedPreorderId !== preorder.id;
                const monthPriority = monthPriorityById.get(preorder.id) ?? 1;
                const monthOptionsCount = monthCountByIndex.get(preorder.deliveryMonth ?? 99) ?? 1;

                return (
                  <React.Fragment key={preorder.id}>
                    <TableRow
                      data-preorder-row-id={preorder.id}
                      onMouseEnter={() => updateDraggedDropTarget(preorder.id)}
                      className={`hover:bg-gray-50 ${isDragged ? 'bg-blue-50' : ''} ${isDropTarget ? 'bg-amber-50 ring-1 ring-amber-200' : ''}`}
                    >
                      <TableCell>{getDeliveryMonth(preorder)}</TableCell>
                      <TableCell>
                        <span
                          data-drag-handle="true"
                          className="inline-flex text-gray-500 cursor-grab active:cursor-grabbing"
                          onMouseDown={(event) => handleMouseDragStart(event, preorder.id)}
                          onDragStart={(event) => event.preventDefault()}
                          title="Przeciągnij, aby zmienić kolejność"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{preorder.orderNumber}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{preorder.companyName}</div>
                          {isDelinquent && <Badge variant="destructive">Zalega</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(preorder.customerPriority ?? preorder.priority)}</TableCell>
                      <TableCell>
                        <Select
                          value={String(monthPriority)}
                          onValueChange={(value) => handlePreorderPositionChange(preorder.id, value)}
                          onOpenChange={(open) => {
                            if (open) {
                              dragCleanupRef.current?.();
                            }
                          }}
                        >
                          <SelectTrigger className="w-20 h-7" onMouseDown={(event) => event.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: monthOptionsCount }, (_, index) => String(index + 1)).map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">{preorder.items.length}</TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          <div className="font-medium">{totalQuantity}</div>
                          {totalAllocated > 0 && (
                            <div className="text-xs text-blue-600">alok: {totalAllocated}</div>
                          )}
                          {totalDelivered > 0 && (
                            <div className="text-xs text-green-600">dost: {totalDelivered}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {getStatusBadge(preorder.status)}
                          {getDebtDecisionBadge(preorder)}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(preorder.createdAt).toLocaleDateString('pl-PL')}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedPreorder(
                            expandedPreorder === preorder.id ? null : preorder.id
                          )}
                        >
                          {expandedPreorder === preorder.id ? 'Zwiń' : 'Rozwiń'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedPreorder === preorder.id && (
                      <TableRow>
                        <TableCell colSpan={11} className="bg-gray-50">
                          <div className="p-4">
                            {renderDebtSummary(preorder)}
                            <h4 className="font-semibold mb-3">Pozycje zamówienia:</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Produkt</TableHead>
                                  <TableHead>Wariant</TableHead>
                                  <TableHead className="text-right">Zamówione</TableHead>
                                  <TableHead className="text-right">Alokowane</TableHead>
                                  <TableHead className="text-right">Dostarczone</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {preorder.items.map(item => {
                                  const { product, variant } = getProductDetails(item.productId, item.variantId);
                                  if (!product || !variant) return null;

                                  return (
                                    <TableRow key={item.id}>
                                      <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                                      <TableCell>{product.name}</TableCell>
                                      <TableCell>
                                        <div className="text-sm">
                                          {variant.color} / Rozm. {variant.size}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                                      <TableCell className="text-right text-blue-600">
                                        {item.quantityAllocated || '-'}
                                      </TableCell>
                                      <TableCell className="text-right text-green-600">
                                        {item.quantityDelivered || '-'}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>

          {filteredPreorders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nie znaleziono preorderów spełniających kryteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
