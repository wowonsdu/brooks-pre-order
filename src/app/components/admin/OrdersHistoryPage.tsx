import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ConsolidatedOrder, mockProducts } from '../../lib/mock-data';
import { useConsolidatedOrders } from '../../lib/demo-store';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ChevronDown, ChevronRight, FileText, Search, CalendarDays, Download, Truck } from 'lucide-react';

type StatusFilter = 'all' | ConsolidatedOrder['status'];

const getStatusBadge = (status: ConsolidatedOrder['status']) => {
  const labels: Record<ConsolidatedOrder['status'], { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    draft: { label: 'Szkic', variant: 'secondary' },
    sent: { label: 'Wysłane', variant: 'default' },
    confirmed: { label: 'Potwierdzone', variant: 'default' },
    delivered: { label: 'Dostarczone', variant: 'outline' },
  };

  const cfg = labels[status] || labels.draft;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

export function OrdersHistoryPage() {
  const navigate = useNavigate();
  const consolidatedOrders = useConsolidatedOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const brands = useMemo(() => Array.from(new Set(mockProducts.map(product => product.brand))), []);
  const [brandFilter, setBrandFilter] = useState<string>('all');

  const enrichedOrders = useMemo(() => {
    return consolidatedOrders.map(order => {
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = order.items.reduce((sum, item) => {
        const product = mockProducts.find(productItem => productItem.id === item.productId);
        return sum + (product?.basePrice || 0) * item.quantity;
      }, 0);
      return {
        ...order,
        totalItems,
        totalValue,
      };
    });
  }, [consolidatedOrders, mockProducts]);

  const filteredOrders = useMemo(() => {
    return enrichedOrders
      .filter(order => {
        const matchSearch =
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.brand.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchBrand = brandFilter === 'all' || order.brand === brandFilter;
        return matchSearch && matchStatus && matchBrand;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [enrichedOrders, searchQuery, statusFilter, brandFilter]);

  const handleExport = () => {
    const header = 'Numer;Dostawca;Marka;Status;IloscSzt;WartoscSzacowana;Utworzone;Wyslane\n';
    const content = filteredOrders
      .map(order =>
        `${order.id};${order.supplier};${order.brand};${order.status};${order.totalItems};${order.totalValue.toFixed(2)};${new Date(order.createdAt).toLocaleDateString('pl-PL')};${order.sentAt ? new Date(order.sentAt).toLocaleDateString('pl-PL') : ''}`
      )
      .join('\n');
    const blob = new Blob([header + content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'historia_zamowien.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historia zamówień</h1>
          <p className="text-gray-600 mt-1">Zamówienia powstałe z konsolidacji preorderów</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Eksport CSV
          </Button>
          <Button className="gap-2" onClick={() => navigate('/admin/consolidation')}>
            <FileText className="w-4 h-4" />
            Nowa konsolidacja
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Szukaj</Label>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Numer, dostawca, marka..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={value => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="draft">Szkic</SelectItem>
                  <SelectItem value="sent">Wysłane</SelectItem>
                  <SelectItem value="confirmed">Potwierdzone</SelectItem>
                  <SelectItem value="delivered">Dostarczone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="brand">Marka</Label>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger id="brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie marki</SelectItem>
                  {brands.map(brand => (
                    <SelectItem value={brand} key={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredOrders.map(order => {
          const productCount = order.items.length;
          const isExpanded = expandedOrder === order.id;
          return (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div
                  className="grid grid-cols-1 lg:grid-cols-8 gap-3 items-center cursor-pointer"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="lg:col-span-2">
                    <p className="font-semibold text-gray-900">{order.id}</p>
                    <p className="text-xs text-gray-500">Dostawca: {order.supplier}</p>
                  </div>
                  <div>{order.brand}</div>
                  <div>{getStatusBadge(order.status)}</div>
                  <div className="text-sm">{productCount} pozycji</div>
                  <div className="text-sm">{order.totalItems} szt.</div>
                  <div className="text-sm">{order.totalValue.toFixed(2)} zł</div>
                  <div className="text-sm flex items-center gap-1 text-gray-600">
                    <CalendarDays className="w-4 h-4" />
                    {new Date(order.createdAt).toLocaleDateString('pl-PL')}
                  </div>
                  <div className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedOrder(isExpanded ? null : order.id);
                      }}
                      className="gap-1"
                    >
                      <Truck className="w-4 h-4" />
                      {isExpanded ? 'Ukryj pozycje' : 'Pokaż pozycje'}
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produkt</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Rozmiar</TableHead>
                          <TableHead className="text-right">Ilość</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map(item => {
                          const product = mockProducts.find(productItem => productItem.id === item.productId);
                          const variant = product?.variants.find(current => current.id === item.variantId);
                          return (
                            <TableRow key={`${order.id}-${item.variantId}`}>
                              <TableCell>{product?.name || item.productId}</TableCell>
                              <TableCell>{variant?.sku || '-'}</TableCell>
                              <TableCell>{variant ? `${variant.size} / ${variant.color}` : '-'}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-600">
              Nie znaleziono zamówień spełniających kryteria.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
