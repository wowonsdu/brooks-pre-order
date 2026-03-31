import { useState } from 'react';
import { mockUsers, User } from '../../lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, ArrowUp, ArrowDown, Save } from 'lucide-react';
import { toast } from 'sonner';

export function CustomersManagementPage() {
  const [customers, setCustomers] = useState(() => 
    mockUsers
      .filter(u => u.role === 'b2b_customer')
      .sort((a, b) => (a.priority || 999) - (b.priority || 999))
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updatePriority = (userId: string, newPriority: number) => {
    setCustomers(prev =>
      prev.map(c =>
        c.id === userId ? { ...c, priority: newPriority } : c
      ).sort((a, b) => (a.priority || 999) - (b.priority || 999))
    );
  };

  const movePriority = (userId: string, direction: 'up' | 'down') => {
    const index = customers.findIndex(c => c.id === userId);
    if (index === -1) return;

    const customer = customers[index];
    const currentPriority = customer.priority || 999;

    if (direction === 'up' && currentPriority > 1) {
      updatePriority(userId, currentPriority - 1);
    } else if (direction === 'down' && currentPriority < 10) {
      updatePriority(userId, currentPriority + 1);
    }
  };

  const handleSave = () => {
    toast.success('Priorytety zapisane', {
      description: 'Zmiany zostały zastosowane',
    });
  };

  const getPriorityBadge = (priority?: number) => {
    if (!priority) return <Badge variant="outline">Brak</Badge>;

    const colors = {
      1: 'bg-red-100 text-red-800 border-red-300',
      2: 'bg-orange-100 text-orange-800 border-orange-300',
      3: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      4: 'bg-green-100 text-green-800 border-green-300',
      5: 'bg-blue-100 text-blue-800 border-blue-300',
    };

    const color = colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';

    return (
      <Badge variant="outline" className={color}>
        Priorytet {priority}
      </Badge>
    );
  };

  const getPriorityDescription = (priority?: number) => {
    const descriptions = {
      1: 'Najwyższy - pierwszy w kolejności alokacji',
      2: 'Wysoki - preferowany dostęp do towaru',
      3: 'Średni - standardowa obsługa',
      4: 'Niski - późniejsza alokacja',
      5: 'Najniższy - ostatni w kolejności',
    };
    return priority ? descriptions[priority as keyof typeof descriptions] : 'Nieokreślony';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Zarządzanie Klientami B2B</h1>
            <p className="text-gray-600 mt-1">Konfiguracja priorytetów alokacji</p>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Zapisz zmiany
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-bold">i</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Priorytety alokacji</h3>
              <p className="text-sm text-blue-800">
                Priorytety określają kolejność przydziału towaru przy częściowych dostawach. 
                Klienci o wyższym priorytecie (niższym numerze) otrzymają towar w pierwszej kolejności.
                Operator może ręcznie modyfikować alokację podczas procesu przydzielania.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="max-w-md">
            <Label htmlFor="search" className="mb-2 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Szukaj klienta
            </Label>
            <Input
              id="search"
              placeholder="Nazwa, firma, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Klienci B2B ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Priorytet</TableHead>
                <TableHead>Nazwa</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Zmień priorytet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer, index) => (
                <TableRow key={customer.id}>
                  <TableCell className="text-gray-500 font-medium">
                    #{index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getPriorityBadge(customer.priority)}
                      <p className="text-xs text-gray-600">
                        {getPriorityDescription(customer.priority)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.companyName || '-'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{customer.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={customer.priority?.toString() || ''}
                        onValueChange={(value) => updatePriority(customer.id, parseInt(value))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Priorytet 1</SelectItem>
                          <SelectItem value="2">Priorytet 2</SelectItem>
                          <SelectItem value="3">Priorytet 3</SelectItem>
                          <SelectItem value="4">Priorytet 4</SelectItem>
                          <SelectItem value="5">Priorytet 5</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => movePriority(customer.id, 'up')}
                          disabled={!customer.priority || customer.priority === 1}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => movePriority(customer.id, 'down')}
                          disabled={!customer.priority || customer.priority === 5}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nie znaleziono klientów
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Podsumowanie priorytetów</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(priority => {
              const count = customers.filter(c => c.priority === priority).length;
              return (
                <div key={priority} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="mb-2">{getPriorityBadge(priority)}</div>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600">
                    {count === 1 ? 'klient' : count < 5 ? 'klientów' : 'klientów'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
