// Script to generate comprehensive mock data from CSV
// This file is too large to include directly, so it will be generated programmatically

import type { Product, ProductVariant, User, Preorder, PreorderItem, ConsolidatedOrder, Delivery } from './mock-data';

// Raw SKU data extracted from CSV - sample of products
const rawSkuData = [
  // Adrenaline GTS 25 - różne kolory
  { sku: '1104541D017', name: 'Adrenaline GTS 25', color: 'Niebieski/Czarny', gender: 'D', sizes: ['7.5', '8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5', '13.0', '14.0', '15.0'], price: 50 },
  { sku: '1104541D020', name: 'Adrenaline GTS 25', color: 'Czarny/Biały', gender: 'D', sizes: ['9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5'], price: 50 },
  { sku: '1104541D151', name: 'Adrenaline GTS 25', color: 'Różowy', gender: 'D', sizes: ['9.0', '9.5', '10.0', '10.5', '11.0', '11.5'], price: 50 },
  { sku: '1204431B530', name: 'Adrenaline GTS 25', color: 'Granatowy', gender: 'B', sizes: ['7.5', '8.0', '8.5', '9.0', '9.5', '10.0'], price: 50 },
  
  // Cascadia 20 GTX
  { sku: '1204771B030', name: 'Cascadia 20 GTX', color: 'Czarny/Zielony', gender: 'B', sizes: ['7.0', '7.5', '8.0', '8.5', '9.0'], price: 69 },
  
  // Cascadia Elite
  { sku: '1000551D116', name: 'Cascadia Elite', color: 'Żółty/Czarny', gender: 'D', sizes: ['8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0'], price: 112.2 },
  
  // Ghost 18 - wiele wariantów kolorystycznych
  { sku: '1104931B172', name: 'Ghost 18', color: 'Szary/Niebieski', gender: 'B', sizes: ['8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0'], price: 47.3 },
  { sku: '1104931D020', name: 'Ghost 18', color: 'Biały/Srebrny', gender: 'D', sizes: ['7.5', '8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5', '13.0'], price: 47.3 },
  { sku: '1104931D090', name: 'Ghost 18', color: 'Fioletowy', gender: 'D', sizes: ['9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5', '13.0'], price: 47.3 },
  { sku: '1104931D172', name: 'Ghost 18', color: 'Różowy/Biały', gender: 'D', sizes: ['7.5', '8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5', '13.0'], price: 47.3 },
  { sku: '1104931D281', name: 'Ghost 18', color: 'Turkusowy', gender: 'D', sizes: ['8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5'], price: 47.3 },
  { sku: '1104931D429', name: 'Ghost 18', color: 'Zielony/Czarny', gender: 'D', sizes: ['7.5', '8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5', '13.0', '14.0'], price: 47.3 },
  { sku: '1104931D846', name: 'Ghost 18', color: 'Czarny/Złoty', gender: 'D', sizes: ['7.5', '8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5', '13.0'], price: 47.3 },
  { sku: '1104932E020', name: 'Ghost 18', color: 'Biały', gender: 'E', sizes: ['8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0'], price: 47.3 },
  { sku: '1104932E172', name: 'Ghost 18', color: 'Różowy', gender: 'E', sizes: ['8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5'], price: 47.3 },
  { sku: '1104934E020', name: 'Ghost 18', color: 'Srebrny', gender: 'E', sizes: ['8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5'], price: 47.3 },
  { sku: '1204821B020', name: 'Ghost 18', color: 'Niebieski', gender: 'B', sizes: ['6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0', '9.5', '10.0'], price: 47.3 },
  { sku: '1204821B080', name: 'Ghost 18', color: 'Czerwony', gender: 'B', sizes: ['6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0', '9.5', '10.0', '10.5'], price: 47.3 },
  { sku: '1204821B161', name: 'Ghost 18', color: 'Zielony', gender: 'B', sizes: ['6.5', '7.0', '7.5', '8.0', '8.5', '9.0', '9.5', '10.0'], price: 47.3 },
  { sku: '1204821B584', name: 'Ghost 18', color: 'Pomarańczowy', gender: 'B', sizes: ['6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0', '9.5', '10.0'], price: 47.3 },
  { sku: '1204821D161', name: 'Ghost 18', color: 'Fioletowy/Biały', gender: 'D', sizes: ['6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0'], price: 47.3 },
  
  // Ghost Max 4
  { sku: '1104961D004', name: 'Ghost Max 4', color: 'Czarny/Szary', gender: 'D', sizes: ['8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5', '13.0'], price: 51.8 },
  { sku: '1104961D019', name: 'Ghost Max 4', color: 'Biały/Niebieski', gender: 'D', sizes: ['8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0'], price: 51.8 },
  
  // Glycerin 23
  { sku: '1104761D090', name: 'Glycerin 23', color: 'Fioletowy/Różowy', gender: 'D', sizes: ['8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0'], price: 55.3 },
  { sku: '1104761D163', name: 'Glycerin 23', color: 'Niebieski/Biały', gender: 'D', sizes: ['8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0'], price: 55.3 },
  { sku: '1104761D228', name: 'Glycerin 23', color: 'Czarny/Złoty', gender: 'D', sizes: ['8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5', '13.0', '14.0', '15.0'], price: 55.3 },
  { sku: '1104761D464', name: 'Glycerin 23', color: 'Różowy', gender: 'D', sizes: ['8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5', '13.0', '14.0', '15.0'], price: 55.3 },
  { sku: '1104762E090', name: 'Glycerin 23', color: 'Fioletowy', gender: 'E', sizes: ['8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5'], price: 55.3 },
];

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateSKU(baseSku: string, size: string): string {
  const sizeCode = size.replace('.', '').padStart(3, '0');
  return `${baseSku}.${sizeCode}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SEASON_WINDOWS = [
  {
    seasonWindow: 'spring' as const,
    months: [10, 11, 0, 1, 2],
  },
  {
    seasonWindow: 'winter' as const,
    months: [4, 5, 6, 7, 8],
  },
] as const;

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate products with all variants
export function generateProducts(): Product[] {
  const products: Product[] = [];
  
  // Delivery months: April through September 2026
  const deliveryDates = [
    '2026-04-15',
    '2026-05-15',
    '2026-06-15',
    '2026-07-15',
    '2026-08-15',
    '2026-09-15',
  ];
  
  rawSkuData.forEach((item, index) => {
    const productId = `prod_${index + 1}`;
    const genderMap: Record<string, string> = {
      'D': 'Damskie',
      'B': 'Męskie',
      'E': 'Unisex'
    };
    
    const variants: ProductVariant[] = item.sizes.map(size => ({
      id: `var_${productId}_${size.replace('.', '_')}`,
      sku: generateSKU(item.sku, size),
      size,
      color: item.color,
      availableStock: 0
    }));

    // Assign delivery month based on product index for good distribution
    const deliveryDate = deliveryDates[index % deliveryDates.length];
    const seasonNames: Record<string, string> = {
      '2026-04-15': 'Wiosna 2026',
      '2026-05-15': 'Wiosna 2026',
      '2026-06-15': 'Lato 2026',
      '2026-07-15': 'Lato 2026',
      '2026-08-15': 'Lato 2026',
      '2026-09-15': 'Jesień 2026',
    };
    
    products.push({
      id: productId,
      name: item.name,
      brand: 'Brooks',
      model: item.name,
      category: genderMap[item.gender] || 'Running',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      basePrice: item.price,
      variants,
      season: seasonNames[deliveryDate] || 'Wiosna 2026',
      expectedDeliveryDate: deliveryDate
    });
  });
  
  return products;
}

// Generate 10 customers with priorities
export function generateCustomers(): User[] {
  const companies = [
    'SportMax Warszawa',
    'RunPro Kraków',
    'ActiveSport Wrocław',
    'MegaSport Poznań',
    'FitZone Gdańsk',
    'SportLife Łódź',
    'ProRunner Katowice',
    'EliteSport Szczecin',
    'Champion Bydgoszcz',
    'TopSport Lublin'
  ];

  const debtProfiles: Record<number, Pick<User, 'debtAmountPln' | 'debtSince' | 'allowOrders'>> = {
    1: { debtAmountPln: 18450, debtSince: '2026-01-12', allowOrders: false },
    4: { debtAmountPln: 9200, debtSince: '2026-02-03', allowOrders: true },
    7: { debtAmountPln: 27600, debtSince: '2025-12-18', allowOrders: false },
  };
  
  return companies.map((company, index) => ({
    id: `customer_${index + 1}`,
    email: `contact@${company.toLowerCase().replace(' ', '')}.pl`,
    name: `${company} - Dział Zakupów`,
    role: 'b2b_customer' as const,
    companyName: company,
    priority: (index % 5) + 1, // Priorities 1-5, evenly distributed
    allowOrders: debtProfiles[index]?.allowOrders ?? true,
    debtAmountPln: debtProfiles[index]?.debtAmountPln,
    debtSince: debtProfiles[index]?.debtSince,
  }));
}

// Generate 40 preorders with 30-80 items each
export function generatePreorders(customers: User[], products: Product[]): Preorder[] {
  const preorders: Preorder[] = [];
  const allVariants: Array<{ productId: string; variantId: string; sku: string }> = [];
  
  // Build variant index
  products.forEach(product => {
    product.variants.forEach(variant => {
      allVariants.push({
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku
      });
    });
  });
  
  // Each customer gets 4 preorders (10 customers × 4 = 40)
  customers.forEach((customer, customerIndex) => {
    const numPreorders = 4;
    
    for (let i = 0; i < numPreorders; i++) {
      const preorderId = `preorder_${preorders.length + 1}`;
      const orderNumber = `PO-2026-${String(preorders.length + 1).padStart(4, '0')}`;
      const numItems = randomInt(25, 65);
      const seasonWindow = SEASON_WINDOWS[(customerIndex + i) % SEASON_WINDOWS.length];
      const monthIndex = seasonWindow.months[(i + customerIndex) % seasonWindow.months.length];
      
      // Select random variants for this preorder
      const selectedVariants = shuffleArray(allVariants).slice(0, numItems);
      
      const items: PreorderItem[] = selectedVariants.map(variant => ({
        id: generateId(),
        variantId: variant.variantId,
        productId: variant.productId,
        quantity: randomInt(15, 50),
        quantityAllocated: 0,
        quantityDelivered: 0
      }));

      // Spread creation dates across Jan-Mar 2026
      const creationMonth = i < 2 ? 0 : i < 3 ? 1 : 2; // Jan, Feb, Mar
      const notes = [
        'Priorytetowe zamówienie sezonowe',
        'Zamówienie uzupełniające na lato',
        'Preorder kolekcji jesiennej',
        undefined,
      ];
      
      preorders.push({
        id: preorderId,
        orderNumber,
        customerId: customer.id!,
        customerName: customer.name,
        companyName: customer.companyName!,
        priority: customer.priority!,
        customerPriority: customer.priority!,
        seasonWindow: seasonWindow.seasonWindow,
        deliveryMonth: monthIndex,
        items,
        status: 'pending',
        createdAt: new Date(2026, creationMonth, randomInt(1, 28)).toISOString(),
        notes: notes[i],
        debtDecision: customer.debtAmountPln && customer.debtSince ? 'pending_review' : 'not_required',
      });
    }
  });

  const sorted = [...preorders].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  sorted.forEach((preorder, index) => {
    preorder.allocationOrder = index + 1;
  });

  return sorted;
}

// Generate consolidated orders based on preorders
export function generateConsolidatedOrders(preorders: Preorder[], products: Product[]): ConsolidatedOrder[] {
  const consolidatedOrders: ConsolidatedOrder[] = [];
  
  // Aggregate all preorder items by variant
  const variantDemand = new Map<string, number>();
  
  preorders.forEach(preorder => {
    preorder.items.forEach(item => {
      const current = variantDemand.get(item.variantId) || 0;
      variantDemand.set(item.variantId, current + item.quantity);
    });
  });
  
  // Create consolidated order
  const items = Array.from(variantDemand.entries()).map(([variantId, quantity]) => {
    // Find product by searching through all products
    let productId = '';
    for (const product of products) {
      if (product.variants.some(v => v.id === variantId)) {
        productId = product.id;
        break;
      }
    }
    return {
      variantId,
      productId,
      quantity
    };
  });
  
  consolidatedOrders.push({
    id: 'cons_order_1',
    supplier: 'Brooks Running',
    brand: 'Brooks',
    status: 'confirmed',
    items,
    createdAt: new Date(2026, 1, 1).toISOString(),
    sentAt: new Date(2026, 1, 15).toISOString(),
    expectedDeliveryDate: '2026-05-15'
  });
  
  return consolidatedOrders;
}

// Generate 5 deliveries with different coverage scenarios
export function generateDeliveries(products: Product[], preorders: Preorder[]): Delivery[] {
  const deliveries: Delivery[] = [];
  const allVariants: Array<{ productId: string; variantId: string; sku: string }> = [];
  
  // Build variant index
  products.forEach(product => {
    product.variants.forEach(variant => {
      allVariants.push({
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku
      });
    });
  });
  
  // Calculate total demand per variant
  const variantDemand = new Map<string, number>();
  preorders.forEach(preorder => {
    preorder.items.forEach(item => {
      const current = variantDemand.get(item.variantId) || 0;
      variantDemand.set(item.variantId, current + item.quantity);
    });
  });
  
  // Delivery 1: 15% of demand - partial, some high-priority customers can be fully satisfied
  const delivery1Variants = shuffleArray(allVariants).slice(0, Math.floor(allVariants.length * 0.4));
  deliveries.push({
    id: 'delivery_1',
    deliveryNumber: 'DEL-2026-001',
    supplier: 'Brooks Running',
    brand: 'Brooks',
    status: 'announced',
    items: delivery1Variants.map(v => {
      const demand = variantDemand.get(v.variantId) || 0;
      return {
        variantId: v.variantId,
        productId: v.productId,
        quantityAnnounced: Math.floor(demand * 0.15)
      };
    }),
    expectedDate: '2026-04-01',
    createdAt: new Date(2026, 2, 15).toISOString()
  });
  
  // Delivery 2: 25% of demand - medium coverage
  const delivery2Variants = shuffleArray(allVariants).slice(0, Math.floor(allVariants.length * 0.5));
  deliveries.push({
    id: 'delivery_2',
    deliveryNumber: 'DEL-2026-002',
    supplier: 'Brooks Running',
    brand: 'Brooks',
    status: 'announced',
    items: delivery2Variants.map(v => {
      const demand = variantDemand.get(v.variantId) || 0;
      return {
        variantId: v.variantId,
        productId: v.productId,
        quantityAnnounced: Math.floor(demand * 0.25)
      };
    }),
    expectedDate: '2026-04-15',
    createdAt: new Date(2026, 2, 20).toISOString()
  });
  
  // Delivery 3: 20% of demand - different set of variants
  const delivery3Variants = shuffleArray(allVariants).slice(0, Math.floor(allVariants.length * 0.45));
  deliveries.push({
    id: 'delivery_3',
    deliveryNumber: 'DEL-2026-003',
    supplier: 'Brooks Running',
    brand: 'Brooks',
    status: 'announced',
    items: delivery3Variants.map(v => {
      const demand = variantDemand.get(v.variantId) || 0;
      return {
        variantId: v.variantId,
        productId: v.productId,
        quantityAnnounced: Math.floor(demand * 0.20)
      };
    }),
    expectedDate: '2026-05-01',
    createdAt: new Date(2026, 3, 1).toISOString()
  });
  
  // Delivery 4: 30% of demand - larger delivery
  const delivery4Variants = shuffleArray(allVariants).slice(0, Math.floor(allVariants.length * 0.6));
  deliveries.push({
    id: 'delivery_4',
    deliveryNumber: 'DEL-2026-004',
    supplier: 'Brooks Running',
    brand: 'Brooks',
    status: 'announced',
    items: delivery4Variants.map(v => {
      const demand = variantDemand.get(v.variantId) || 0;
      return {
        variantId: v.variantId,
        productId: v.productId,
        quantityAnnounced: Math.floor(demand * 0.30)
      };
    }),
    expectedDate: '2026-05-15',
    createdAt: new Date(2026, 3, 10).toISOString()
  });
  
  // Delivery 5: 10% of demand - small补充delivery
  const delivery5Variants = shuffleArray(allVariants).slice(0, Math.floor(allVariants.length * 0.3));
  deliveries.push({
    id: 'delivery_5',
    deliveryNumber: 'DEL-2026-005',
    supplier: 'Brooks Running',
    brand: 'Brooks',
    status: 'announced',
    items: delivery5Variants.map(v => {
      const demand = variantDemand.get(v.variantId) || 0;
      return {
        variantId: v.variantId,
        productId: v.productId,
        quantityAnnounced: Math.floor(demand * 0.10)
      };
    }),
    expectedDate: '2026-05-30',
    createdAt: new Date(2026, 3, 20).toISOString()
  });
  
  return deliveries;
}
