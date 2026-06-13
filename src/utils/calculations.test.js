import { describe, expect, it } from 'vitest';
import { calculateCart, calculateLine, PRICING_MODES, validateSellableLine } from './calculations.js';

const rice = {
  id: 'rice-1',
  name: 'Rice',
  retailUnit: 'ပိဿာ',
  wholesaleUnit: 'အိတ်',
  conversionFactor: 24,
  wholesaleThreshold: 24,
  retailPrice: 4000,
  wholesalePrice: 90000,
  stockInBaseUnit: 50
};

describe('cart calculations', () => {
  it('applies retail pricing below wholesale threshold', () => {
    const line = calculateLine({
      product: rice,
      qtyWholesaleUnit: 0,
      qtyRetailUnit: 2,
      qtyKyattha: 50,
      customAmount: '',
      pricingMode: PRICING_MODES.AUTO
    });

    expect(line.totalBaseQty).toBe(2.5);
    expect(line.pricePerBaseUnit).toBe(4000);
    expect(line.subtotal).toBe(10000);
    expect(line.isWholesalePriceApplied).toBe(false);
  });

  it('applies wholesale pricing at threshold', () => {
    const line = calculateLine({
      product: rice,
      qtyWholesaleUnit: 1,
      qtyRetailUnit: 0,
      qtyKyattha: 0,
      customAmount: '',
      pricingMode: PRICING_MODES.AUTO
    });

    expect(line.totalBaseQty).toBe(24);
    expect(line.pricePerBaseUnit).toBe(3750);
    expect(line.subtotal).toBe(90000);
    expect(line.isWholesalePriceApplied).toBe(true);
  });

  it('totals cart lines and blocks overselling', () => {
    const cart = [
      {
        product: { ...rice, stockInBaseUnit: 1 },
        qtyWholesaleUnit: 0,
        qtyRetailUnit: 2,
        qtyKyattha: 0,
        customAmount: '',
        pricingMode: PRICING_MODES.AUTO
      }
    ];

    const summary = calculateCart(cart);
    expect(summary.totalAmount).toBe(8000);
    expect(validateSellableLine(summary.lines[0])).toContain('စတော့ခ်မလောက်ပါ');
  });
});
