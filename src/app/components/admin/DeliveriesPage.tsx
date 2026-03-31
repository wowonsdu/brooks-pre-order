import { useState } from 'react';
import { useNavigate } from 'react-router';
import { mockDeliveries, Delivery } from '../../lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Truck, Plus, AlertCircle, Package, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function DeliveriesPage() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState(mockDeliveries);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // New delivery form state
  const [newDelivery, setNewDelivery] = useState({
    supplier: 'Brooks Europe',
    brand: 'Brooks',
    deliveryNumber: '',
    invoiceNumber: '',
    expectedDate: '',
  });

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
      items: [], // In real app, would parse from uploaded file
    };

    setDeliveries([delivery, ...deliveries]);
    setIsDialogOpen(false);
    setNewDelivery({
      supplier: 'Brooks Europe',
      brand: 'Brooks',
      deliveryNumber: '',
      invoiceNumber: '',
      expectedDate: '',
    });

    toast.success('Awizacja dodana pomyślnie', {
      description: 'Możesz teraz przejść do alokacji towaru',
    });
  };

  const handleStartAllocation = (deliveryId: string) => {
    navigate(`/admin/allocation/${deliveryId}`);
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
            <p className="text-gray-600 mt-1">Awizacje, alokacja i przyjęcia towarów</p>
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
                    onValueChange={(value) => setNewDelivery({ ...newDelivery, supplier: value })}
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
                    onChange={(e) => setNewDelivery({ ...newDelivery, brand: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="deliveryNumber">Numer Dostawy *</Label>
                  <Input
                    id="deliveryNumber"
                    placeholder="DEL-2026-XXX"
                    value={newDelivery.deliveryNumber}
                    onChange={(e) => setNewDelivery({ ...newDelivery, deliveryNumber: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="invoiceNumber">Numer Faktury *</Label>
                  <Input
                    id="invoiceNumber"
                    placeholder="INV-XXX"
                    value={newDelivery.invoiceNumber}
                    onChange={(e) => setNewDelivery({ ...newDelivery, invoiceNumber: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="expectedDate">Oczekiwana Data Dostawy</Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    value={newDelivery.expectedDate}
                    onChange={(e) => setNewDelivery({ ...newDelivery, expectedDate: e.target.value })}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    W rzeczywistej aplikacji tutaj byłaby możliwość importu pozycji dostawy z pliku Excel
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                  >
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

      {/* Deliveries List */}
      <div className="space-y-4">
        {deliveries.map(delivery => {
          const totalQty = delivery.items.reduce((sum, item) => sum + item.quantityAnnounced, 0);
          const totalAllocated = delivery.items.reduce((sum, item) => sum + (item.quantityAllocated || 0), 0);

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
                              <span className="font-medium">Oczekiwana:</span>{' '}
                              {new Date(delivery.expectedDate).toLocaleDateString('pl-PL')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
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
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 justify-center lg:w-48">
                    {delivery.status === 'announced' && (
                      <Button
                        className="w-full gap-2"
                        onClick={() => handleStartAllocation(delivery.id)}
                      >
                        <Package className="w-4 h-4" />
                        Rozpocznij Alokację
                      </Button>
                    )}
                    {delivery.status === 'in_allocation' && (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => handleStartAllocation(delivery.id)}
                      >
                        <Package className="w-4 h-4" />
                        Kontynuuj Alokację
                      </Button>
                    )}
                    {delivery.status === 'allocated' && (
                      <div className="text-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Alokacja zakończona</p>
                      </div>
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