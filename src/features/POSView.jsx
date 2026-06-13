import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Banknote,
  CreditCard,
  Minus,
  Package,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { checkoutSale } from '../services/firestoreService.js';
import { useBusinessStore } from '../store/businessStore.js';
import { calculateCart, calculateLine, createCartItem, PRICING_MODES } from '../utils/calculations.js';
import { money, quantity } from '../utils/format.js';
import { EmptyState } from '../components/EmptyState.jsx';

export function POSView() {
  const { notify } = useOutletContext();
  const { user, storeId } = useAuth();
  const products = useBusinessStore((state) => state.products);
  const dataStatus = useBusinessStore((state) => state.dataStatus);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payment, setPayment] = useState({ method: 'Cash', transactionId: '', note: '' });

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map((item) => item.category || 'အခြား'))).sort()],
    [products]
  );
  const activeProducts = useMemo(() => products.filter((product) => product.isActive !== false), [products]);
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return activeProducts.filter((product) => {
      const matchesCategory = category === 'all' || product.category === category;
      const haystack = `${product.name} ${product.sku || ''} ${product.barcode || ''} ${product.brand || ''}`.toLowerCase();
      return matchesCategory && (!term || haystack.includes(term));
    });
  }, [activeProducts, category, searchTerm]);
  const resolvedCart = useMemo(
    () => cart.map((item) => ({ ...item, product: productMap.get(item.product.id) || item.product })),
    [cart, productMap]
  );
  const totals = useMemo(() => calculateCart(resolvedCart), [resolvedCart]);

  const addToCart = (product) => {
    if (product.stockInBaseUnit <= 0) {
      notify(`${product.name} စတော့ခ်မရှိပါ။`, 'warning');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, qtyRetailUnit: Number(item.qtyRetailUnit || 0) + 1 }
            : item
        );
      }
      return [...prev, createCartItem(product)];
    });
    setCartOpen(true);
  };

  const updateItem = (productId, field, value) => {
    setCart((prev) =>
      prev
        .map((item) => (item.product.id === productId ? { ...item, [field]: value } : item))
        .filter((item) => {
          const line = calculateLine(item);
          return line.totalBaseQty > 0 || line.customAmount > 0;
        })
    );
  };

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const submitCheckout = async () => {
    setProcessing(true);
    try {
      const sale = await checkoutSale(storeId, user, resolvedCart, payment);
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setPayment({ method: 'Cash', transactionId: '', note: '' });
      notify(`${sale.invoiceNumber} အတွက် ${money(sale.totalAmount)} ရှင်းပြီးပါပြီ။`);
    } catch (error) {
      notify(error.message || 'ငွေရှင်းရာတွင် အမှားဖြစ်သွားပါသည်။', 'danger');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid h-full min-h-0 bg-slate-50 lg:grid-cols-[minmax(0,1fr)_440px]">
      <section className="flex min-h-0 flex-col">
        <div className="no-print border-b border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input-control pl-10 text-base"
                placeholder="ပစ္စည်းအမည်, SKU, Barcode ရှာရန်"
              />
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="input-control xl:w-56"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === 'all' ? 'အမျိုးအစားအားလုံး' : item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {dataStatus === 'loading' && !products.length ? (
            <EmptyState icon={Package} title="ဒေတာ ရယူနေပါသည်" />
          ) : !products.length ? (
            <EmptyState
              icon={Package}
              title="ပစ္စည်းများ မရှိသေးပါ"
              body="Admin အကောင့်ဖြင့် ပစ္စည်းစာရင်းထဲတွင် စတော့ခ်များ ထည့်သွင်းပါ။"
            />
          ) : filteredProducts.length === 0 ? (
            <EmptyState icon={Search} title="ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်းမရှိပါ" />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredProducts.map((product) => (
                <ProductButton key={product.id} product={product} onClick={() => addToCart(product)} />
              ))}
            </div>
          )}
        </div>

        <div className="no-print border-t border-slate-200 bg-white p-3 lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-md bg-green-700 px-4 py-3 text-sm font-bold text-white"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {totals.itemCount} မျိုး
            </span>
            <span>{money(totals.totalAmount)}</span>
          </button>
        </div>
      </section>

      <CartPanel
        cart={resolvedCart}
        totals={totals}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onUpdate={updateItem}
        onRemove={removeItem}
        onCheckout={() => setCheckoutOpen(true)}
      />

      {checkoutOpen && (
        <CheckoutDialog
          totals={totals}
          payment={payment}
          setPayment={setPayment}
          processing={processing}
          onCancel={() => setCheckoutOpen(false)}
          onSubmit={submitCheckout}
        />
      )}
    </div>
  );
}

function ProductButton({ product, onClick }) {
  const lowStock = product.stockInBaseUnit <= product.minStockLevel;
  const out = product.stockInBaseUnit <= 0;
  return (
    <button
      type="button"
      disabled={out}
      onClick={onClick}
      className="flex min-h-36 flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-green-300 hover:shadow-md disabled:opacity-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-green-50 text-lg font-extrabold text-green-700">
          {product.name.charAt(0)}
        </div>
        <span
          className={`rounded px-2 py-1 text-[11px] font-bold ${
            out ? 'bg-red-100 text-red-700' : lowStock ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {quantity(product.stockInBaseUnit)} {product.retailUnit}
        </span>
      </div>
      <div>
        <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-900">{product.name}</h3>
        <p className="mt-1 truncate text-xs text-slate-500">{product.category} · {product.brand}</p>
      </div>
      <div className="mt-3 space-y-1 text-xs">
        <p className="font-bold text-green-700">{money(product.retailPrice)} / {product.retailUnit}</p>
        <p className="font-semibold text-blue-700">{money(product.wholesalePrice)} / {product.wholesaleUnit}</p>
      </div>
    </button>
  );
}

function CartPanel({ cart, totals, open, onClose, onUpdate, onRemove, onCheckout }) {
  return (
    <aside
      className={[
        'fixed inset-y-0 right-0 z-40 flex w-full max-w-[460px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform lg:relative lg:z-auto lg:max-w-none lg:translate-x-0 lg:shadow-none',
        open ? 'translate-x-0' : 'translate-x-full'
      ].join(' ')}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <ReceiptText className="h-5 w-5 text-green-700" />
          ဘေလ်စာရင်း
        </h2>
        <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-slate-200 lg:hidden" title="Close">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <ShoppingCart className="mb-2 h-12 w-12" />
            <p className="text-sm font-semibold">ဘေလ်ထဲတွင် ပစ္စည်းမရှိသေးပါ</p>
          </div>
        ) : (
          cart.map((item) => (
            <CartLine key={item.product.id} item={item} onUpdate={onUpdate} onRemove={onRemove} />
          ))
        )}
      </div>

      <div className="border-t border-slate-200 bg-white p-4">
        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-slate-100 p-3">
            <p className="text-xs font-semibold text-slate-500">အမျိုးအစား</p>
            <p className="text-lg font-extrabold text-slate-900">{totals.itemCount}</p>
          </div>
          <div className="rounded-md bg-green-50 p-3 text-right">
            <p className="text-xs font-semibold text-green-700">ကျသင့်ငွေ</p>
            <p className="text-lg font-extrabold text-green-800">{money(totals.totalAmount)}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={cart.length === 0}
          onClick={onCheckout}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
        >
          <Banknote className="h-5 w-5" />
          ငွေရှင်းမည်
        </button>
      </div>
    </aside>
  );
}

function CartLine({ item, onUpdate, onRemove }) {
  const line = calculateLine(item);
  const product = line.product;
  const customMode = line.customAmount > 0;
  const wholesaleApplied = line.isWholesalePriceApplied;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-900">{product.name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            လက်ကျန် {quantity(product.stockInBaseUnit)} {product.retailUnit}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          className="rounded-md p-2 text-red-600 hover:bg-red-50"
          title="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`rounded px-2 py-1 text-[11px] font-bold ${wholesaleApplied ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
          {customMode ? 'ငွေပမာဏဖြင့်' : wholesaleApplied ? 'လက်ကားဈေး' : 'လက်လီဈေး'}
        </span>
        <select
          value={item.pricingMode}
          onChange={(event) => onUpdate(product.id, 'pricingMode', event.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
          disabled={customMode}
        >
          <option value={PRICING_MODES.AUTO}>Auto</option>
          <option value={PRICING_MODES.FORCE_RETAIL}>Retail</option>
          <option value={PRICING_MODES.FORCE_WHOLESALE}>Wholesale</option>
        </select>
      </div>

      <div className={`mt-3 grid gap-2 ${product.retailUnit === 'ပိဿာ' ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Stepper
          label={product.wholesaleUnit}
          value={item.qtyWholesaleUnit}
          disabled={customMode}
          onChange={(value) => onUpdate(product.id, 'qtyWholesaleUnit', value)}
        />
        <Stepper
          label={product.retailUnit}
          value={item.qtyRetailUnit}
          disabled={customMode}
          onChange={(value) => onUpdate(product.id, 'qtyRetailUnit', value)}
        />
        {product.retailUnit === 'ပိဿာ' && (
          <Stepper
            label="ကျပ်သား"
            value={item.qtyKyattha}
            disabled={customMode}
            onChange={(value) => onUpdate(product.id, 'qtyKyattha', value)}
          />
        )}
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-semibold text-slate-500">ငွေပမာဏဖြင့်ရောင်းရန်</span>
        <input
          type="number"
          min="0"
          value={item.customAmount}
          onChange={(event) => onUpdate(product.id, 'customAmount', event.target.value)}
          className="input-control py-2 text-sm"
          placeholder="ဥပမာ 1000"
        />
      </label>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
        <span className="text-slate-500">
          {quantity(line.totalBaseQty)} {product.retailUnit}
        </span>
        <span className="text-base font-extrabold text-slate-900">{money(line.subtotal)}</span>
      </div>
    </div>
  );
}

function Stepper({ label, value, disabled, onChange }) {
  const nextValue = Number(value || 0);
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
      <span className="flex h-9 overflow-hidden rounded-md border border-slate-300 bg-white">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(Math.max(0, nextValue - 1))}
          className="flex w-8 items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          title="Decrease"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          min="0"
          step="0.01"
          disabled={disabled}
          value={nextValue === 0 ? '' : value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 border-x border-slate-300 text-center text-sm font-bold outline-none disabled:bg-slate-100"
          placeholder="0"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(nextValue + 1)}
          className="flex w-8 items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          title="Increase"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </span>
    </label>
  );
}

function CheckoutDialog({ totals, payment, setPayment, processing, onCancel, onSubmit }) {
  const methods = ['Cash', 'KPay', 'WavePay', 'Bank Transfer'];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <CreditCard className="h-5 w-5 text-green-700" />
            Checkout
          </h2>
          <button type="button" onClick={onCancel} className="rounded-md p-2 hover:bg-slate-100" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-lg bg-green-50 p-4 text-right">
            <p className="text-sm font-semibold text-green-700">စုစုပေါင်း</p>
            <p className="text-3xl font-extrabold text-green-900">{money(totals.totalAmount)}</p>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">ငွေချေမှုနည်းလမ်း</span>
            <select
              value={payment.method}
              onChange={(event) => setPayment((prev) => ({ ...prev, method: event.target.value }))}
              className="input-control"
            >
              {methods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Transaction ID</span>
            <input
              type="text"
              value={payment.transactionId}
              onChange={(event) => setPayment((prev) => ({ ...prev, transactionId: event.target.value }))}
              className="input-control"
              placeholder="optional"
            />
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-md border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              ပယ်ဖျက်မည်
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={onSubmit}
              className="flex-1 rounded-md bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60"
            >
              {processing ? 'လုပ်ဆောင်နေသည်...' : 'အတည်ပြုမည်'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
