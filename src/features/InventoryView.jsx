import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, Edit3, PackagePlus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { removeProduct, upsertProduct } from '../services/firestoreService.js';
import { useBusinessStore } from '../store/businessStore.js';
import { normalizeProduct } from '../utils/calculations.js';
import { money, quantity } from '../utils/format.js';
import { EmptyState } from '../components/EmptyState.jsx';

const initialForm = {
  name: '',
  sku: '',
  barcode: '',
  category: '',
  brand: '',
  retailUnit: 'ပိဿာ',
  retailPrice: '',
  wholesaleUnit: 'အိတ်',
  wholesalePrice: '',
  conversionFactor: '30',
  wholesaleThreshold: '10',
  stockInBaseUnit: '',
  minStockLevel: '10',
  supplierName: '',
  expiryDate: '',
  isActive: true
};

export function InventoryView() {
  const outletContext = useOutletContext() || {};
  const notify = outletContext.notify || (() => {});
  const { user, storeId } = useAuth();
  const products = useBusinessStore((state) => state.products);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(products.map((item) => item.category || 'အခြား'))).sort(),
    [products]
  );
  const lowStock = useMemo(
    () => products.filter((product) => product.stockInBaseUnit <= product.minStockLevel),
    [products]
  );
  const expiringSoon = useMemo(() => {
    const now = new Date();
    const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return products.filter((product) => {
      if (!product.expiryDate) return false;
      const expiry = new Date(product.expiryDate);
      return expiry >= now && expiry <= inThirtyDays;
    });
  }, [products]);
  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const haystack = `${product.name} ${product.sku || ''} ${product.barcode || ''} ${product.category || ''} ${product.brand || ''}`.toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'low' && product.stockInBaseUnit <= product.minStockLevel) ||
        (filter === 'inactive' && product.isActive === false) ||
        product.category === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, products, searchTerm]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const editProduct = (product) => {
    const normalized = normalizeProduct(product);
    setEditingId(product.id);
    setForm({
      name: normalized.name || '',
      sku: normalized.sku || '',
      barcode: normalized.barcode || '',
      category: normalized.category || '',
      brand: normalized.brand || '',
      retailUnit: normalized.retailUnit || 'ပိဿာ',
      retailPrice: String(normalized.retailPrice || ''),
      wholesaleUnit: normalized.wholesaleUnit || 'အိတ်',
      wholesalePrice: String(normalized.wholesalePrice || ''),
      conversionFactor: String(normalized.conversionFactor || '1'),
      wholesaleThreshold: String(normalized.wholesaleThreshold || ''),
      stockInBaseUnit: String(normalized.stockInBaseUnit || ''),
      minStockLevel: String(normalized.minStockLevel || ''),
      supplierName: normalized.supplierName || '',
      expiryDate: normalized.expiryDate || '',
      isActive: normalized.isActive !== false
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await upsertProduct(storeId, user, form, editingId);
      notify(editingId ? 'ပစ္စည်းအချက်အလက် ပြင်ဆင်ပြီးပါပြီ။' : 'ပစ္စည်းအသစ် ထည့်သွင်းပြီးပါပြီ။');
      resetForm();
    } catch (error) {
      notify(error.message || 'သိမ်းဆည်းရာတွင် အမှားဖြစ်သွားပါသည်။', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`${product.name} ကိုဖျက်ရန် သေချာပါသလား?`)) return;
    try {
      await removeProduct(storeId, user, product);
      notify('ပစ္စည်းဖျက်ပြီးပါပြီ။');
      if (editingId === product.id) resetForm();
    } catch (error) {
      notify(error.message || 'ဖျက်ရာတွင် အမှားဖြစ်သွားပါသည်။', 'danger');
    }
  };

  return (
    <div className="grid h-full min-h-0 gap-4 overflow-y-auto bg-slate-50 p-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <PackagePlus className="h-5 w-5 text-green-700" />
              {editingId ? 'ပစ္စည်းပြင်ရန်' : 'ပစ္စည်းအသစ်ထည့်ရန်'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Price, unit conversion, stock controls</p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
              title="Reset"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="ပစ္စည်းအမည် *" value={form.name} onChange={(value) => update('name', value)} required />
            <TextInput label="SKU" value={form.sku} onChange={(value) => update('sku', value)} />
            <TextInput label="Barcode" value={form.barcode} onChange={(value) => update('barcode', value)} />
            <TextInput label="အမျိုးအစား" value={form.category} onChange={(value) => update('category', value)} list="category-options" />
            <TextInput label="Brand" value={form.brand} onChange={(value) => update('brand', value)} />
            <TextInput label="Supplier" value={form.supplierName} onChange={(value) => update('supplierName', value)} />
          </div>

          <datalist id="category-options">
            {categories.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>

          <div className="rounded-lg border border-green-100 bg-green-50 p-3">
            <p className="mb-3 text-sm font-bold text-green-800">လက်လီ</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="ယူနစ်" value={form.retailUnit} onChange={(value) => update('retailUnit', value)} />
              <TextInput label="ဈေးနှုန်း *" type="number" value={form.retailPrice} onChange={(value) => update('retailPrice', value)} required />
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="mb-3 text-sm font-bold text-blue-800">လက်ကား / Unit conversion</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="ထုပ်ပိုးယူနစ်" value={form.wholesaleUnit} onChange={(value) => update('wholesaleUnit', value)} />
              <TextInput label="ထုပ်ပိုးဈေး" type="number" value={form.wholesalePrice} onChange={(value) => update('wholesalePrice', value)} />
              <TextInput label={`၁ ${form.wholesaleUnit || 'အိတ်'} = ? ${form.retailUnit || 'ယူနစ်'}`} type="number" value={form.conversionFactor} onChange={(value) => update('conversionFactor', value)} />
              <TextInput label="Auto wholesale threshold" type="number" value={form.wholesaleThreshold} onChange={(value) => update('wholesaleThreshold', value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <TextInput label="လက်ရှိ Stock" type="number" value={form.stockInBaseUnit} onChange={(value) => update('stockInBaseUnit', value)} />
            <TextInput label="Low stock alert" type="number" value={form.minStockLevel} onChange={(value) => update('minStockLevel', value)} />
            <TextInput label="Expiry" type="date" value={form.expiryDate} onChange={(value) => update('expiryDate', value)} />
          </div>

          <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => update('isActive', event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-green-700"
            />
            အရောင်းတွင် ပြသမည်
          </label>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'သိမ်းနေသည်...' : editingId ? 'ပြင်ဆင်မည်' : 'သိမ်းမည်'}
          </button>
        </form>
      </section>

      <section className="min-w-0 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="ပစ္စည်းစုစုပေါင်း" value={products.length} />
          <Metric label="Stock နည်းနေသော" value={lowStock.length} tone="danger" />
          <Metric label="သက်တမ်းကုန်နီး" value={expiringSoon.length} tone="warning" />
        </div>

        {(lowStock.length > 0 || expiringSoon.length > 0) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Action alerts
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {lowStock.slice(0, 8).map((item) => (
                <span key={`low-${item.id}`} className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-red-700 shadow-sm">
                  {item.name}: {quantity(item.stockInBaseUnit)} {item.retailUnit}
                </span>
              ))}
              {expiringSoon.slice(0, 8).map((item) => (
                <span key={`exp-${item.id}`} className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                  {item.name}: {item.expiryDate}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input-control pl-10"
                placeholder="ပစ္စည်းရှာရန်"
              />
            </div>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="input-control lg:w-56">
              <option value="all">အားလုံး</option>
              <option value="low">Stock နည်းနေသော</option>
              <option value="inactive">Inactive</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Search} title="ကိုက်ညီသော ပစ္စည်းမရှိပါ" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ပစ္စည်း</th>
                    <th className="px-4 py-3 text-right">လက်လီ</th>
                    <th className="px-4 py-3 text-right">လက်ကား</th>
                    <th className="px-4 py-3 text-center">Stock</th>
                    <th className="px-4 py-3">Supplier / Expiry</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleProducts.map((product) => {
                    const danger = product.stockInBaseUnit <= product.minStockLevel;
                    return (
                      <tr key={product.id} className={danger ? 'bg-red-50/40' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{product.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {product.category} · {product.brand || '-'} {product.sku ? `· SKU ${product.sku}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">
                          {money(product.retailPrice)}
                          <span className="block text-xs font-medium text-slate-400">/ {product.retailUnit}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-700">
                          {money(product.wholesalePrice)}
                          <span className="block text-xs font-medium text-slate-400">/ {product.wholesaleUnit}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex min-w-24 flex-col rounded-md px-3 py-1 font-bold ${danger ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {quantity(product.stockInBaseUnit)}
                            <span className="text-[10px] font-semibold uppercase">{product.retailUnit}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>{product.supplierName || '-'}</p>
                          <p className="text-xs text-slate-400">{product.expiryDate ? `Exp: ${product.expiryDate}` : 'No expiry'}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded px-2 py-1 text-xs font-bold ${product.isActive === false ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700'}`}>
                            {product.isActive === false ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => editProduct(product)} className="mr-2 rounded-md border border-blue-200 p-2 text-blue-700 hover:bg-blue-50" title="Edit">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => deleteProduct(product)} className="rounded-md border border-red-200 p-2 text-red-700 hover:bg-red-50" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TextInput({ label, type = 'text', value, onChange, required, list }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      <input
        required={required}
        type={type}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        value={value}
        list={list}
        onChange={(event) => onChange(event.target.value)}
        className="input-control py-2 text-sm"
      />
    </label>
  );
}

function Metric({ label, value, tone = 'neutral' }) {
  const colors =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-800'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-slate-200 bg-white text-slate-900';
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${colors}`}>
      <p className="text-sm font-semibold opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
    </div>
  );
}
