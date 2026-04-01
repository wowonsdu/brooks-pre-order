import { useState } from 'react';
import { useNavigate } from 'react-router';
import { mockProducts, Product, ProductVariant } from '../../lib/mock-data';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ShoppingCart, Plus, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

export function CatalogPage() {
  const navigate = useNavigate();
  const [products] = useState(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [cart, setCart] = useState<{ variantId: string; quantity: number; productId: string }[]>(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const brands = ['all', ...Array.from(new Set(products.map(p => p.brand)))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || product.brand === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  const addToCart = (product: Product, variant: ProductVariant, quantity: number) => {
    const newCart = [...cart];
    const existingItem = newCart.find(item => item.variantId === variant.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      newCart.push({ variantId: variant.id, quantity, productId: product.id });
    }
    
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    toast.success(`Dodano ${quantity} szt. do koszyka`, {
      description: `${product.name} - ${variant.color}, rozmiar ${variant.size}`,
    });
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Katalog Produktów</h1>
          <p className="text-gray-600 mt-1">Sezon Spring 2026 - Preorder</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/cart')}>
          <ShoppingCart className="w-4 h-4" />
          Koszyk {cartItemsCount > 0 && `(${cartItemsCount})`}
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search" className="mb-2 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Szukaj
              </Label>
              <Input
                id="search"
                placeholder="Szukaj produktu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="brand" className="mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Marka
              </Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger id="brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie marki</SelectItem>
                  {brands.filter(b => b !== 'all').map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={addToCart}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nie znaleziono produktów spełniających kryteria wyszukiwania.</p>
        </div>
      )}
    </div>
  );
}

function ProductCard({ 
  product, 
  onAddToCart 
}: { 
  product: Product; 
  onAddToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
}) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(product.variants[0] || null);
  const [quantity, setQuantity] = useState(10);

  const handleAdd = () => {
    if (selectedVariant && quantity > 0) {
      onAddToCart(product, selectedVariant, quantity);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video bg-gray-100 overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <CardDescription>{product.brand} - {product.model}</CardDescription>
          </div>
          <Badge variant="secondary">{product.season}</Badge>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-bold text-gray-900">
            {product.basePrice.toFixed(2)} zł
          </span>
        </div>
        {product.expectedDeliveryDate && (
          <p className="text-sm text-orange-600 mt-1">
            Oczekiwana dostawa: {new Date(product.expectedDeliveryDate).toLocaleDateString('pl-PL')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-2 block">Wariant</Label>
          <Select
            value={selectedVariant?.id}
            onValueChange={(id) => setSelectedVariant(product.variants.find(v => v.id === id) || null)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {product.variants.map(variant => (
                <SelectItem key={variant.id} value={variant.id}>
                  {variant.color} - Rozmiar {variant.size} ({variant.sku})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor={`qty-${product.id}`} className="mb-2 block">Ilość (szt.)</Label>
          <Input
            id={`qty-${product.id}`}
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          />
        </div>

        <Button 
          className="w-full gap-2" 
          onClick={handleAdd}
          disabled={!selectedVariant}
        >
          <Plus className="w-4 h-4" />
          Dodaj do koszyka
        </Button>
      </CardContent>
    </Card>
  );
}
