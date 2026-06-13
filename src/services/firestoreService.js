import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db, appNamespace } from '../firebase.js';
import { calculateLine, normalizeProduct, validateSellableLine } from '../utils/calculations.js';
import { toMillis } from '../utils/format.js';

function requireDb() {
  if (!db) {
    throw new Error('Firebase configuration is missing.');
  }
  return db;
}

export function storeCollection(storeId, name) {
  return collection(requireDb(), 'artifacts', appNamespace, 'users', storeId, name);
}

export function storeDoc(storeId, name, id) {
  return doc(requireDb(), 'artifacts', appNamespace, 'users', storeId, name, id);
}

export async function hasAdminUser() {
  const snapshot = await getDocs(query(collection(requireDb(), 'users'), where('role', '==', 'admin'), limit(1)));
  return !snapshot.empty;
}

export async function writeAudit(storeId, actor, action, details, metadata = {}) {
  await addDoc(storeCollection(storeId, 'audit_logs'), {
    actorUid: actor?.uid || null,
    actorEmail: actor?.email || actor?.displayName || 'system',
    action,
    details,
    metadata,
    timestamp: Date.now(),
    createdAt: serverTimestamp()
  });
}

export function subscribeStoreData(storeId, handlers) {
  const unsubscribeProducts = onSnapshot(
    storeCollection(storeId, 'products'),
    (snapshot) => {
      const products = snapshot.docs
        .map((item) => normalizeProduct({ id: item.id, ...item.data() }))
        .sort((left, right) => left.name.localeCompare(right.name));
      handlers.onProducts(products);
    },
    handlers.onError
  );

  return () => unsubscribeProducts();
}

export function subscribeSalesReport(storeId, filters, handlers) {
  const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`).getTime() : 0;
  const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;

  return onSnapshot(
    query(
      storeCollection(storeId, 'sales'),
      where('timestamp', '>=', start),
      where('timestamp', '<=', end),
      orderBy('timestamp', 'desc'),
      limit(filters.limit || 500)
    ),
    (snapshot) => {
      const sales = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((left, right) => toMillis(right.timestamp || right.createdAt) - toMillis(left.timestamp || left.createdAt));
      handlers.onSales(sales);
    },
    handlers.onError
  );
}

export function subscribeAuditLogs(storeId, onData, onError) {
  return onSnapshot(
    query(storeCollection(storeId, 'audit_logs'), orderBy('timestamp', 'desc'), limit(150)),
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    onError
  );
}

export async function upsertProduct(storeId, actor, product, productId = null) {
  const cleanProduct = normalizeProduct(product);
  const now = Date.now();
  const payload = {
    ...cleanProduct,
    name: String(cleanProduct.name || '').trim(),
    sku: String(cleanProduct.sku || '').trim(),
    barcode: String(cleanProduct.barcode || '').trim(),
    category: String(cleanProduct.category || 'အခြား').trim(),
    brand: String(cleanProduct.brand || '-').trim(),
    supplierName: String(cleanProduct.supplierName || '-').trim(),
    expiryDate: cleanProduct.expiryDate || null,
    updatedAt: now
  };

  if (!payload.name) throw new Error('ပစ္စည်းအမည် ထည့်ရန်လိုပါသည်။');
  if (payload.retailPrice <= 0) throw new Error('လက်လီဈေး မှန်ကန်စွာ ထည့်ရန်လိုပါသည်။');
  if (payload.conversionFactor <= 0) throw new Error('ယူနစ်အချိုး မှန်ကန်စွာ ထည့်ရန်လိုပါသည်။');

  if (productId) {
    await updateDoc(storeDoc(storeId, 'products', productId), payload);
    await writeAudit(storeId, actor, 'UPDATE_PRODUCT', `Updated ${payload.name}`, {
      productId,
      name: payload.name
    });
    return productId;
  }

  const created = await addDoc(storeCollection(storeId, 'products'), {
    ...payload,
    createdAt: now
  });
  await writeAudit(storeId, actor, 'ADD_PRODUCT', `Added ${payload.name}`, {
    productId: created.id,
    name: payload.name
  });
  return created.id;
}

export async function removeProduct(storeId, actor, product) {
  await deleteDoc(storeDoc(storeId, 'products', product.id));
  await writeAudit(storeId, actor, 'DELETE_PRODUCT', `Deleted ${product.name}`, {
    productId: product.id,
    name: product.name
  });
}

export async function checkoutSale(storeId, actor, cart, payment) {
  if (!cart.length) throw new Error('ဘေလ်ထဲတွင် ပစ္စည်းမရှိသေးပါ။');
  const database = requireDb();
  const saleRef = doc(storeCollection(storeId, 'sales'));
  const auditRef = doc(storeCollection(storeId, 'audit_logs'));
  const now = Date.now();

  return runTransaction(database, async (transaction) => {
    const refs = cart.map((item) => storeDoc(storeId, 'products', item.product.id));
    const snapshots = [];

    for (const ref of refs) {
      snapshots.push(await transaction.get(ref));
    }

    const lines = cart.map((item, index) => {
      const snapshot = snapshots[index];
      if (!snapshot.exists()) throw new Error(`${item.product.name} ကိုမတွေ့ပါ။`);
      const product = normalizeProduct({ id: snapshot.id, ...snapshot.data() });
      const line = calculateLine(item, product);
      const issue = validateSellableLine(line);
      if (issue) throw new Error(issue);
      return line;
    });

    const totalAmount = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const totalBaseQty = lines.reduce((sum, line) => sum + line.totalBaseQty, 0);
    const invoiceNumber = `INV-${now}-${Math.floor(Math.random() * 900 + 100)}`;

    lines.forEach((line, index) => {
      const nextStock = Number((line.product.stockInBaseUnit - line.totalBaseQty).toFixed(4));
      transaction.update(refs[index], {
        stockInBaseUnit: nextStock,
        lastSoldAt: now,
        updatedAt: now
      });
    });

    const sale = {
      invoiceNumber,
      timestamp: now,
      createdAt: serverTimestamp(),
      cashierUid: actor?.uid || null,
      cashierEmail: actor?.email || null,
      paymentMethod: payment.method,
      transactionId: payment.transactionId || null,
      note: payment.note || '',
      totalAmount,
      totalBaseQty,
      itemCount: lines.length,
      items: lines.map((line) => ({
        productId: line.product.id,
        sku: line.product.sku || '',
        barcode: line.product.barcode || '',
        name: line.product.name,
        retailUnit: line.product.retailUnit,
        wholesaleUnit: line.product.wholesaleUnit,
        qtyWholesaleUnit: line.qtyWholesaleUnit,
        qtyRetailUnit: line.qtyRetailUnit,
        qtyKyattha: line.qtyKyattha,
        customAmount: line.customAmount,
        totalBaseQty: line.totalBaseQty,
        pricePerBaseUnit: line.pricePerBaseUnit,
        subtotal: line.subtotal,
        pricingMode: line.pricingMode,
        isWholesalePriceApplied: line.isWholesalePriceApplied
      }))
    };

    transaction.set(saleRef, sale);
    transaction.set(auditRef, {
      actorUid: actor?.uid || null,
      actorEmail: actor?.email || 'system',
      action: 'SALE',
      details: `${invoiceNumber} - ${Math.round(totalAmount).toLocaleString()} Ks`,
      metadata: {
        saleId: saleRef.id,
        invoiceNumber,
        itemCount: lines.length,
        paymentMethod: payment.method
      },
      timestamp: now,
      createdAt: serverTimestamp()
    });

    return { id: saleRef.id, ...sale };
  });
}
