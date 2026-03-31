import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { mockProducts, Delivery, DeliveryAwizmentMatch } from '../../lib/mock-data';
import { createDelivery, setDeliveryAwizementData, setDeliveryStatus, useDeliveries, usePreorders } from '../../lib/demo-store';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Truck, Plus, AlertCircle, Package, CheckCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

type ParsedCsvLine = {
  orderNumber: string;
  sku?: string;
  ean?: string;
  requested: number;
  lineRef: string;
  rawIndex: number;
  orderLineDeliveryMethod?: string;
  customersOrderNo?: string;
  deliveryNumber?: string;
};

type OrderCoverage = {
  orderId: string;
  orderNumber: string;
  companyName: string;
  requested: number;
  totalOrderQuantity: number;
  allocationRate: number;
};

const CSV_HEADER_ALIASES: Record<string, string> = {
  order_number: 'orderNumber',
  orderno: 'orderNumber',
  order: 'orderNumber',
  ordernumber: 'orderNumber',
  customernumber: 'orderNumber',
  customers_orderno: 'orderNumber',
  ean: 'ean',
  ean_number: 'ean',
  item_number: 'sku',
  sku: 'sku',
  ean_number_base: 'sku',
  itemnumber: 'sku',
  itemnumberbase: 'sku',
  qty: 'requested',
  quantity: 'requested',
  ordered_quantity: 'requested',
  requested_quantity: 'requested',
  requestedqty: 'requested',
  order_line_delivery_method: 'orderLineDeliveryMethod',
  customers_order_no: 'customersOrderNo',
  delivery_no: 'deliveryNumber',
  deliverynumber: 'deliveryNumber',
};

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const parseCsv = (text: string): string[][] => {
  const lines: string[][] = [];
  let row: string[] = [];
  let field = '';
  let insideQuotes = false;

  for (let i = 0; i <= text.length; i++) {
    const char = text[i] ?? '\n';

    if (char === '"') {
      const nextChar = text[i + 1];
      if (insideQuotes && nextChar === '"') {
        field += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if ((char === ',' && !insideQuotes) || char === '\n' || char === undefined) {
      row.push(field);
      field = '';

      if (char === '\n') {
        if (row.some(value => value.trim() !== '')) {
          lines.push(row);
        }
        row = [];
      }
      continue;
    }

    if (char === '\r') {
      continue;
    }

    field += char;
  }

  if (row.length > 1) {
    lines.push(row);
  }

  return lines;
};

const findField = (row: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') {
      return row[key];
    }
  }
  return '';
};

export function DeliveriesPage() {
  const navigate = useNavigate();
  const deliveries = useDeliveries();
  const preorders = usePreorders();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingUpload, setIsLoadingUpload] = useState<string | null>(null);

  // New delivery form state
  const [newDelivery, setNewDelivery] = useState({
    supplier: 'Brooks Europe',
    brand: 'Brooks',
    deliveryNumber: '',
    invoiceNumber: '',
    expectedDate: '',
  });

  const variantBySku = useMemo(() => {
    const map = new Map<string, { variantId: string; productId: string }>();

    mockProducts.forEach(product => {
      product.variants.forEach(variant => {
        map.set(variant.sku, { variantId: variant.id, productId: product.id });
      });
    });

    return map;
  }, []);

  const handleCreateDelivery = () => {
    if (!newDelivery.deliveryNumber || !newDelivery.invoiceNumber) {
      toast.error('Wypełnij wymagane pola');
      return;
    }

    const delivery: Delivery = {
      id: `del-${Date.now()}`,
      deliveryNumber: newDelivery.deliveryNumber,
      supplier: newDelivery.supplier,
      brand: newDelivery.brand,
      status: 'announced',
      invoiceNumber: newDelivery.invoiceNumber,
      expectedDate: newDelivery.expectedDate,
      createdAt: new Date().toISOString(),
      items: [],
      awizementAllocationPlan: {},
      matchedOrderSummary: [],
    };

    createDelivery(delivery);
    setIsDialogOpen(false);
    setNewDelivery({
      supplier: 'Brooks Europe',
      brand: 'Brooks',
      deliveryNumber: '',
      invoiceNumber: '',
      expectedDate: '',
    });

    toast.success('Awizacja dodana pomyślnie', {
      description: 'Możesz teraz załadować plik awizacyjny i przejść do alokacji',
    });
  };

  const normalizeParsedRows = (rows: string[][]): ParsedCsvLine[] => {
    const [header, ...data] = rows;
    const normalizedHeaders = header.map((column: string) => {
      const normalized = normalizeHeader(column);
      return CSV_HEADER_ALIASES[normalized] || normalized;
    });

    return data
      .map((row, index) => {
        const map = row.reduce<Record<string, string>>((acc, value, idx) => {
          acc[normalizedHeaders[idx]] = value?.trim?.() || '';
          return acc;
        }, {});

        const orderNumber = findField(map, [
          'orderNumber',
          'orderno',
          'order',
        ]);

        if (!orderNumber) {
          return null;
        }

        const requestedRaw = findField(map, ['requested', 'quantity', 'orderedQuantity']);
        const requested = Number.parseInt(requestedRaw, 10);

        return {
          orderNumber,
          sku: findField(map, ['sku', 'ean']),
          ean: findField(map, ['ean', 'sku']),
          requested: Number.isFinite(requested) && requested > 0 ? requested : 0,
          lineRef: `Wiersz ${index + 2}`,
          rawIndex: index + 2,
          orderLineDeliveryMethod: findField(map, ['orderLineDeliveryMethod']),
          customersOrderNo: findField(map, ['customersOrderNo']),
          deliveryNumber: findField(map, ['deliveryNumber']),
        } as ParsedCsvLine;
      })
      .filter(Boolean)
      .filter((line): line is ParsedCsvLine => !!line);
  };

  const getDeliverySummary = (delivery: Delivery) => {
    const matchedOrders = delivery.matchedOrderSummary ?? [];
    const totalAwizmentQty = matchedOrders.reduce((sum, order) => sum + order.requested, 0);
    const totalOrderedQty = matchedOrders.reduce((sum, order) => sum + order.totalOrderQuantity, 0);
    const totalCoverage = totalOrderedQty > 0 ? Math.round((totalAwizmentQty / totalOrderedQty) * 100) : 0;

    return { totalAwizmentQty, totalCoverage, matchedOrdersCount: matchedOrders.length };
  };

  const applyAwizement = async (deliveryId: string, file: File) => {
    setIsLoadingUpload(deliveryId);

    try {
      const raw = await file.text();
      const csvRows = parseCsv(raw);

      if (csvRows.length < 2) {
        toast.error('Niepoprawny plik CSV', { description: 'Brak danych do odczytu.' });
        return;
      }

      const parsed = normalizeParsedRows(csvRows);
      if (parsed.length === 0) {
        toast.error('Brak rekordów', { description: 'Sprawdź strukturę nagłówków pliku.' });
        return;
      }

      const current = deliveries.find(d => d.id === deliveryId);
      if (!current) {
        toast.error('Nie znaleziono dostawy');
        return;
      }

      const linesForDelivery = parsed.filter(line =>
        !line.deliveryNumber || line.deliveryNumber === current.deliveryNumber || String(line.orderLineDeliveryMethod) === current.deliveryNumber
      );

      const allocationPlan: Record<string, DeliveryAwizmentMatch[]> = {};
      const orderSummaries = new Map<string, OrderCoverage>();
      const seenOrders = new Set<string>();
      let matchedRows = 0;
      let unmatchedRows = 0;

      linesForDelivery.forEach(line => {
        const preorder = preorders.find(po => po.orderNumber === line.orderNumber);
        if (!preorder) {
          unmatchedRows += 1;
          return;
        }

        const variantCode = line.sku || line.ean || '';
        const matchedVariant = variantCode ? variantBySku.get(variantCode) : undefined;

        if (!matchedVariant) {
          unmatchedRows += 1;
          return;
        }

        const deliveryItem = current.items.find(item => item.variantId === matchedVariant.variantId);
        if (!deliveryItem) {
          unmatchedRows += 1;
          return;
        }

        const matchedQty = Math.max(0, line.requested);
        if (matchedQty <= 0) {
          unmatchedRows += 1;
          return;
        }

        matchedRows += 1;

        allocationPlan[matchedVariant.variantId] = [
          ...(allocationPlan[matchedVariant.variantId] || []),
          {
            orderId: preorder.id,
            orderNumber: preorder.orderNumber,
            requested: matchedQty,
          },
        ];

        const existing = orderSummaries.get(preorder.id);
        const totalOrderQuantity = preorder.items.reduce((sum, item) => sum + item.quantity, 0);
        orderSummaries.set(preorder.id, {
          orderId: preorder.id,
          orderNumber: preorder.orderNumber,
          companyName: preorder.companyName,
          requested: (existing?.requested || 0) + matchedQty,
          totalOrderQuantity,
          allocationRate: totalOrderQuantity > 0 ? (((existing?.requested || 0) + matchedQty) / totalOrderQuantity) * 100 : 0,
        });

        seenOrders.add(preorder.id);
      });

      setDeliveryAwizementData(current.id, {
        awizementAllocationPlan: allocationPlan,
        matchedOrderSummary: Array.from(orderSummaries.values()).map(summary => ({
          ...summary,
          allocationRate: Math.round(summary.allocationRate),
        })),
      });
      if (seenOrders.size > 0 && current.status === 'announced') {
        setDeliveryStatus(current.id, 'in_allocation');
      }

      toast.success(`Awizacja dopasowana: ${matchedRows}`, {
        description: `${unmatchedRows} wierszy nie dopasowano (brak wariantu lub zamówienia)`,
      });
    } catch {
      toast.error('Błąd podczas wczytywania pliku awizacji');
    } finally {
      setIsLoadingUpload(null);
    }
  };

  const navigateWithPlan = (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) {
      return;
    }

    navigate(`/admin/allocation/${delivery.id}`, {
      state: {
        awizementAllocationPlan: delivery.awizementAllocationPlan,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      announced: { label: 'Awizowana', variant: 'secondary' as const, icon: AlertCircle },
      in_allocation: { label: 'W alokacji', variant: 'default' as const, icon: Package },
      allocated: { label: 'Alokowana', variant: 'default' as const, icon: CheckCircle },
      received: { label: 'Przyjęta', variant: 'default' as const, icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.announced;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Zarządzanie Dostawami</h1>
            <p className="text-gray-600 mt-1">Awizacje, dopasowanie i alokacja do zamówień</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Dodaj Awizację
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nowa Awizacja Dostawy</DialogTitle>
                <DialogDescription>Wprowadź dane nowej dostawy od dostawcy.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="supplier">Dostawca</Label>
                  <Select
                    value={newDelivery.supplier}
                    onValueChange={value => setNewDelivery({ ...newDelivery, supplier: value })}
                  >
                    <SelectTrigger id="supplier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Brooks Europe">Brooks Europe</SelectItem>
                      <SelectItem value="Nike EU">Nike EU</SelectItem>
                      <SelectItem value="Adidas Polska">Adidas Polska</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="brand">Marka</Label>
                  <Input
                    id="brand"
                    value={newDelivery.brand}
                    onChange={event => setNewDelivery({ ...newDelivery, brand: event.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="deliveryNumber">Numer Dostawy *</Label>
                  <Input
                    id="deliveryNumber"
                    placeholder="DEL-2026-XXX"
                    value={newDelivery.deliveryNumber}
                    onChange={event => setNewDelivery({ ...newDelivery, deliveryNumber: event.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="invoiceNumber">Numer Faktury *</Label>
                  <Input
                    id="invoiceNumber"
                    placeholder="INV-XXX"
                    value={newDelivery.invoiceNumber}
                    onChange={event => setNewDelivery({ ...newDelivery, invoiceNumber: event.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="expectedDate">Oczekiwana Data Dostawy</Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    value={newDelivery.expectedDate}
                    onChange={event => setNewDelivery({ ...newDelivery, expectedDate: event.target.value })}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button className="flex-1" onClick={handleCreateDelivery}>
                    Dodaj Awizację
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {deliveries.map(delivery => {
          const totalQty = delivery.items.reduce((sum, item) => sum + item.quantityAnnounced, 0);
          const totalAllocated = delivery.items.reduce((sum, item) => sum + (item.quantityAllocated || 0), 0);
          const { totalAwizmentQty, totalCoverage, matchedOrdersCount } = getDeliverySummary(delivery);
          const summary = delivery.matchedOrderSummary ?? [];

          return (
            <Card key={delivery.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Truck className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{delivery.deliveryNumber}</h3>
                          {getStatusBadge(delivery.status)}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Dostawca:</span> {delivery.supplier}
                          </div>
                          <div>
                            <span className="font-medium">Marka:</span> {delivery.brand}
                          </div>
                          {delivery.invoiceNumber && (
                            <div>
                              <span className="font-medium">Faktura:</span> {delivery.invoiceNumber}
                            </div>
                          )}
                          {delivery.expectedDate && (
                            <div>
                              <span className="font-medium">Planowany termin:</span>{' '}
                              {new Date(delivery.expectedDate).toLocaleDateString('pl-PL')}
                            </div>
                          )}
                          {delivery.status === 'in_allocation' && matchedOrdersCount > 0 && (
                            <div>
                              <span className="font-medium">Awizacja:</span> {totalAwizmentQty} szt. ({totalCoverage}%)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Pozycje</p>
                        <p className="text-lg font-semibold">{delivery.items.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Awizowane szt.</p>
                        <p className="text-lg font-semibold">{totalQty}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Alokowane szt.</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {totalAllocated > 0 ? totalAllocated : '-'}
                        </p>
                      </div>
                      <div>
                        <label
                          htmlFor={`awizacja-${delivery.id}`}
                          className="text-xs text-gray-600 mb-1 inline-block"
                        >
                          Załaduj awizację
                        </label>
                        <div className="flex gap-2">
                          <Input
                            id={`awizacja-${delivery.id}`}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={event => {
                              const file = event.target.files?.[0];
                              if (file) {
                                void applyAwizement(delivery.id, file);
                                event.currentTarget.value = '';
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => document.getElementById(`awizacja-${delivery.id}`)?.click()}
                            disabled={isLoadingUpload === delivery.id}
                          >
                            <Upload className="w-4 h-4" />
                            {isLoadingUpload === delivery.id ? 'Wczytuję...' : 'Załącz CSV'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {summary.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Dopasowane zamówienia</h4>
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Numer zamówienia</TableHead>
                                <TableHead>Firma</TableHead>
                                <TableHead className="text-right">Zamówione</TableHead>
                                <TableHead className="text-right">W awizacji</TableHead>
                                <TableHead className="text-right">Pokrycie</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {summary.map(order => (
                                <TableRow key={order.orderId}>
                                  <TableCell>{order.orderNumber}</TableCell>
                                  <TableCell>{order.companyName}</TableCell>
                                  <TableCell className="text-right">{order.totalOrderQuantity}</TableCell>
                                  <TableCell className="text-right">{order.requested}</TableCell>
                                  <TableCell className="text-right">{order.allocationRate}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 justify-center lg:w-48">
                    <Button className="w-full gap-2" onClick={() => navigateWithPlan(delivery.id)}>
                      <Package className="w-4 h-4" />
                      Przejdź do alokacji
                    </Button>
                    {delivery.status === 'announced' && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigateWithPlan(delivery.id)}
                      >
                        Alokacja robocza
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {deliveries.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Brak awizowanych dostaw</p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Dodaj pierwszą awizację
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
