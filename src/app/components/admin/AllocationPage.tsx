import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { mockProducts } from '../../lib/mock-data';
import { applyDeliveryAllocation, useDeliveries, usePreorders } from '../../lib/demo-store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { 
  ArrowLeft, 
  ArrowUp, 
  ArrowDown, 
  Package, 
  AlertTriangle,
  CheckCircle,
  Save,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

interface AllocationEntry {
  preorderId: string;
  preorderNumber: string;
  customerId: string;
  customerName: string;
  companyName: string;
  priority: number;
  variantId: string;
  quantityOrdered: number;
  quantityAllocated: number;
  allocationPercentage: number;
}

type AwizmentMatch = {
  orderId: string;
  orderNumber: string;
  requested: number;
};

type AllocationState = {
  awizementAllocationPlan?: Record<string, AwizmentMatch[]>;
};

export function AllocationPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const allocationState = (location.state as AllocationState | undefined) || {};
  const hasAwizment = !!(allocationState.awizementAllocationPlan && Object.keys(allocationState.awizementAllocationPlan).length > 0);
  const [autoAllocate] = useState(!hasAwizment);
  const deliveries = useDeliveries();
  const preorders = usePreorders();

  const delivery = deliveries.find(d => d.id === deliveryId);

  // Initialize allocations
  const [allocations, setAllocations] = useState<Map<string, AllocationEntry[]>>(() => {
    if (!delivery) return new Map();

    const allocationMap = new Map<string, AllocationEntry[]>();

    delivery.items.forEach(deliveryItem => {
      // Find all preorders that ordered this variant
      const relevantPreorders: AllocationEntry[] = [];

      preorders
        .filter(po => po.status === 'pending' || po.status === 'partially_allocated')
        .forEach(preorder => {
          const item = preorder.items.find(i => i.variantId === deliveryItem.variantId);
          if (item) {
            const remaining = item.quantity - item.quantityAllocated;
            if (remaining > 0) {
              relevantPreorders.push({
                preorderId: preorder.id,
                preorderNumber: preorder.orderNumber,
                customerId: preorder.customerId,
                customerName: preorder.customerName,
                companyName: preorder.companyName,
                priority: preorder.priority,
                variantId: item.variantId,
                quantityOrdered: remaining,
                quantityAllocated: 0,
                allocationPercentage: 0,
              });
            }
          }
        });

      // Sort by priority (lower number = higher priority)
      relevantPreorders.sort((a, b) => a.priority - b.priority);

      const awizmentAllocations = allocationState.awizementAllocationPlan?.[deliveryItem.variantId] || [];
      let remainingQty = deliveryItem.quantityAnnounced;
      const requestedByOrder = new Map<string, number>(awizmentAllocations.map(a => [a.orderId, a.requested]));

      if (awizmentAllocations.length > 0) {
        const prefilled = relevantPreorders.map(entry => {
          const requested = requestedByOrder.get(entry.preorderId);
          if (!requested) return entry;

          const toAllocate = Math.min(remainingQty, requested, entry.quantityOrdered);
          entry.quantityAllocated = toAllocate;
          entry.allocationPercentage = entry.quantityOrdered > 0 ? (toAllocate / entry.quantityOrdered) * 100 : 0;
          remainingQty -= toAllocate;
          return entry;
        });

        relevantPreorders.length = 0;
        relevantPreorders.push(...prefilled);
      }

      if (autoAllocate) {
        let remainingForAuto = remainingQty;
        relevantPreorders.forEach(entry => {
          const toAllocate = Math.min(entry.quantityOrdered - entry.quantityAllocated, remainingForAuto);
          if (toAllocate > 0) {
            entry.quantityAllocated += toAllocate;
            entry.allocationPercentage = entry.quantityOrdered > 0 ? (entry.quantityAllocated / entry.quantityOrdered) * 100 : 0;
            remainingForAuto -= toAllocate;
          }
        });
      }

      allocationMap.set(deliveryItem.variantId, relevantPreorders);
    });

    return allocationMap;
  });

  const updateAllocation = (variantId: string, preorderId: string, newQty: number) => {
    setAllocations(prev => {
      const newMap = new Map(prev);
      const entries = newMap.get(variantId);
      if (!entries) return prev;

      const deliveryItem = delivery?.items.find(i => i.variantId === variantId);
      if (!deliveryItem) return prev;

      // Update the specific allocation
      const updatedEntries = entries.map(entry => {
        if (entry.preorderId === preorderId) {
          const clamped = Math.max(0, Math.min(newQty, entry.quantityOrdered));
          return {
            ...entry,
            quantityAllocated: clamped,
            allocationPercentage: (clamped / entry.quantityOrdered) * 100,
          };
        }
        return entry;
      });

      // Check if total doesn't exceed available
      const totalAllocated = updatedEntries.reduce((sum, e) => sum + e.quantityAllocated, 0);
      if (totalAllocated > deliveryItem.quantityAnnounced) {
        toast.error('Przekroczono dostępną ilość');
        return prev;
      }

      newMap.set(variantId, updatedEntries);
      return newMap;
    });
  };

  const movePriority = (variantId: string, preorderId: string, direction: 'up' | 'down') => {
    setAllocations(prev => {
      const newMap = new Map(prev);
      const entries = newMap.get(variantId);
      if (!entries) return prev;

      const index = entries.findIndex(e => e.preorderId === preorderId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= entries.length) return prev;

      const newEntries = [...entries];
      [newEntries[index], newEntries[newIndex]] = [newEntries[newIndex], newEntries[index]];
      
      newMap.set(variantId, newEntries);
      return newMap;
    });
  };

  const handleSaveAllocation = () => {
    if (!delivery) return;

    const payload = Array.from(allocations.values()).flatMap((entries) =>
      entries.map(entry => ({
        preorderId: entry.preorderId,
        variantId: entry.variantId,
        quantityAllocated: entry.quantityAllocated,
      }))
    );

    applyDeliveryAllocation(delivery.id, payload);
    toast.success('Alokacja zapisana', {
      description: 'Zmiany zostały zapisane jako wersja robocza',
    });
  };

  const handleFinalizeAllocation = () => {
    if (!delivery) return;

    const payload = Array.from(allocations.values()).flatMap((entries) =>
      entries.map(entry => ({
        preorderId: entry.preorderId,
        variantId: entry.variantId,
        quantityAllocated: entry.quantityAllocated,
      }))
    );

    applyDeliveryAllocation(delivery.id, payload);
    toast.success('Alokacja zatwierdzona!', {
      description: 'Zamówienia zostały przekazane do Shopera i Firmao',
    });
    setTimeout(() => navigate('/admin/deliveries'), 1500);
  };

  const getProductDetails = (variantId: string) => {
    for (const product of mockProducts) {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) return { product, variant };
    }
    return { product: null, variant: null };
  };

  if (!delivery) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">Nie znaleziono dostawy</p>
            <Button className="mt-4" onClick={() => navigate('/admin/deliveries')}>
              Powrót do dostaw
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin/deliveries')} className="gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Powrót do dostaw
        </Button>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Alokacja Dostawy</h1>
            <p className="text-gray-600 mt-1">{delivery.deliveryNumber} - {delivery.supplier}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveAllocation} className="gap-2">
              <Save className="w-4 h-4" />
              Zapisz roboczą
            </Button>
            <Button onClick={handleFinalizeAllocation} className="gap-2">
              <Send className="w-4 h-4" />
              Zatwierdź i przekaż
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Pozycje</p>
            <p className="text-2xl font-bold">{delivery.items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Dostarczone szt.</p>
            <p className="text-2xl font-bold">
              {delivery.items.reduce((sum, item) => sum + item.quantityAnnounced, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Alokowane szt.</p>
            <p className="text-2xl font-bold text-blue-600">
              {Array.from(allocations.values()).reduce(
                (sum, entries) => sum + entries.reduce((s, e) => s + e.quantityAllocated, 0),
                0
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Pokrycie</p>
            <p className="text-2xl font-bold text-green-600">
              {(() => {
                const total = delivery.items.reduce((sum, item) => sum + item.quantityAnnounced, 0);
                const allocated = Array.from(allocations.values()).reduce(
                  (sum, entries) => sum + entries.reduce((s, e) => s + e.quantityAllocated, 0),
                  0
                );
                return total > 0 ? Math.round((allocated / total) * 100) : 0;
              })()}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Allocation Tables */}
      <div className="space-y-6">
        {delivery.items.map(deliveryItem => {
          const { product, variant } = getProductDetails(deliveryItem.variantId);
          if (!product || !variant) return null;

          const entries = allocations.get(deliveryItem.variantId) || [];
          const totalAllocated = entries.reduce((sum, e) => sum + e.quantityAllocated, 0);
          const remaining = deliveryItem.quantityAnnounced - totalAllocated;

          return (
            <Card key={deliveryItem.variantId}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg mb-1">{product.name}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {variant.color} - Rozmiar {variant.size} ({variant.sku})
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Dostarczone</p>
                      <p className="font-semibold text-lg">{deliveryItem.quantityAnnounced}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Alokowane</p>
                      <p className="font-semibold text-lg text-blue-600">{totalAllocated}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Pozostaje</p>
                      <p className={`font-semibold text-lg ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {remaining}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>Brak preorderów dla tego wariantu</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Priorytet</TableHead>
                        <TableHead>Preorder</TableHead>
                        <TableHead>Klient</TableHead>
                        <TableHead className="text-right">Zamówione</TableHead>
                        <TableHead className="text-right">Alokacja</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry, index) => (
                        <TableRow key={entry.preorderId}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => movePriority(deliveryItem.variantId, entry.preorderId, 'up')}
                                disabled={index === 0}
                              >
                                <ArrowUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => movePriority(deliveryItem.variantId, entry.preorderId, 'down')}
                                disabled={index === entries.length - 1}
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50">
                              P{entry.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{entry.preorderNumber}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{entry.customerName}</div>
                              <div className="text-gray-500">{entry.companyName}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.quantityOrdered}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              max={entry.quantityOrdered}
                              value={entry.quantityAllocated}
                              onChange={(e) =>
                                updateAllocation(
                                  deliveryItem.variantId,
                                  entry.preorderId,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-20 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2">
                              <div className="w-12 text-sm font-medium">
                                {entry.allocationPercentage.toFixed(0)}%
                              </div>
                              {entry.allocationPercentage === 100 ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : entry.allocationPercentage > 0 ? (
                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateAllocation(
                                  deliveryItem.variantId,
                                  entry.preorderId,
                                  entry.quantityOrdered
                                )
                              }
                            >
                              100%
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
