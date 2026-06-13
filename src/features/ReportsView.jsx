import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, PackageSearch, ReceiptText, WalletCards } from 'lucide-react';
import { useBusinessStore } from '../store/businessStore.js';
import { dateTime, downloadCsv, localDateISO, money, quantity, todayISO, toMillis } from '../utils/format.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { subscribeSalesReport } from '../services/firestoreService.js';

function thirtyDaysAgoISO() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return localDateISO(date);
}

export function ReportsView() {
  const { storeId } = useAuth();
  const sales = useBusinessStore((state) => state.sales);
  const products = useBusinessStore((state) => state.products);
  const reportStatus = useBusinessStore((state) => state.reportStatus);
  const reportError = useBusinessStore((state) => state.reportError);
  const setSales = useBusinessStore((state) => state.setSales);
  const setReportStatus = useBusinessStore((state) => state.setReportStatus);
  const setReportError = useBusinessStore((state) => state.setReportError);
  const [startDate, setStartDate] = useState(thirtyDaysAgoISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState('all');

  useEffect(() => {
    setReportStatus('loading');
    setReportError('');
    const unsubscribe = subscribeSalesReport(
      storeId,
      { startDate, endDate, limit: 500 },
      {
        onSales: (nextSales) => {
          setSales(nextSales);
          setReportStatus('ready');
        },
        onError: (error) => {
          console.error(error);
          setReportError(error.message || 'Sales report loading failed.');
          setReportStatus('error');
        }
      }
    );

    return () => unsubscribe();
  }, [endDate, setReportError, setReportStatus, setSales, startDate, storeId]);

  const filteredSales = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
    const end = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
    return sales.filter((sale) => {
      const timestamp = toMillis(sale.timestamp || sale.createdAt);
      const matchesDate = timestamp >= start && timestamp <= end;
      const matchesPayment = paymentMethod === 'all' || sale.paymentMethod === paymentMethod;
      return matchesDate && matchesPayment;
    });
  }, [endDate, paymentMethod, sales, startDate]);

  const metrics = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    const itemRevenue = new Map();
    const paymentTotals = new Map();
    filteredSales.forEach((sale) => {
      paymentTotals.set(sale.paymentMethod, (paymentTotals.get(sale.paymentMethod) || 0) + Number(sale.totalAmount || 0));
      sale.items?.forEach((item) => {
        const current = itemRevenue.get(item.productId) || {
          name: item.name,
          qty: 0,
          revenue: 0
        };
        current.qty += Number(item.totalBaseQty || 0);
        current.revenue += Number(item.subtotal || 0);
        itemRevenue.set(item.productId, current);
      });
    });
    return {
      totalRevenue,
      billCount: filteredSales.length,
      averageTicket: filteredSales.length ? totalRevenue / filteredSales.length : 0,
      topItems: Array.from(itemRevenue.values()).sort((left, right) => right.revenue - left.revenue).slice(0, 8),
      paymentTotals: Array.from(paymentTotals.entries()).sort((left, right) => right[1] - left[1]),
      lowStockCount: products.filter((item) => item.stockInBaseUnit <= item.minStockLevel).length
    };
  }, [filteredSales, products]);

  const exportSales = () => {
    const rows = [
      ['Invoice', 'Date Time', 'Cashier', 'Payment', 'Transaction ID', 'Items', 'Total Amount'],
      ...filteredSales.map((sale) => [
        sale.invoiceNumber || sale.id,
        dateTime(sale.timestamp),
        sale.cashierEmail || '-',
        sale.paymentMethod || '-',
        sale.transactionId || '-',
        (sale.items || [])
          .map((item) => `${item.name} (${quantity(item.totalBaseQty)} ${item.retailUnit || ''})`)
          .join(' | '),
        Math.round(Number(sale.totalAmount || 0))
      ])
    ];
    downloadCsv(`sales-report-${startDate || 'all'}-${endDate || 'all'}.csv`, rows);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4">
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">Start</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="input-control" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">End</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="input-control" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">Payment</span>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="input-control lg:w-52">
              <option value="all">အားလုံး</option>
              <option value="Cash">Cash</option>
              <option value="KPay">KPay</option>
              <option value="WavePay">WavePay</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </label>
          <button
            type="button"
            onClick={exportSales}
            className="flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetric icon={WalletCards} label="ရောင်းရငွေ" value={money(metrics.totalRevenue)} tone="green" />
        <ReportMetric icon={ReceiptText} label="ဘေလ်အရေအတွက်" value={metrics.billCount} tone="blue" />
        <ReportMetric icon={BarChart3} label="ပျမ်းမျှဘေလ်" value={money(metrics.averageTicket)} tone="slate" />
        <ReportMetric icon={PackageSearch} label="Low stock" value={metrics.lowStockCount} tone="amber" />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Top products">
          {metrics.topItems.length === 0 ? (
            <EmptyState title="ရောင်းချမှုမရှိသေးပါ" />
          ) : (
            <div className="space-y-2">
              {metrics.topItems.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{quantity(item.qty)} units sold</p>
                  </div>
                  <p className="font-extrabold text-green-700">{money(item.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Payment mix">
          {metrics.paymentTotals.length === 0 ? (
            <EmptyState title="ငွေချေမှုဒေတာ မရှိပါ" />
          ) : (
            <div className="space-y-2">
              {metrics.paymentTotals.map(([method, total]) => (
                <div key={method} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-bold text-slate-900">{method}</p>
                  <p className="font-extrabold text-blue-700">{money(total)}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent sales">
        {reportStatus === 'loading' ? (
          <EmptyState icon={ReceiptText} title="Report ဖတ်နေသည်" />
        ) : reportStatus === 'error' ? (
          <EmptyState icon={ReceiptText} title="Report ဖတ်မရပါ" description={reportError} />
        ) : filteredSales.length === 0 ? (
          <EmptyState icon={ReceiptText} title="အရောင်းမှတ်တမ်း မရှိပါ" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">အချိန်</th>
                  <th className="px-4 py-3">ငွေချေမှု</th>
                  <th className="px-4 py-3">ပစ္စည်းများ</th>
                  <th className="px-4 py-3 text-right">ကျသင့်ငွေ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{sale.invoiceNumber || sale.id}</td>
                    <td className="px-4 py-3 text-slate-600">{dateTime(sale.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-xl flex-wrap gap-1">
                        {(sale.items || []).map((item, index) => (
                          <span key={`${sale.id}-${item.productId}-${index}`} className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {item.name} · {quantity(item.totalBaseQty)} {item.retailUnit}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-base font-extrabold text-slate-900">{money(sale.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function ReportMetric({ icon: Icon, label, value, tone }) {
  const styles = {
    green: 'border-green-200 bg-green-50 text-green-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    slate: 'border-slate-200 bg-white text-slate-900'
  };
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${styles[tone] || styles.slate}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold opacity-80">{label}</p>
        <Icon className="h-5 w-5 opacity-70" />
      </div>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
