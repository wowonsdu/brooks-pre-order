import { useState } from 'react';
import { mockPreorders, mockProducts } from '../../lib/mock-data';
import { useAuth } from '../../lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react';

export function MyOrdersPage() {
  const { user } = useAuth();
  const [preorders] = useState(() => 
    mockPreorders.filter(po => po.customerId === user?.id)
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Oczekuje', variant: 'secondary' as const, icon: Clock },
      partially_allocated: { label: 'Częściowo alokowane', variant: 'default' as const, icon: Package },
      allocated: { label: 'Alokowane', variant: 'default' as const, icon: Package },
      partially_delivered: { label: 'Częściowo dostarczone', variant: 'default' as const, icon: Package },
      completed: { label: 'Zakończone', variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: 'Anulowane', variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getProductDetails = (productId: string, variantId: string) => {
    const product = mockProducts.find(p => p.id === productId);
    const variant = product?.variants.find(v => v.id === variantId);
    return { product, variant };
  };

  const calculateProgress = (preorder: typeof mockPreorders[0]) => {
    const totalOrdered = preorder.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalDelivered = preorder.items.reduce((sum, item) => sum + item.quantityDelivered, 0);
    return totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Moje Zamówienia</h1>
        <p className="text-gray-600 mt-1">Historia i status preorderów</p>
      </div>

      {preorders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nie masz jeszcze żadnych zamówień</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {preorders.map(preorder => {
            const progress = calculateProgress(preorder);
            const totalValue = preorder.items.reduce((sum, item) => {
              const { product } = getProductDetails(item.productId, item.variantId);
              return sum + (product?.basePrice || 0) * item.quantity;
            }, 0);

            return (
              <Card key={preorder.id}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-lg">
                        {preorder.orderNumber}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Złożone: {new Date(preorder.createdAt).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(preorder.status)}
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Wartość</p>
                        <p className="font-semibold">{totalValue.toFixed(2)} zł</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  {progress > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Postęp realizacji</span>
                        <span className="font-medium">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="items">
                      <AccordionTrigger>
                        Pozycje zamówienia ({preorder.items.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
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
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{product.name}</div>
                                      <div className="text-sm text-gray-500">{variant.sku}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div>{variant.color}</div>
                                      <div className="text-gray-500">Rozmiar {variant.size}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.quantityAllocated > 0 ? (
                                      <span className="text-blue-600">{item.quantityAllocated}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.quantityDelivered > 0 ? (
                                      <span className="text-green-600">{item.quantityDelivered}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {preorder.notes && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">
                        <strong>Uwagi:</strong> {preorder.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
