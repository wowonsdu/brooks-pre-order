import { useState } from 'react';
import { Preorder } from '../../lib/mock-data';
import { getProductById, getSeasonLabel, reorderPreorders, setPreorderPriority, usePreorders } from '../../lib/demo-store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, Filter, Download, ChevronUp, ChevronDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import React from 'react';

type SortField = 'allocationOrder' | 'orderNumber' | 'customerName' | 'companyName' | 'priority' | 'items' | 'totalQuantity' | 'status' | 'createdAt' | 'deliveryMonth';
type SortDirection = 'asc' | 'desc';

export function PreordersListPage() {
  const preorders = usePreorders();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedPreorder, setExpandedPreorder] = useState<string | null>(null);
  const [primarySort, setPrimarySort] = useState<{ field: SortField; direction: SortDirection } | null>({ field: 'allocationOrder', direction: 'asc' });
  const [secondarySort, setSecondarySort] = useState<{ field: SortField; direction: SortDirection } | null>(null);
  const [draggedPreorderId, setDraggedPreorderId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    // If clicking on primary sort field - toggle direction
    if (primarySort?.field === field) {
      if (primarySort.direction === 'asc') {
        setPrimarySort({ field, direction: 'desc' });
      } else {
        // Toggle back to asc
        setPrimarySort({ field, direction: 'asc' });
      }
    }
    // If clicking on secondary sort field - toggle direction
    else if (secondarySort?.field === field) {
      if (secondarySort.direction === 'asc') {
        setSecondarySort({ field, direction: 'desc' });
      } else {
        // Toggle back to asc
        setSecondarySort({ field, direction: 'asc' });
      }
    }
    // Clicking on a new field
    else {
      // Current secondary becomes primary, new field becomes secondary
      if (secondarySort) {
        setPrimarySort(secondarySort);
      }
      setSecondarySort({ field, direction: 'asc' });
    }
  };

  const getSortIcon = (field: SortField) => {
    if (primarySort?.field === field) {
      return (
        <span className="inline-flex items-center ml-1">
          {primarySort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="text-xs ml-0.5">1</span>
        </span>
      );
    }
    if (secondarySort?.field === field) {
      return (
        <span className="inline-flex items-center ml-1">
          {secondarySort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="text-xs ml-0.5">2</span>
        </span>
      );
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

  const filteredPreorders = preorders.filter(preorder => {
    const matchesSearch = 
      preorder.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preorder.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preorder.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || preorder.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (!primarySort) return 0;

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
          return getDeliveryMonth(preorder);
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

    // Primary sort
    const primaryValA = getSortValue(a, primarySort.field);
    const primaryValB = getSortValue(b, primarySort.field);
    let comparison = compareValues(primaryValA, primaryValB);
    
    if (primarySort.direction === 'desc') {
      comparison = -comparison;
    }

    // If primary values are equal, use secondary sort
    if (comparison === 0 && secondarySort) {
      const secondaryValA = getSortValue(a, secondarySort.field);
      const secondaryValB = getSortValue(b, secondarySort.field);
      comparison = compareValues(secondaryValA, secondaryValB);
      
      if (secondarySort.direction === 'desc') {
        comparison = -comparison;
      }
    }

    return comparison;
  });

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

  const moveOrderUp = (preorderId: string, index: number, list: Preorder[]) => {
    if (index <= 0) return;
    const targetPreorder = list[index - 1];
    if (!targetPreorder) return;
    reorderPreorders(preorderId, targetPreorder.id);
  };

  const moveOrderDown = (preorderId: string, index: number, list: Preorder[]) => {
    if (index >= list.length - 1) return;
    const targetPreorder = list[index + 1];
    if (!targetPreorder) return;
    reorderPreorders(preorderId, targetPreorder.id);
  };

  const handlePreorderPriorityChange = (preorderId: string, value: string) => {
    const priority = Number.parseInt(value, 10);
    if (!Number.isFinite(priority)) {
      return;
    }
    setPreorderPriority(preorderId, priority);
  };

  const handleDragStart = (event: React.DragEvent, preorderId: string) => {
    const target = event.target as HTMLElement | null;
    const isDragHandle = target?.closest('[data-drag-handle="true"]') !== null;
    if (!isDragHandle) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData('text/plain', preorderId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedPreorderId(preorderId);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: React.DragEvent, targetPreorderId: string) => {
    event.preventDefault();
    const sourcePreorderId = event.dataTransfer.getData('text/plain') || draggedPreorderId;
    if (!sourcePreorderId || sourcePreorderId === targetPreorderId) {
      setDraggedPreorderId(null);
      return;
    }

    reorderPreorders(sourcePreorderId, targetPreorderId);
    setDraggedPreorderId(null);
  };

  const handleDragEnd = () => {
    setDraggedPreorderId(null);
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
          <div className="mt-4 flex justify-end">
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
                <TableHead />
                <TableHead className="cursor-pointer" onClick={() => handleSort('orderNumber')}>
                  Numer
                  {getSortIcon('orderNumber')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('allocationOrder')}>
                  Kolejność
                  {getSortIcon('allocationOrder')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('customerName')}>
                  Klient
                  {getSortIcon('customerName')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('companyName')}>
                  Firma
                  {getSortIcon('companyName')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('priority')}>
                  Priorytet
                  {getSortIcon('priority')}
                </TableHead>
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
                <TableHead className="cursor-pointer" onClick={() => handleSort('deliveryMonth')}>
                  Miesiąc dostawy
                  {getSortIcon('deliveryMonth')}
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPreorders.map((preorder, index) => {
                const totalQuantity = preorder.items.reduce((sum, item) => sum + item.quantity, 0);
                const totalAllocated = preorder.items.reduce((sum, item) => sum + item.quantityAllocated, 0);
                const totalDelivered = preorder.items.reduce((sum, item) => sum + item.quantityDelivered, 0);
                const isDragged = draggedPreorderId === preorder.id;

                return (
                  <React.Fragment key={preorder.id}>
                    <TableRow
                      className={`hover:bg-gray-50 ${isDragged ? 'bg-blue-50' : ''}`}
                      draggable
                      onDragStart={(event) => handleDragStart(event, preorder.id)}
                      onDragOver={handleDragOver}
                      onDrop={(event) => handleDrop(event, preorder.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <TableCell>
                        <span
                          data-drag-handle="true"
                          className="inline-flex text-gray-500 cursor-grab"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{preorder.orderNumber}</TableCell>
                      <TableCell className="text-xs text-gray-600">{preorder.allocationOrder ?? '-'}</TableCell>
                      <TableCell>{preorder.customerName}</TableCell>
                      <TableCell>{preorder.companyName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(preorder.priority)}
                          <Select
                            value={String(preorder.priority)}
                                onValueChange={(value) => handlePreorderPriorityChange(preorder.id, value)}
                                onPointerDown={(event) => event.stopPropagation()}
                              >
                                <SelectTrigger className="w-20 h-7">
                                  <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
                      <TableCell>{getStatusBadge(preorder.status)}</TableCell>
                      <TableCell>{new Date(preorder.createdAt).toLocaleDateString('pl-PL')}</TableCell>
                      <TableCell>{getDeliveryMonth(preorder)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => moveOrderUp(preorder.id, index, filteredPreorders)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => moveOrderDown(preorder.id, index, filteredPreorders)}
                            disabled={index === filteredPreorders.length - 1}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
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
                        <TableCell colSpan={12} className="bg-gray-50">
                          <div className="p-4">
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
