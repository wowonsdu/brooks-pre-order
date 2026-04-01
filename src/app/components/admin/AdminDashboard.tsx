import { isCustomerDelinquent, setCompanyDebtDecision, setPreorderDebtDecision, useConsolidatedOrders, useCustomers, useDeliveries, usePreorders } from '../../lib/demo-store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router';
import { useMemo } from 'react';
import { useAuth } from '../../lib/auth-context';
import { 
  Package, 
  ClipboardList, 
  Truck, 
  FileText, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const preorders = usePreorders();
  const customers = useCustomers();
  const consolidatedOrders = useConsolidatedOrders();
  const deliveries = useDeliveries();
  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  // Calculate stats
  const totalPreorders = preorders.length;
  const pendingPreorders = preorders.filter(p => p.status === 'pending').length;
  const totalItems = preorders.reduce((sum, po) => 
    sum + po.items.reduce((s, item) => s + item.quantity, 0),
    0
  );
  
  const activeDeliveries = deliveries.filter(d => d.status === 'announced' || d.status === 'in_allocation').length;
  const totalConsolidatedOrders = consolidatedOrders.length;
  const sentOrders = consolidatedOrders.filter(co => co.status === 'sent' || co.status === 'confirmed').length;

  const delinquentReviewGroups = useMemo(() => {
    const grouped = new Map<string, {
      customerId: string;
      companyName: string;
      debtAmountPln: number;
      debtSince?: string;
      allowOrders: boolean;
      totalQuantity: number;
      preorderCount: number;
      items: Array<typeof preorders[number]>;
    }>();

    preorders
      .filter((preorder) => preorder.status === 'pending')
      .forEach((preorder) => {
        const customer = customerById.get(preorder.customerId);
        if (!isCustomerDelinquent(customer)) return;

        const existing = grouped.get(preorder.customerId);
        const totalQuantity = preorder.items.reduce((sum, item) => sum + item.quantity, 0);

        if (existing) {
          existing.items.push(preorder);
          existing.totalQuantity += totalQuantity;
          existing.preorderCount += 1;
          return;
        }

        grouped.set(preorder.customerId, {
          customerId: preorder.customerId,
          companyName: preorder.companyName,
          debtAmountPln: customer?.debtAmountPln ?? 0,
          debtSince: customer?.debtSince,
          allowOrders: customer?.allowOrders !== false,
          totalQuantity,
          preorderCount: 1,
          items: [preorder],
        });
      });

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      }))
      .sort((a, b) => b.debtAmountPln - a.debtAmountPln);
  }, [customerById, preorders]);

  const pendingDebtReviews = delinquentReviewGroups.reduce(
    (sum, group) => sum + group.items.filter((item) => item.debtDecision === 'pending_review').length,
    0,
  );

  const stats = [
    {
      title: 'Aktywne Preordery',
      value: pendingPreorders,
      total: totalPreorders,
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => navigate('/admin/preorders'),
    },
    {
      title: 'Suma Sztuk (Preordery)',
      value: totalItems,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => navigate('/admin/preorders'),
    },
    {
      title: 'Oczekujące Dostawy',
      value: activeDeliveries,
      icon: Truck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => navigate('/admin/deliveries'),
    },
    {
      title: 'Wysłane Zamówienia',
      value: sentOrders,
      total: totalConsolidatedOrders,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => navigate('/admin/order-history'),
    },
  ];

  const recentPreorders = preorders.slice(0, 5);
  const upcomingDeliveries = deliveries.filter(d => d.status === 'announced').slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Administratora</h1>
        <p className="text-gray-600 mt-1">Przegląd systemu preorderów B2B</p>
      </div>

      {pendingDebtReviews > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">
              Złożone zapotrzebowania zawierają preordery klientów zalegających
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-800">
              Najpierw zdecyduj, czy dopuścić ich towar do zamówienia. Dopóki preorder ma status review, nie wejdzie do konsolidacji.
            </p>
            {delinquentReviewGroups.map((group) => (
              <div key={group.customerId} className="rounded-lg border border-red-200 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-gray-900">{group.companyName}</div>
                    <div className="text-sm text-gray-600">
                      Zalega: {group.debtAmountPln.toLocaleString('pl-PL')} PLN
                      {group.debtSince ? `, od ${new Date(group.debtSince).toLocaleDateString('pl-PL')}` : ''}
                    </div>
                    <div className="text-sm text-gray-600">
                      Aktywne preordery: {group.preorderCount}, łącznie {group.totalQuantity} szt.
                    </div>
                    <div className="text-xs text-gray-500">
                      Profil klienta: {group.allowOrders ? 'rekomenduj dopuszczenie' : 'rekomenduj wstrzymanie'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={group.allowOrders ? 'default' : 'outline'}
                      onClick={() => setCompanyDebtDecision(group.customerId, 'approved', user?.name ?? 'Administrator')}
                    >
                      Uwzględnij wszystkie
                    </Button>
                    <Button
                      size="sm"
                      variant={group.allowOrders ? 'outline' : 'destructive'}
                      onClick={() => setCompanyDebtDecision(group.customerId, 'rejected', user?.name ?? 'Administrator')}
                    >
                      Wstrzymaj wszystkie
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {group.items.map((preorder) => {
                    const totalQuantity = preorder.items.reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <div key={preorder.id} className="flex flex-col gap-3 rounded-md border border-gray-200 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="font-medium text-sm text-gray-900">{preorder.orderNumber}</div>
                          <div className="text-xs text-gray-600">
                            {new Date(preorder.createdAt).toLocaleDateString('pl-PL')} • {totalQuantity} szt.
                          </div>
                          <div className="mt-1 text-xs">
                            {preorder.debtDecision === 'pending_review' && <span className="font-medium text-orange-700">Oczekuje decyzji</span>}
                            {preorder.debtDecision === 'approved' && <span className="font-medium text-green-700">Uwzględniony w zamówieniu</span>}
                            {preorder.debtDecision === 'rejected' && <span className="font-medium text-red-700">Wstrzymany</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={preorder.debtDecision === 'approved' ? 'default' : 'outline'}
                            onClick={() => setPreorderDebtDecision(preorder.id, 'approved', user?.name ?? 'Administrator')}
                          >
                            Uwzględnij
                          </Button>
                          <Button
                            size="sm"
                            variant={preorder.debtDecision === 'rejected' ? 'destructive' : 'outline'}
                            onClick={() => setPreorderDebtDecision(preorder.id, 'rejected', user?.name ?? 'Administrator')}
                          >
                            Wstrzymaj
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={stat.action}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                    {stat.total && (
                      <span className="text-sm text-gray-500 font-normal ml-2">/ {stat.total}</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Preorders */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Ostatnie Preordery</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/preorders')}>
                Zobacz wszystkie
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPreorders.map(preorder => (
                <div key={preorder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      preorder.status === 'pending' ? 'bg-blue-100' :
                      preorder.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {preorder.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-blue-600" />
                      ) : preorder.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Package className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{preorder.orderNumber}</p>
                      <p className="text-xs text-gray-600">{preorder.companyName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(preorder.createdAt).toLocaleDateString('pl-PL')}
                    </p>
                    <p className="text-xs font-medium">
                      {preorder.items.reduce((sum, item) => sum + item.quantity, 0)} szt.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deliveries */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Nadchodzące Dostawy</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/deliveries')}>
                Zobacz wszystkie
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingDeliveries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Truck className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Brak nadchodzących dostaw</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingDeliveries.map(delivery => (
                  <div key={delivery.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{delivery.deliveryNumber}</p>
                        <p className="text-xs text-gray-600">{delivery.supplier}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {delivery.expectedDate ? new Date(delivery.expectedDate).toLocaleDateString('pl-PL') : 'TBD'}
                      </p>
                      <p className="text-xs font-medium">
                        {delivery.items.reduce((sum, item) => sum + item.quantityAnnounced, 0)} szt.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Szybkie Akcje</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/admin/order-history')}
              >
                <FileText className="w-6 h-6" />
                <span>Widok zamówień</span>
              </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/admin/deliveries')}
            >
              <Truck className="w-6 h-6" />
              <span>Dodaj Awizację</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/admin/customers')}
            >
              <TrendingUp className="w-6 h-6" />
              <span>Zarządzaj Priorytetami</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
