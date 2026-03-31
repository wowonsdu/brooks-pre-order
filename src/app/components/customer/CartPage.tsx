import { useState } from 'react';
import { useNavigate } from 'react-router';
import { mockProducts } from '../../lib/mock-data';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  variantId: string;
  productId: string;
  quantity: number;
}

export function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [notes, setNotes] = useState('');

  const updateQuantity = (variantId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(variantId);
      return;
    }
    const newCart = cart.map(item =>
      item.variantId === variantId ? { ...item, quantity: newQuantity } : item
    );
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = (variantId: string) => {
    const newCart = cart.filter(item => item.variantId !== variantId);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    toast.success('Usunięto z koszyka');
  };

  const handleSubmitPreorder = () => {
    if (cart.length === 0) {
      toast.error('Koszyk jest pusty');
      return;
    }

    // Mock preorder submission
    const preorderNumber = `PO-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    // Clear cart
    setCart([]);
    localStorage.removeItem('cart');
    
    toast.success('Preorder złożony pomyślnie!', {
      description: `Numer zamówienia: ${preorderNumber}`,
    });
    
    setTimeout(() => {
      navigate('/my-orders');
    }, 1500);
  };

  const getCartItemDetails = (item: CartItem) => {
    const product = mockProducts.find(p => p.id === item.productId);
    const variant = product?.variants.find(v => v.id === item.variantId);
    return { product, variant };
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = cart.reduce((sum, item) => {
    const { product } = getCartItemDetails(item);
    return sum + (product?.basePrice || 0) * item.quantity;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/catalog')} className="gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Powrót do katalogu
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Koszyk</h1>
        <p className="text-gray-600 mt-1">Przygotuj preorder do złożenia</p>
      </div>

      {cart.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Twój koszyk jest pusty</p>
            <Button onClick={() => navigate('/catalog')}>
              Przeglądaj katalog
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => {
              const { product, variant } = getCartItemDetails(item);
              if (!product || !variant) return null;

              return (
                <Card key={item.variantId}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-24 h-24 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                            <p className="text-sm text-gray-600">
                              {variant.color} - Rozmiar {variant.size}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{variant.sku}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.variantId)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`qty-${item.variantId}`} className="text-sm">
                              Ilość:
                            </Label>
                            <Input
                              id={`qty-${item.variantId}`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.variantId, parseInt(e.target.value) || 1)}
                              className="w-20"
                            />
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              {product.basePrice.toFixed(2)} zł × {item.quantity}
                            </p>
                            <p className="font-semibold text-gray-900">
                              {(product.basePrice * item.quantity).toFixed(2)} zł
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Podsumowanie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Liczba pozycji:</span>
                    <span className="font-medium">{cart.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Suma sztuk:</span>
                    <span className="font-medium">{totalItems}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-semibold">Wartość całkowita:</span>
                    <span className="font-bold text-lg">{totalValue.toFixed(2)} zł</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="mb-2 block">
                    Uwagi do zamówienia (opcjonalnie)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Dodatkowe informacje..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Info:</strong> To jest preorder na towar sezonowy. Oczekiwana realizacja zgodnie z datami dostaw produktów.
                  </p>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmitPreorder}
                >
                  Złóż preorder
                </Button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Firma: {user?.companyName}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
