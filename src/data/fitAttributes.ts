import type { FitAttributes } from '@/lib/fit/attributes';

/**
 * TEMPORARY SCAFFOLDING — hand-tagged fit attributes for the mock catalog.
 *
 * Every value here was guessed from the product name by a human, which is why
 * confidence is 0.6 and not higher. This table exists only so the Fit Score
 * engine has something to chew on before the real catalog and its enrichment
 * layer arrive (build order step 1). When that lands, delete this file.
 *
 * Products missing from this table (shoes, bags) get no Fit Score on purpose.
 * Stretch is left out wherever the material composition already answers it;
 * it is set by hand only where the composition is misleading (knits with no
 * elastane listed).
 */
const a = <T,>(value: T, confidence = 0.6) => ({ value, confidence });

export const productFitAttributes: Record<string, FitAttributes> = {
  // 1 Linen Midi Dress
  '1': { silhouette: a('straight'), waistDefinition: a('natural'), lengthClass: a('midi'), sleeveLength: a('sleeveless'), neckline: a('square') },
  // 2 Floral Wrap Dress
  '2': { silhouette: a('wrap'), waistDefinition: a('natural'), lengthClass: a('midi'), sleeveLength: a('short'), neckline: a('v'), closureType: a('wrap-tie') },
  // 3 Cotton Midi Skirt
  '3': { silhouette: a('a-line'), waistDefinition: a('natural'), rise: a('high'), lengthClass: a('midi'), closureType: a('zip') },
  // 4 Oversized Blazer
  '4': { silhouette: a('oversized'), waistDefinition: a('none'), sleeveLength: a('long'), closureType: a('buttons') },
  // 5 Silk Camisole
  '5': { silhouette: a('straight'), waistDefinition: a('none'), sleeveLength: a('sleeveless'), neckline: a('v') },
  // 6 Wide Trousers
  '6': { silhouette: a('flared'), rise: a('high'), lengthClass: a('full'), closureType: a('zip') },
  // 8 Satin Midi Dress
  '8': { silhouette: a('straight'), waistDefinition: a('none'), lengthClass: a('midi'), sleeveLength: a('sleeveless'), neckline: a('v') },
  // 9 Tailored Vest
  '9': { silhouette: a('fitted'), waistDefinition: a('natural'), sleeveLength: a('sleeveless'), neckline: a('v'), closureType: a('buttons') },
  // 10 Knit Polo Top — composition says cotton/poly, but a knit polo stretches
  '10': { silhouette: a('fitted'), waistDefinition: a('none'), sleeveLength: a('short'), closureType: a('buttons'), stretchLevel: a('low', 0.7) },
  // 11 Pleated Maxi Skirt
  '11': { silhouette: a('flared'), waistDefinition: a('high'), rise: a('high'), lengthClass: a('maxi'), closureType: a('zip') },
  // 12 Boho Print Dress
  '12': { silhouette: a('empire'), waistDefinition: a('high'), lengthClass: a('maxi'), sleeveLength: a('long'), neckline: a('v') },
  // 13 Cropped Cardigan — acrylic knit
  '13': { silhouette: a('fitted'), waistDefinition: a('none'), lengthClass: a('cropped'), sleeveLength: a('long'), closureType: a('buttons'), stretchLevel: a('low', 0.7) },
  // 14 Linen Blend Blazer
  '14': { silhouette: a('straight'), waistDefinition: a('none'), sleeveLength: a('long'), closureType: a('buttons') },
  // 15 Ribbed Tank Top — 5% elastane in the composition, stretch comes from there
  '15': { silhouette: a('fitted'), waistDefinition: a('none'), sleeveLength: a('sleeveless'), neckline: a('scoop') },
  // 16 A-Line Mini Dress
  '16': { silhouette: a('a-line'), waistDefinition: a('natural'), lengthClass: a('mini'), sleeveLength: a('short'), neckline: a('crew'), closureType: a('zip') },
  // 17 High-Waist Jeans — 2% elastane in the composition
  '17': { silhouette: a('fitted'), rise: a('high'), lengthClass: a('full'), closureType: a('zip') },
  // 18 Slip Dress
  '18': { silhouette: a('straight'), waistDefinition: a('none'), lengthClass: a('midi'), sleeveLength: a('sleeveless'), neckline: a('v') },
  // 20 Cotton Poplin Shirt
  '20': { silhouette: a('straight'), waistDefinition: a('none'), sleeveLength: a('long'), closureType: a('buttons') },
  // 21 Summer Wedding Dress
  '21': { silhouette: a('a-line'), waistDefinition: a('natural'), lengthClass: a('midi'), sleeveLength: a('sleeveless'), neckline: a('v'), closureType: a('zip') },
  // 22 Garden Party Dress
  '22': { silhouette: a('flared'), waistDefinition: a('natural'), lengthClass: a('midi'), sleeveLength: a('short'), neckline: a('square'), closureType: a('zip') },
  // 23 Flowy Midi Dress
  '23': { silhouette: a('flared'), waistDefinition: a('none'), lengthClass: a('midi'), sleeveLength: a('three-quarter'), neckline: a('v') },
  // 24 Wrap Midi Dress
  '24': { silhouette: a('wrap'), waistDefinition: a('natural'), lengthClass: a('midi'), sleeveLength: a('short'), neckline: a('v'), closureType: a('wrap-tie') },
  // 25 Pastel Midi Dress
  '25': { silhouette: a('straight'), waistDefinition: a('natural'), lengthClass: a('midi'), sleeveLength: a('short'), neckline: a('crew'), closureType: a('zip') },
  // 26 Eyelet Lace Dress
  '26': { silhouette: a('a-line'), waistDefinition: a('natural'), lengthClass: a('midi'), sleeveLength: a('short'), neckline: a('square'), closureType: a('zip') },
  // 27 Tiered Maxi Dress
  '27': { silhouette: a('flared'), waistDefinition: a('none'), lengthClass: a('maxi'), sleeveLength: a('sleeveless'), neckline: a('v') },
  // 28 Boho Wrap Dress
  '28': { silhouette: a('wrap'), waistDefinition: a('natural'), lengthClass: a('maxi'), sleeveLength: a('long'), neckline: a('v'), closureType: a('wrap-tie') },
  // 29 Smocked Midi Dress — smocked bodice stretches
  '29': { silhouette: a('fitted'), waistDefinition: a('elasticated'), lengthClass: a('midi'), sleeveLength: a('short'), neckline: a('square'), stretchLevel: a('low', 0.7) },
  // 30 Ruffle Hem Dress
  '30': { silhouette: a('a-line'), waistDefinition: a('natural'), lengthClass: a('mini'), sleeveLength: a('short'), neckline: a('v'), closureType: a('zip') },

  // Boho search results (bohoProducts)
  'b1': { silhouette: a('flared'), waistDefinition: a('none'), lengthClass: a('maxi'), sleeveLength: a('long'), neckline: a('v') },
  'b2': { silhouette: a('oversized'), waistDefinition: a('none'), lengthClass: a('midi'), sleeveLength: a('three-quarter'), neckline: a('v') },
  'b3': { silhouette: a('fitted'), waistDefinition: a('none'), lengthClass: a('midi'), sleeveLength: a('sleeveless'), neckline: a('scoop'), stretchLevel: a('low', 0.7) },
  'b4': { silhouette: a('flared'), waistDefinition: a('elasticated'), lengthClass: a('midi'), sleeveLength: a('short'), neckline: a('off-shoulder') },
  'b5': { silhouette: a('flared'), waistDefinition: a('none'), lengthClass: a('maxi'), sleeveLength: a('sleeveless'), neckline: a('v') },
  'b6': { silhouette: a('wrap'), waistDefinition: a('natural'), lengthClass: a('midi'), sleeveLength: a('long'), neckline: a('v'), closureType: a('wrap-tie') },
};
