import type { Product } from '@/lib/catalog/types';

// `Product` now lives in `src/lib/catalog/types.ts`; re-exported so old imports keep working.
export type { Product };

export interface UserProfile {
  name: string;
  bodyShape: string;
  height: number;
  aesthetics: string[];
  fitPrefs: string[];
  occasions: string[];
  budgetMin: number;
  budgetMax: number;
  brands: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'paula';
  text: string;
  chips?: string[];
  photoUploaded?: boolean;
  products?: Product[];
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  photoCount?: number;
  bodyMatch?: number; // 0-100, how similar reviewer's proportions are to user
  reviewerHeight?: number;
  reviewerShape?: string;
}

export interface Collection {
  id: string;
  name: string;
  items: Product[];
  emoji?: string;
}

export const productReviews: Review[] = [
  { id: 'r1', productId: '1', author: 'Anna M.', rating: 5, text: 'Beautiful dress, fits perfectly!', date: '2026-02-15', photoCount: 2, bodyMatch: 92, reviewerHeight: 167, reviewerShape: 'Hourglass' },
  { id: 'r2', productId: '1', author: 'Magda K.', rating: 4, text: 'Great linen quality, but a bit too long for me.', date: '2026-01-20', bodyMatch: 68, reviewerHeight: 158, reviewerShape: 'Pear' },
  { id: 'r3', productId: '1', author: 'Ola W.', rating: 5, text: 'Amazing for summer! Highly recommend.', date: '2026-03-01', bodyMatch: 85, reviewerHeight: 170, reviewerShape: 'Hourglass' },
  { id: 'r4', productId: '2', author: 'Kasia P.', rating: 4, text: 'Nice pattern, comfortable to wear.', date: '2026-02-10', photoCount: 1, bodyMatch: 74, reviewerHeight: 163, reviewerShape: 'Rectangle' },
  { id: 'r5', productId: '2', author: 'Zosia L.', rating: 3, text: 'OK, but the fabric could be better.', date: '2026-01-05', bodyMatch: 55, reviewerHeight: 175, reviewerShape: 'Triangle' },
  { id: 'r6', productId: '4', author: 'Marta R.', rating: 5, text: 'Best blazer I\'ve ever owned! Worth every penny.', date: '2026-03-10', photoCount: 3, bodyMatch: 94, reviewerHeight: 166, reviewerShape: 'Hourglass' },
  { id: 'r7', productId: '4', author: 'Ewa S.', rating: 5, text: 'Excellent cut, perfect for the office.', date: '2026-02-28', bodyMatch: 78, reviewerHeight: 172, reviewerShape: 'Rectangle' },
  { id: 'r8', productId: '6', author: 'Iza N.', rating: 4, text: 'Very comfortable, look great.', date: '2026-02-20', photoCount: 1, bodyMatch: 81, reviewerHeight: 164, reviewerShape: 'Hourglass' },
  { id: 'r9', productId: '9', author: 'Julia D.', rating: 5, text: 'Elegant vest, superb quality.', date: '2026-03-05', photoCount: 1, bodyMatch: 88, reviewerHeight: 168, reviewerShape: 'Hourglass' },
  { id: 'r10', productId: '3', author: 'Paulina B.', rating: 4, text: 'Nice skirt for everyday wear.', date: '2026-01-15', photoCount: 1, bodyMatch: 71, reviewerHeight: 160, reviewerShape: 'Pear' },
  { id: 'r11', productId: '5', author: 'Nina T.', rating: 5, text: 'Top-quality silk!', date: '2026-02-01', photoCount: 2, bodyMatch: 90, reviewerHeight: 165, reviewerShape: 'Hourglass' },
  { id: 'r12', productId: '7', author: 'Hanna G.', rating: 4, text: 'Like new, great deal from Vinted.', date: '2026-01-28', photoCount: 1, bodyMatch: 63, reviewerHeight: 156, reviewerShape: 'Pear' },
  { id: 'r13', productId: '10', author: 'Daria F.', rating: 3, text: 'Average, but fair for the price.', date: '2026-02-18', photoCount: 1, bodyMatch: 59, reviewerHeight: 174, reviewerShape: 'Triangle' },
  { id: 'r14', productId: '14', author: 'Weronika H.', rating: 5, text: 'Perfect for spring, super lightweight.', date: '2026-03-12', photoCount: 1, bodyMatch: 87, reviewerHeight: 166, reviewerShape: 'Hourglass' },
  { id: 'r15', productId: '17', author: 'Alicja C.', rating: 4, text: 'Nice high waist, holds well.', date: '2026-02-25', photoCount: 1, bodyMatch: 76, reviewerHeight: 162, reviewerShape: 'Rectangle' },
  { id: 'r16', productId: '8', author: 'Zofia M.', rating: 4, text: 'Pretty satin finish, great for the price.', date: '2026-02-05', photoCount: 1, bodyMatch: 82, reviewerHeight: 167, reviewerShape: 'Hourglass' },
  { id: 'r17', productId: '11', author: 'Agata K.', rating: 4, text: 'Lovely flow, wears beautifully.', date: '2026-01-30', photoCount: 1, bodyMatch: 70, reviewerHeight: 169, reviewerShape: 'Rectangle' },
  { id: 'r18', productId: '12', author: 'Milena T.', rating: 5, text: 'Great Vinted find! Barely worn.', date: '2026-03-02', photoCount: 1, bodyMatch: 91, reviewerHeight: 165, reviewerShape: 'Hourglass' },
  { id: 'r19', productId: '13', author: 'Sara W.', rating: 3, text: 'Cute but synthetic fabric.', date: '2026-02-14', photoCount: 1, bodyMatch: 52, reviewerHeight: 178, reviewerShape: 'Triangle' },
  { id: 'r20', productId: '15', author: 'Klara J.', rating: 4, text: 'Perfect basics, great quality.', date: '2026-03-08', photoCount: 1, bodyMatch: 83, reviewerHeight: 164, reviewerShape: 'Hourglass' },
  { id: 'r21', productId: '16', author: 'Ola P.', rating: 4, text: 'Flattering cut, good for the price.', date: '2026-02-22', photoCount: 1, bodyMatch: 77, reviewerHeight: 163, reviewerShape: 'Pear' },
  { id: 'r22', productId: '18', author: 'Maja S.', rating: 4, text: 'Elegant slip dress, second-hand gem.', date: '2026-01-18', photoCount: 1, bodyMatch: 86, reviewerHeight: 166, reviewerShape: 'Hourglass' },
  { id: 'r23', productId: '19', author: 'Natalia R.', rating: 5, text: 'Beautiful bag, holds everything.', date: '2026-03-15', photoCount: 1, bodyMatch: 79, reviewerHeight: 170, reviewerShape: 'Rectangle' },
  { id: 'r24', productId: '20', author: 'Emilia B.', rating: 4, text: 'Classic shirt, good cotton quality.', date: '2026-02-12', photoCount: 1, bodyMatch: 88, reviewerHeight: 165, reviewerShape: 'Hourglass' },
  { id: 'r25', productId: '21', author: 'Wiktoria L.', rating: 5, text: 'Perfect wedding guest dress!', date: '2026-03-20', photoCount: 2, bodyMatch: 93, reviewerHeight: 166, reviewerShape: 'Hourglass' },
  { id: 'r26', productId: '22', author: 'Lena K.', rating: 4, text: 'Pretty and comfortable for a garden party.', date: '2026-03-18', photoCount: 1, bodyMatch: 72, reviewerHeight: 161, reviewerShape: 'Pear' },
  { id: 'r27', productId: '23', author: 'Ada M.', rating: 4, text: 'Nice find on Vinted, flowy fabric.', date: '2026-02-08', photoCount: 1, bodyMatch: 80, reviewerHeight: 168, reviewerShape: 'Hourglass' },
  { id: 'r28', productId: '24', author: 'Iga T.', rating: 3, text: 'Good basic wrap dress.', date: '2026-01-25', photoCount: 1, bodyMatch: 65, reviewerHeight: 157, reviewerShape: 'Pear' },
  { id: 'r29', productId: '25', author: 'Roza N.', rating: 4, text: 'Lovely pastel color, fits well.', date: '2026-03-01', photoCount: 1, bodyMatch: 84, reviewerHeight: 165, reviewerShape: 'Hourglass' },
  { id: 'r30', productId: '26', author: 'Blanka D.', rating: 5, text: 'Beautiful eyelet detail!', date: '2026-03-22', photoCount: 1, bodyMatch: 89, reviewerHeight: 167, reviewerShape: 'Hourglass' },
  { id: 'r31', productId: '27', author: 'Patrycja G.', rating: 3, text: 'OK quality for the price.', date: '2026-02-16', photoCount: 1, bodyMatch: 58, reviewerHeight: 176, reviewerShape: 'Triangle' },
  { id: 'r32', productId: '28', author: 'Celina F.', rating: 4, text: 'Great boho vibe, Vinted bargain.', date: '2026-01-12', photoCount: 1, bodyMatch: 75, reviewerHeight: 163, reviewerShape: 'Rectangle' },
  { id: 'r33', productId: '29', author: 'Diana H.', rating: 4, text: 'Smocked bodice fits perfectly.', date: '2026-03-10', photoCount: 1, bodyMatch: 91, reviewerHeight: 166, reviewerShape: 'Hourglass' },
  { id: 'r34', productId: '30', author: 'Helena W.', rating: 3, text: 'Cute ruffle hem, OK fabric.', date: '2026-02-20', photoCount: 1, bodyMatch: 60, reviewerHeight: 171, reviewerShape: 'Rectangle' },
];

export interface MaterialInfo {
  composition: { name: string; percent: number; natural: boolean }[];
  qualityScore: number; // 0-100
  description: string;
  care: string[];
  behavior: string;
}

export const productMaterials: Record<string, MaterialInfo> = {
  '1': {
    composition: [{ name: 'Linen', percent: 70, natural: true }, { name: 'Cotton', percent: 30, natural: true }],
    qualityScore: 88,
    description: 'Natural linen-cotton blend, soft to the touch and breathable.',
    care: ['Wash 30°C', 'Do not tumble dry', 'Iron on medium heat'],
    behavior: 'The fabric wrinkles slightly — a natural linen characteristic. Gets softer with every wash. Breathable, perfect for summer.',
  },
  '2': {
    composition: [{ name: 'Viscose', percent: 100, natural: false }],
    qualityScore: 65,
    description: 'Medium-weight viscose, drapes beautifully.',
    care: ['Wash 30°C', 'Iron on low heat'],
    behavior: 'Drapes well and flows nicely. May pill with extended wear. Viscose is derived from wood fibers but chemically processed.',
  },
  '3': {
    composition: [{ name: 'Organic Cotton', percent: 98, natural: true }, { name: 'Elastane', percent: 2, natural: false }],
    qualityScore: 82,
    description: 'Certified organic cotton with minimal elastane.',
    care: ['Wash 40°C', 'Tumble dry OK'],
    behavior: 'Strong, breathable fabric. Holds shape thanks to elastane. Gets softer with every wash.',
  },
  '4': {
    composition: [{ name: 'Wool', percent: 80, natural: true }, { name: 'Polyester', percent: 20, natural: false }],
    qualityScore: 91,
    description: 'High-quality wool blend, holds its shape exceptionally well.',
    care: ['Dry clean only', 'Do not machine wash'],
    behavior: 'Holds structure well, resists wrinkling. Polyester adds durability. Suitable for all seasons.',
  },
  '5': {
    composition: [{ name: 'Silk', percent: 100, natural: true }],
    qualityScore: 95,
    description: 'Pure silk, luxurious and delicate.',
    care: ['Hand wash', 'Dry clean', 'Do not wring'],
    behavior: 'Silk drapes beautifully with a natural sheen. Delicate fabric requiring careful handling. Thermoregulating — cools in summer, warms in winter.',
  },
  '6': {
    composition: [{ name: 'Polyester', percent: 65, natural: false }, { name: 'Viscose', percent: 30, natural: false }, { name: 'Elastane', percent: 5, natural: false }],
    qualityScore: 55,
    description: 'Synthetic blend, comfortable and easy care.',
    care: ['Wash 30°C', 'Tumble dry OK'],
    behavior: 'Wrinkle-resistant and easy to maintain. May not breathe as well as natural fabrics. Can build static with heavy wear.',
  },
  '7': {
    composition: [{ name: 'Genuine Leather', percent: 100, natural: true }],
    qualityScore: 85,
    description: 'Genuine leather, second-hand in very good condition.',
    care: ['Clean with leather conditioner', 'Store away from moisture'],
    behavior: 'Leather develops a patina over time, adding character. Molds to your foot. Durable material built to last.',
  },
  '8': {
    composition: [{ name: 'Satin (Polyester)', percent: 100, natural: false }],
    qualityScore: 60,
    description: 'Polyester satin with a subtle sheen.',
    care: ['Hand wash', 'Iron on low heat'],
    behavior: 'Smooth and flowing drape. Doesn\'t breathe as well as natural silk satin. May build static.',
  },
  '9': {
    composition: [{ name: 'Wool', percent: 55, natural: true }, { name: 'Cotton', percent: 40, natural: true }, { name: 'Elastane', percent: 5, natural: false }],
    qualityScore: 89,
    description: 'High-quality wool-cotton blend by Massimo Dutti.',
    care: ['Dry clean', 'Iron on medium heat'],
    behavior: 'Holds shape excellently, professional look. Breathable thanks to natural fibers. Durable fabric.',
  },
  '10': {
    composition: [{ name: 'Cotton', percent: 50, natural: true }, { name: 'Polyester', percent: 50, natural: false }],
    qualityScore: 45,
    description: 'Standard cotton-polyester blend.',
    care: ['Wash 40°C', 'Tumble dry OK'],
    behavior: 'Decent fabric at this price point. May pill after many washes. Polyester reduces wrinkling but also breathability.',
  },
  '13': {
    composition: [{ name: 'Acrylic', percent: 80, natural: false }, { name: 'Polyester', percent: 20, natural: false }],
    qualityScore: 35,
    description: 'Synthetic fabric, budget option.',
    care: ['Wash 30°C', 'Do not iron'],
    behavior: 'Lightweight and soft to touch, but fully synthetic. May pill and build static. For everyday wear, not built to last.',
  },
  '14': {
    composition: [{ name: 'Linen', percent: 55, natural: true }, { name: 'Cotton', percent: 40, natural: true }, { name: 'Elastane', percent: 5, natural: false }],
    qualityScore: 84,
    description: 'Linen-cotton blend, light and airy.',
    care: ['Wash 30°C', 'Iron on medium heat'],
    behavior: 'Natural wrinkling adds character. Very breathable for warm days. Elastane ensures comfort of movement.',
  },
  '15': {
    composition: [{ name: 'Organic Cotton', percent: 95, natural: true }, { name: 'Elastane', percent: 5, natural: false }],
    qualityScore: 78,
    description: 'Ribbed organic cotton, soft and stretchy.',
    care: ['Wash 40°C', 'Tumble dry OK'],
    behavior: 'Fits close to the body, breathable. Holds shape after washing. Ribbed texture adds a subtle visual effect.',
  },
  '17': {
    composition: [{ name: 'Cotton', percent: 98, natural: true }, { name: 'Elastane', percent: 2, natural: false }],
    qualityScore: 75,
    description: 'Heavy cotton denim with a touch of elastane.',
    care: ['Wash 30°C', 'Wash inside out'],
    behavior: 'Classic denim — durable and molds to your body over time. The less you wash, the longer the color lasts.',
  },
  '20': {
    composition: [{ name: 'Cotton', percent: 100, natural: true }],
    qualityScore: 83,
    description: 'Poplin cotton, light and crisp to touch.',
    care: ['Wash 40°C', 'Iron on high heat'],
    behavior: 'Classic shirt fabric, breathable and durable. Requires ironing. Gets softer over time.',
  },
};

const defaultMaterial: MaterialInfo = {
  composition: [{ name: 'Cotton', percent: 70, natural: true }, { name: 'Polyester', percent: 30, natural: false }],
  qualityScore: 68,
  description: 'Cotton-polyester blend, everyday comfort.',
  care: ['Wash 30°C', 'Tumble dry OK'],
  behavior: 'Comfortable and easy to care for. Cotton provides breathability, polyester adds durability and wrinkle resistance.',
};

export function getProductMaterial(productId: string): MaterialInfo {
  return productMaterials[productId] || defaultMaterial;
}

export function getProductReviews(productId: string): Review[] {
  return productReviews.filter(r => r.productId === productId);
}

export function getProductAverageRating(productId: string): { avg: number; count: number } {
  const reviews = getProductReviews(productId);
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return { avg: Math.round(avg * 10) / 10, count: reviews.length };
}

/**
 * Returns products that were reviewed by people with body proportions similar
 * to the current user (bodyMatch >= threshold), ranked by number of similar
 * buyers and average rating. Excludes the current product.
 */
export function getSimilarBodiesBought(
  excludeProductId: string,
  threshold = 75,
  limit = 6,
): Array<{ product: Product; buyersCount: number; avgRating: number }> {
  const grouped = new Map<string, Review[]>();
  for (const r of productReviews) {
    if (r.productId === excludeProductId) continue;
    if (!r.bodyMatch || r.bodyMatch < threshold) continue;
    if (!grouped.has(r.productId)) grouped.set(r.productId, []);
    grouped.get(r.productId)!.push(r);
  }
  const out: Array<{ product: Product; buyersCount: number; avgRating: number }> = [];
  for (const [pid, revs] of grouped) {
    const product = allProducts.find(p => p.id === pid);
    if (!product) continue;
    const avgRating = Math.round((revs.reduce((s, r) => s + r.rating, 0) / revs.length) * 10) / 10;
    out.push({ product, buyersCount: revs.length, avgRating });
  }
  return out
    .sort((a, b) => b.buyersCount - a.buyersCount || b.avgRating - a.avgRating)
    .slice(0, limit);
}

export const brands = [
  { id: 'hm', name: 'H&M' },
  { id: 'mango', name: 'Mango' },
  { id: 'massimo', name: 'Massimo Dutti' },
  { id: 'arket', name: 'Arket' },
  { id: 'stories', name: '& Other Stories' },
  { id: 'reserved', name: 'Reserved' },
  { id: 'sinsay', name: 'Sinsay' },
  { id: 'vinted', name: 'Vinted' },
  { id: 'cos', name: 'COS' },
  { id: 'zara', name: 'Zara' },
];

export const allProducts: Product[] = [
  { id: '1', name: 'Linen Midi Dress', brand: 'H&M', price: 129, fitScore: 94, category: 'dresses', isSecondHand: false, store: 'H&M' },
  { id: '2', name: 'Floral Wrap Dress', brand: 'Mango', price: 139, fitScore: 92, category: 'dresses', isSecondHand: false, store: 'Mango' },
  { id: '3', name: 'Cotton Midi Skirt', brand: 'Arket', price: 89, fitScore: 91, category: 'skirts', isSecondHand: false, store: 'Arket' },
  { id: '4', name: 'Oversized Blazer', brand: 'COS', price: 349, fitScore: 97, category: 'outerwear', isSecondHand: false, store: 'COS' },
  { id: '5', name: 'Silk Camisole', brand: '& Other Stories', price: 189, fitScore: 90, category: 'tops', isSecondHand: false, store: '& Other Stories' },
  { id: '6', name: 'Wide Trousers', brand: 'Zara', price: 179, fitScore: 93, category: 'bottoms', isSecondHand: false, store: 'Zara' },
  { id: '7', name: 'Leather Mules', brand: 'Vinted', price: 85, fitScore: 88, category: 'shoes', isSecondHand: true, store: 'Vinted' },
  { id: '8', name: 'Satin Midi Dress', brand: 'Vinted', price: 65, fitScore: 89, category: 'dresses', isSecondHand: true, store: 'Vinted' },
  { id: '9', name: 'Tailored Vest', brand: 'Massimo Dutti', price: 259, fitScore: 95, category: 'tops', isSecondHand: false, store: 'Massimo Dutti' },
  { id: '10', name: 'Knit Polo Top', brand: 'Reserved', price: 59, fitScore: 86, category: 'tops', isSecondHand: false, store: 'Reserved' },
  { id: '11', name: 'Pleated Maxi Skirt', brand: 'H&M', price: 99, fitScore: 91, category: 'skirts', isSecondHand: false, store: 'H&M' },
  { id: '12', name: 'Boho Print Dress', brand: 'Vinted', price: 45, fitScore: 87, category: 'dresses', isSecondHand: true, store: 'Vinted' },
  { id: '13', name: 'Cropped Cardigan', brand: 'Sinsay', price: 49, fitScore: 83, category: 'tops', isSecondHand: false, store: 'Sinsay' },
  { id: '14', name: 'Linen Blend Blazer', brand: 'Mango', price: 199, fitScore: 93, category: 'outerwear', isSecondHand: false, store: 'Mango' },
  { id: '15', name: 'Ribbed Tank Top', brand: 'Arket', price: 69, fitScore: 90, category: 'tops', isSecondHand: false, store: 'Arket' },
  { id: '16', name: 'A-Line Mini Dress', brand: 'Reserved', price: 79, fitScore: 85, category: 'dresses', isSecondHand: false, store: 'Reserved' },
  { id: '17', name: 'High-Waist Jeans', brand: 'H&M', price: 119, fitScore: 92, category: 'bottoms', isSecondHand: false, store: 'H&M' },
  { id: '18', name: 'Slip Dress', brand: 'Vinted', price: 55, fitScore: 86, category: 'dresses', isSecondHand: true, store: 'Vinted' },
  { id: '19', name: 'Structured Tote Bag', brand: 'Massimo Dutti', price: 299, fitScore: 0, category: 'accessories', isSecondHand: false, store: 'Massimo Dutti' },
  { id: '20', name: 'Cotton Poplin Shirt', brand: '& Other Stories', price: 149, fitScore: 91, category: 'tops', isSecondHand: false, store: '& Other Stories' },
  { id: '21', name: 'Summer Wedding Dress', brand: 'H&M', price: 139, fitScore: 94, category: 'dresses', isSecondHand: false, store: 'H&M' },
  { id: '22', name: 'Garden Party Dress', brand: 'Mango', price: 119, fitScore: 92, category: 'dresses', isSecondHand: false, store: 'Mango' },
  { id: '23', name: 'Flowy Midi Dress', brand: 'Vinted', price: 75, fitScore: 89, category: 'dresses', isSecondHand: true, store: 'Vinted' },
  { id: '24', name: 'Wrap Midi Dress', brand: 'Vinted', price: 60, fitScore: 85, category: 'dresses', isSecondHand: true, store: 'Vinted' },
  { id: '25', name: 'Pastel Midi Dress', brand: 'Reserved', price: 99, fitScore: 88, category: 'dresses', isSecondHand: false, store: 'Reserved' },
  { id: '26', name: 'Eyelet Lace Dress', brand: 'H&M', price: 149, fitScore: 91, category: 'dresses', isSecondHand: false, store: 'H&M' },
  { id: '27', name: 'Tiered Maxi Dress', brand: 'Sinsay', price: 89, fitScore: 79, category: 'dresses', isSecondHand: false, store: 'Sinsay' },
  { id: '28', name: 'Boho Wrap Dress', brand: 'Vinted', price: 50, fitScore: 86, category: 'dresses', isSecondHand: true, store: 'Vinted' },
  { id: '29', name: 'Smocked Midi Dress', brand: 'Mango', price: 129, fitScore: 90, category: 'dresses', isSecondHand: false, store: 'Mango' },
  { id: '30', name: 'Ruffle Hem Dress', brand: 'Vinted', price: 42, fitScore: 82, category: 'dresses', isSecondHand: true, store: 'Vinted' },
];

export const weddingProducts = allProducts.filter(p => p.category === 'dresses' && p.price <= 150).sort((a, b) => b.fitScore - a.fitScore);

export const vintedOnlyProducts = weddingProducts.filter(p => p.isSecondHand);

export const bohoProducts: Product[] = [
  { id: 'b1', name: 'Boho Maxi Dress', brand: 'Mango', price: 159, fitScore: 93, category: 'dresses', isSecondHand: false, store: 'Mango' },
  { id: 'b2', name: 'Embroidered Tunic', brand: 'Vinted', price: 45, fitScore: 88, category: 'dresses', isSecondHand: true, store: 'Vinted' },
  { id: 'b3', name: 'Crochet Midi Dress', brand: 'H&M', price: 119, fitScore: 91, category: 'dresses', isSecondHand: false, store: 'H&M' },
  { id: 'b4', name: 'Floral Peasant Dress', brand: 'Vinted', price: 55, fitScore: 87, category: 'dresses', isSecondHand: true, store: 'Vinted' },
  { id: 'b5', name: 'Tiered Boho Dress', brand: 'Reserved', price: 109, fitScore: 85, category: 'dresses', isSecondHand: false, store: 'Reserved' },
  { id: 'b6', name: 'Printed Wrap Dress', brand: 'Mango', price: 139, fitScore: 90, category: 'dresses', isSecondHand: false, store: 'Mango' },
];

export const defaultProfile: UserProfile = {
  name: 'Kasia',
  bodyShape: 'Hourglass',
  height: 165,
  aesthetics: ['Minimalist', 'Classic', 'Tailored'],
  fitPrefs: ['Fitted', 'Relaxed'],
  occasions: ['Everyday', 'Office', 'Going Out'],
  budgetMin: 100,
  budgetMax: 300,
  brands: ['COS', 'Mango', 'Arket'],
};

/**
 * The hand-picked shapes, for someone with no tape measure.
 *
 * `descriptionKey` rather than prose, for two reasons. The prose was English
 * in a Polish interface, and it broke the product's own language rule: it told
 * women what "works beautifully" on them, what "creates beautiful balance" and
 * which necklines were "your best friend". Paula does not rate bodies and does
 * not prescribe — she describes a proportion and says where a cut is likely to
 * pull. That is a licence condition (OpenRAIL-M Attachment A, pt. 8), not only
 * a matter of voice.
 */
export const bodyShapes = [
  { id: 'hourglass', name: 'Hourglass', descriptionKey: 'shapePickHourglass' },
  { id: 'pear', name: 'Pear', descriptionKey: 'shapePickPear' },
  { id: 'rectangle', name: 'Rectangle', descriptionKey: 'shapePickRectangle' },
  { id: 'inverted-triangle', name: 'Inverted Triangle', descriptionKey: 'shapePickInvertedTriangle' },
  { id: 'apple', name: 'Apple', descriptionKey: 'shapePickApple' },
] as const;

export const aestheticOptions = [
  { id: 'minimalist', name: 'Minimalist', color: '#e8e5e0' },
  { id: 'romantic', name: 'Romantic', color: '#f0e0e0' },
  { id: 'tailored', name: 'Structured / Tailored', color: '#d5d5d5' },
  { id: 'streetwear', name: 'Streetwear', color: '#2a2a2a' },
  { id: 'bohemian', name: 'Bohemian', color: '#d9c9a8' },
  { id: 'classic', name: 'Classic', color: '#c8c8c8' },
  { id: 'oversized', name: 'Oversized / Relaxed', color: '#e0ddd5' },
];

export const occasionOptions = [
  'Everyday / Casual', 'Office', 'Going Out', 'Special Occasions', 'Sport / Active', 'Travel'
];

export const fitOptions = [
  { id: 'fitted', label: 'Fitted' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'oversized', label: 'Oversized' },
  { id: 'depends', label: 'It depends on the piece' },
];

export const sampleCollections: Collection[] = [
  { id: '1', name: 'Fall faves', items: allProducts.slice(0, 6), emoji: '🍂' },
  { id: '2', name: 'Winter layers', items: allProducts.slice(3, 8), emoji: '❄️' },
  { id: '3', name: 'Going out', items: allProducts.slice(5, 10), emoji: '✨' },
  { id: '4', name: 'Holiday wishlist', items: allProducts.slice(0, 12), emoji: '🎄' },
];

export const chatStates: ChatMessage[][] = [
  // State 0 - greeting (empty, greeting shown as header)
  [],
  // State 1 - user searches, Paula asks about occasion type with detailed chips
  [
    { id: 'u1', sender: 'user', text: "Summer wedding dress, max 150 PLN" },
    { id: 'p1', sender: 'paula', text: "Great! Tell me more about the wedding — I'll help match the style to the occasion.", chips: ['Garden / outdoor wedding', 'Church, elegant', 'Banquet hall', 'Beach wedding', 'Rustic wedding', 'Civil / intimate ceremony'] },
  ],
  // State 2 - user picks garden, Paula asks about length + style details
  [
    { id: 'u1', sender: 'user', text: "Summer wedding dress, max 150 PLN" },
    { id: 'p1', sender: 'paula', text: "Great! Tell me more about the wedding — I'll help match the style to the occasion." },
    { id: 'u2', sender: 'user', text: "Garden / outdoor wedding" },
    { id: 'p2', sender: 'paula', text: "A garden — lovely! What length do you prefer? With your proportions, midi and maxi would work well.", chips: ['Midi (knee-length)', 'Maxi (ankle-length)', 'Mini', 'Asymmetric', 'No preference'] },
  ],
  // State 3 - user picks midi, Paula asks about color/pattern preferences
  [
    { id: 'u1', sender: 'user', text: "Summer wedding dress, max 150 PLN" },
    { id: 'p1', sender: 'paula', text: "Great! Tell me more about the wedding — I'll help match the style to the occasion." },
    { id: 'u2', sender: 'user', text: "Garden / outdoor wedding" },
    { id: 'p2', sender: 'paula', text: "A garden — lovely! What length do you prefer? With your proportions, midi and maxi would work well." },
    { id: 'u3', sender: 'user', text: "Midi (knee-length)" },
    { id: 'p3', sender: 'paula', text: "What colors or patterns are you drawn to?", chips: ['Floral', 'Pastels', 'Solid color', 'Satin / shimmer', 'Something bold', "I'll show you options"] },
  ],
  // State 4 - user picks floral, results appear
  [
    { id: 'u1', sender: 'user', text: "Summer wedding dress, max 150 PLN" },
    { id: 'p1', sender: 'paula', text: "Great! Tell me more about the wedding — I'll help match the style to the occasion." },
    { id: 'u2', sender: 'user', text: "Garden / outdoor wedding" },
    { id: 'p2', sender: 'paula', text: "A garden — lovely! What length do you prefer? With your proportions, midi and maxi would work well." },
    { id: 'u3', sender: 'user', text: "Midi (knee-length)" },
    { id: 'p3', sender: 'paula', text: "What colors or patterns are you drawn to?" },
    { id: 'u4', sender: 'user', text: "Floral" },
    { id: 'p4', sender: 'paula', text: `I found ${weddingProducts.length} options that match your body and the occasion. Want to narrow it down?`, chips: ['New only', 'Second-hand only', 'Free shipping', 'Show all'] },
  ],
  // State 5 - user filters second hand
  [
    { id: 'u1', sender: 'user', text: "Summer wedding dress, max 150 PLN" },
    { id: 'p1', sender: 'paula', text: "Great! Tell me more about the wedding — I'll help match the style to the occasion." },
    { id: 'u2', sender: 'user', text: "Garden / outdoor wedding" },
    { id: 'p2', sender: 'paula', text: "A garden — lovely! What length do you prefer? With your proportions, midi and maxi would work well." },
    { id: 'u3', sender: 'user', text: "Midi (knee-length)" },
    { id: 'p3', sender: 'paula', text: "What colors or patterns are you drawn to?" },
    { id: 'u4', sender: 'user', text: "Floral" },
    { id: 'p4', sender: 'paula', text: `I found ${weddingProducts.length} options that match your body and the occasion. Want to narrow it down?` },
    { id: 'u5', sender: 'user', text: "Second-hand only" },
    { id: 'p5', sender: 'paula', text: `Filtering to second-hand — ${vintedOnlyProducts.length} items from Vinted. I can also search other platforms.`, chips: ['Show OLX too', 'Vinted only', 'Back to all'] },
  ],
  // State 6 - user uploads photo
  [
    { id: 'u1', sender: 'user', text: "Summer wedding dress, max 150 PLN" },
    { id: 'p1', sender: 'paula', text: "Great! Tell me more about the wedding — I'll help match the style to the occasion." },
    { id: 'u2', sender: 'user', text: "Garden / outdoor wedding" },
    { id: 'p2', sender: 'paula', text: "A garden — lovely! What length do you prefer? With your proportions, midi and maxi would work well." },
    { id: 'u3', sender: 'user', text: "Midi (knee-length)" },
    { id: 'p3', sender: 'paula', text: "What colors or patterns are you drawn to?" },
    { id: 'u4', sender: 'user', text: "Floral" },
    { id: 'p4', sender: 'paula', text: `I found ${weddingProducts.length} options that match your body and the occasion. Want to narrow it down?` },
    { id: 'u5', sender: 'user', text: "Second-hand only" },
    { id: 'p5', sender: 'paula', text: `Filtering to second-hand — ${vintedOnlyProducts.length} items from Vinted.` },
    { id: 'u6', sender: 'user', text: "Looking for something similar", photoUploaded: true },
    { id: 'p6', sender: 'paula', text: "I see a boho-style dress with a floral pattern — searching for similar ones that match your proportions.", chips: ['Exactly this pattern', 'Similar cut, different color', 'Show more boho', 'Change style'] },
  ],
];
