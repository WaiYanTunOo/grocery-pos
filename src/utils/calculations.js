const KYATTHA_PER_VISS = 100;

export const PRICING_MODES = {
  AUTO: 'AUTO',
  FORCE_RETAIL: 'FORCE_RETAIL',
  FORCE_WHOLESALE: 'FORCE_WHOLESALE'
};

export function toNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function normalizeProduct(product = {}) {
  const conversionFactor = Math.max(toNumber(product.conversionFactor, 1), 1);
  const retailPrice = Math.max(toNumber(product.retailPrice, 0), 0);
  const wholesalePrice = Math.max(toNumber(product.wholesalePrice, 0), 0);

  return {
    ...product,
    category: product.category || 'အခြား',
    brand: product.brand || '-',
    supplierName: product.supplierName || '-',
    retailUnit: product.retailUnit || 'ပိဿာ',
    wholesaleUnit: product.wholesaleUnit || 'အိတ်',
    conversionFactor,
    wholesaleThreshold: Math.max(toNumber(product.wholesaleThreshold, conversionFactor), 0),
    retailPrice,
    wholesalePrice: wholesalePrice || retailPrice * conversionFactor,
    stockInBaseUnit: Math.max(toNumber(product.stockInBaseUnit, 0), 0),
    minStockLevel: Math.max(toNumber(product.minStockLevel, 0), 0),
    isActive: product.isActive !== false
  };
}

export function createCartItem(product) {
  return {
    product: normalizeProduct(product),
    qtyWholesaleUnit: 0,
    qtyRetailUnit: 1,
    qtyKyattha: 0,
    customAmount: '',
    pricingMode: PRICING_MODES.AUTO
  };
}

export function calculateLine(item, productOverride) {
  const product = normalizeProduct(productOverride || item.product);
  const qtyWholesaleUnit = Math.max(toNumber(item.qtyWholesaleUnit, 0), 0);
  const qtyRetailUnit = Math.max(toNumber(item.qtyRetailUnit, 0), 0);
  const qtyKyattha = Math.max(toNumber(item.qtyKyattha, 0), 0);
  const customAmount = Math.max(toNumber(item.customAmount, 0), 0);

  if (customAmount > 0) {
    const totalBaseQty = product.retailPrice > 0 ? customAmount / product.retailPrice : 0;
    return {
      product,
      qtyWholesaleUnit,
      qtyRetailUnit: 0,
      qtyKyattha: 0,
      customAmount,
      totalBaseQty,
      pricePerBaseUnit: product.retailPrice,
      subtotal: customAmount,
      isWholesalePriceApplied: false,
      pricingMode: 'CUSTOM'
    };
  }

  const kyatthaInBaseUnit = product.retailUnit === 'ပိဿာ' ? qtyKyattha / KYATTHA_PER_VISS : 0;
  const totalBaseQty =
    qtyWholesaleUnit * product.conversionFactor + qtyRetailUnit + kyatthaInBaseUnit;

  const forcedWholesale = item.pricingMode === PRICING_MODES.FORCE_WHOLESALE;
  const forcedRetail = item.pricingMode === PRICING_MODES.FORCE_RETAIL;
  const automaticWholesale =
    item.pricingMode === PRICING_MODES.AUTO && totalBaseQty >= product.wholesaleThreshold;
  const isWholesalePriceApplied = forcedWholesale || (!forcedRetail && automaticWholesale);
  const wholesaleUnitPrice = product.wholesalePrice / product.conversionFactor;
  const pricePerBaseUnit = isWholesalePriceApplied ? wholesaleUnitPrice : product.retailPrice;

  return {
    product,
    qtyWholesaleUnit,
    qtyRetailUnit,
    qtyKyattha,
    customAmount: 0,
    totalBaseQty,
    pricePerBaseUnit,
    subtotal: totalBaseQty * pricePerBaseUnit,
    isWholesalePriceApplied,
    pricingMode: item.pricingMode || PRICING_MODES.AUTO
  };
}

export function calculateCart(cart) {
  const lines = cart.map((item) => calculateLine(item));
  const totalQty = lines.reduce((sum, line) => sum + line.totalBaseQty, 0);
  const totalAmount = lines.reduce((sum, line) => sum + line.subtotal, 0);
  return {
    lines,
    totalQty,
    totalAmount,
    itemCount: cart.length
  };
}

export function validateSellableLine(line) {
  if (!line.product.id) return 'Product ID မရှိသောပစ္စည်း ပါနေပါသည်။';
  if (line.totalBaseQty <= 0) return `${line.product.name} အရေအတွက် ထည့်ရန်လိုပါသည်။`;
  if (line.subtotal <= 0) return `${line.product.name} ဈေးနှုန်း မှန်ကန်မှု စစ်ပါ။`;
  if (line.product.stockInBaseUnit < line.totalBaseQty) {
    return `${line.product.name} စတော့ခ်မလောက်ပါ။ လက်ကျန် ${line.product.stockInBaseUnit} ${line.product.retailUnit}`;
  }
  return null;
}
