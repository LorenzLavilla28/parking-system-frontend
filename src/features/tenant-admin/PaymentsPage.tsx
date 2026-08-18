import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, CalendarRange, Check, ChevronLeft, ChevronRight, CircleDollarSign, CircleHelp, Copy, Download, ExternalLink, ListFilter, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi, type PaymentDetail, type PaymentQuery, type PaymentSummary } from './api';
import { PaymentInvestigationView } from './PaymentInvestigationView';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TBody, Td, Th, THead } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatDateInput, formatPaymentTimestamp, formatMoney } from '@/lib/format';

export function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [provider, setProvider] = useState(params.get('provider') ?? '');
  const [method, setMethod] = useState(params.get('paymentMethod') ?? '');
  const [reconciliation, setReconciliation] = useState(params.get('reconciliation') ?? '');
  const [from, setFrom] = useState(isoToDisplayDate(params.get('from')));
  const [to, setTo] = useState(isoToDisplayDate(params.get('to')));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [pickerStart, setPickerStart] = useState<string | null>(null);
  const [pickerEnd, setPickerEnd] = useState<string | null>(null);
  const [pickerMonth, setPickerMonth] = useState(() => startOfMonth(new Date()));
  const [overrideOnly, setOverrideOnly] = useState(params.get('overrideOnly') === 'true');
  const [page, setPage] = useState(Number(params.get('page') ?? 1) || 1);
  const selectedId = params.get('paymentId');

  useEffect(() => {
    if (!datePickerOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDatePickerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [datePickerOpen]);

  const query = useMemo<PaymentQuery>(() => ({
    search: params.get('search') || undefined,
    status: params.get('status') || undefined,
    provider: params.get('provider') || undefined,
    paymentMethod: params.get('paymentMethod') || undefined,
    sessionId: params.get('sessionId') || undefined,
    from: params.get('from') ? `${params.get('from')}T00:00:00Z` : undefined,
    to: params.get('to') ? `${params.get('to')}T23:59:59.999Z` : undefined,
    overrideOnly: params.get('overrideOnly') === 'true' ? true : undefined,
    sortBy: (params.get('sortBy') as PaymentQuery['sortBy']) || undefined,
    sortDirection: (params.get('sortDirection') as PaymentQuery['sortDirection']) || undefined,
    page,
    pageSize: 25,
  }), [page, params]);

  const payments = useQuery({
    queryKey: ['admin-payments', query],
    queryFn: () => adminApi.listPayments(query),
  });
  const overrides = useQuery({
    queryKey: ['admin-payment-overrides', query.from, query.to],
    queryFn: () => adminApi.listPaymentOverrides({ from: query.from, to: query.to, pageSize: 3 }),
  });
  const detail = useQuery({
    queryKey: ['admin-payment', selectedId],
    queryFn: () => adminApi.getPayment(selectedId!),
    enabled: !!selectedId,
  });

  const allRows = payments.data?.items ?? [];
  const rows = reconciliation ? allRows.filter((row) => reconciliationView(row).key === reconciliation) : allRows;
  const paid = rows.filter((row) => row.status === 'Paid');
  const pending = rows.filter((row) => ['Pending', 'Processing'].includes(row.status));
  const failed = rows.filter((row) => ['Failed', 'Expired'].includes(row.status));
  const totalPaid = paid.reduce((sum, row) => sum + row.amount, 0);
  const overridePaid = paid.filter((row) => row.isOverrideRelated);
  const overrideCash = overridePaid.reduce((sum, row) => sum + row.amount, 0);
  const periodLabel = paymentPeriodLabel(params.get('from'), params.get('to'));
  const activeFilters = getActiveFilters(params);
  const hasAppliedFilters = activeFilters.length > 0 || Boolean(params.get('sessionId'));

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    setDatePickerOpen(false);
    const next = new URLSearchParams(params);
    setOrDelete(next, 'search', search.trim());
    setOrDelete(next, 'status', status);
    setOrDelete(next, 'provider', provider);
    setOrDelete(next, 'paymentMethod', method);
    setOrDelete(next, 'reconciliation', reconciliation);
    setOrDelete(next, 'from', displayToIso(from));
    setOrDelete(next, 'to', displayToIso(to));
    setOrDelete(next, 'overrideOnly', overrideOnly ? 'true' : '');
    next.delete('paymentId');
    next.set('page', '1');
    setPage(1);
    setParams(next);
  }

  function openDatePicker() {
    const start = displayToIso(from) || displayToIso(to) || localIsoDate(new Date());
    setPickerStart(displayToIso(from) || null);
    setPickerEnd(displayToIso(to) || null);
    setPickerMonth(startOfMonth(parseIsoDate(start)));
    setDatePickerOpen(true);
  }

  function toggleDatePicker() {
    if (datePickerOpen) {
      setDatePickerOpen(false);
      return;
    }
    openDatePicker();
  }

  function selectPickerDate(iso: string) {
    if (!pickerStart || pickerEnd) {
      setPickerStart(iso);
      setPickerEnd(null);
      setFrom(isoToDisplayDate(iso));
      setTo('');
      return;
    }
    if (iso < pickerStart) {
      setPickerStart(iso);
      setTo('');
      setFrom(isoToDisplayDate(iso));
      return;
    }
    setPickerEnd(iso);
    setTo(isoToDisplayDate(iso));
    setDatePickerOpen(false);
  }

  function clearDateRange() {
    setPickerStart(null);
    setPickerEnd(null);
    setFrom('');
    setTo('');
    setDatePickerOpen(false);
  }

  function clearFilters() {
    const next = new URLSearchParams(params);
    ['search', 'status', 'provider', 'paymentMethod', 'reconciliation', 'from', 'to', 'sessionId', 'overrideOnly', 'page'].forEach((key) => next.delete(key));
    setSearch('');
    setStatus('');
    setProvider('');
    setMethod('');
    setReconciliation('');
    setFrom('');
    setTo('');
    setOverrideOnly(false);
    setPage(1);
    setParams(next);
  }

  function clearFilter(key: string) {
    const next = new URLSearchParams(params);
    next.delete(key);
    next.delete('page');
    if (key === 'search') setSearch('');
    if (key === 'status') setStatus('');
    if (key === 'provider') setProvider('');
    if (key === 'paymentMethod') setMethod('');
    if (key === 'reconciliation') setReconciliation('');
    if (key === 'from') setFrom('');
    if (key === 'to') setTo('');
    if (key === 'overrideOnly') setOverrideOnly(false);
    setPage(1);
    setParams(next);
  }

  function sortBy(field: 'time' | 'amount') {
    const next = new URLSearchParams(params);
    const currentField = params.get('sortBy') ?? 'time';
    const currentDirection = params.get('sortDirection') ?? 'desc';
    const direction = currentField === field && currentDirection === 'desc' ? 'asc' : 'desc';
    next.set('sortBy', field);
    next.set('sortDirection', direction);
    next.delete('page');
    setPage(1);
    setParams(next);
  }

  async function downloadCsv() {
    const response = await adminApi.exportPayments(query);
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (selectedId) {
    return (
      <PaymentInvestigation
        detail={detail.data!}
        isLoading={detail.isLoading}
        error={detail.error}
        onBack={() => {
          const next = new URLSearchParams(params);
          next.delete('paymentId');
          setParams(next);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant administration"
        title="Payments"
        description="Reconcile payment transactions, provider attempts, and collected cash."
        actions={<div className="flex flex-wrap items-center justify-end gap-3"><Link to="/admin/sessions/adjustments" className="text-sm font-semibold text-brand-700 hover:underline">{overrides.isLoading ? 'Recent adjustments' : `${overrides.data?.length ?? 0} recent adjustments`} · View adjustment history</Link><Button variant="secondary" disabled={rows.length === 0 || payments.isFetching} onClick={downloadCsv}><Download className="h-4 w-4" /> Export results</Button></div>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={CircleDollarSign} label="Collected in results" value={formatMoney(totalPaid)} detail={`${paid.length} successful · ${periodLabel}`} tone="green" />
        <MetricCard icon={ShieldCheck} label="Successful payments" value={paid.length} detail="Confirmed transactions" tone="green" />
        <MetricCard icon={CalendarRange} label="Pending payment attempts" value={pending.length} detail="Awaiting provider confirmation" tone="amber" />
        <MetricCard icon={ShieldCheck} label="Failed payments" value={failed.length} detail="Failed or expired attempts" tone="slate" />
        <MetricCard icon={CircleDollarSign} label="Override cash collected" value={formatMoney(overrideCash)} detail={`${overridePaid.length} payment${overridePaid.length === 1 ? '' : 's'} on this page`} tone="blue" />
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-sm font-bold text-slate-900">Filter payments</h2><p className="mt-1 text-xs text-slate-500">Search and narrow payment records by date, status, method, provider, or reconciliation state.</p></div><p className="text-xs font-semibold text-slate-500">All times: Asia/Manila</p></div>
        <form className="hidden space-y-4 xl:block" onSubmit={applyFilters}>
          <div className="grid gap-4 xl:grid-cols-[minmax(17rem,1.45fr)_minmax(18rem,1.35fr)_repeat(4,minmax(10rem,1fr))]">
            <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Search</span><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Plate, receipt, or provider ID" aria-label="Search payments" /></label>
            <div className="relative space-y-1.5 text-sm font-semibold text-slate-700"><span>Date range</span><button type="button" aria-label={datePickerOpen ? 'Close date range picker' : 'Open date range picker'} aria-expanded={datePickerOpen} onClick={toggleDatePicker} className="flex h-11 w-full items-center rounded-lg bg-white px-3 text-left text-sm font-normal ring-1 ring-slate-300 hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><span className={from ? 'text-slate-900' : 'text-slate-400'}>{dateRangeDisplay(from, to)}</span><CalendarRange className="ml-auto h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /></button>{datePickerOpen && <DateRangePopover start={pickerStart} end={pickerEnd} month={pickerMonth} onMonthChange={setPickerMonth} onSelect={selectPickerDate} onClear={clearDateRange} onClose={() => setDatePickerOpen(false)} />}</div>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Status</span><select aria-label="Payment status" value={status} onChange={(event) => setStatus(event.target.value)} className={`${selectClass} w-full`}><option value="">All statuses</option>{['Paid', 'Pending', 'Processing', 'Failed', 'Expired', 'Refunded', 'PartiallyRefunded'].map((value) => <option key={value}>{value}</option>)}<option value="Cancelled">Cancelled / abandoned</option></select></label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Payment method</span><select aria-label="Payment method" value={method} onChange={(event) => setMethod(event.target.value)} className={`${selectClass} w-full`}><option value="">All methods</option><option value="cash">Cash</option><option value="card">Card</option><option value="gcash">GCash</option><option value="qrph">QR Ph</option></select></label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Provider</span><select aria-label="Payment provider" value={provider} onChange={(event) => setProvider(event.target.value)} className={`${selectClass} w-full`}><option value="">All providers</option><option value="PayMongo">PayMongo</option><option value="Cash">Cash</option></select></label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Reconciliation</span><select aria-label="Reconciliation state" value={reconciliation} onChange={(event) => setReconciliation(event.target.value)} className={`${selectClass} w-full`}><option value="">All reconciliation states</option><option value="reconciled">Reconciled</option><option value="needs-review">Needs review</option><option value="provider-mismatch">Provider mismatch</option><option value="webhook-pending">Webhook pending</option></select></label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex min-w-0 flex-nowrap items-center gap-1 whitespace-nowrap text-xs text-slate-500"><span className="mr-1 shrink-0 font-semibold uppercase tracking-wide text-slate-400">Quick dates</span><QuickDateButton label="Today" onClick={() => setQuickDateRange(setFrom, setTo, 0)} /><QuickDateButton label="Yesterday" onClick={() => setQuickDateRange(setFrom, setTo, 1)} /><QuickDateButton label="7 days" onClick={() => setQuickDateRange(setFrom, setTo, 6)} /><QuickDateButton label="This month" onClick={() => setThisMonth(setFrom, setTo)} /></div>
            <div className="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap"><label className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={overrideOnly} onChange={(event) => setOverrideOnly(event.target.checked)} className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500" /> Show override cash only</label><button type="button" title="Override cash qualifies when a cash payment is recorded while a supervisor-approved exit override is applied." aria-label="Override cash filter information" className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-700"><CircleHelp className="h-4 w-4" /></button><Button type="submit" variant="secondary"><ListFilter className="h-4 w-4" /> Apply filters</Button><Button type="button" variant="ghost" disabled={!hasAppliedFilters} onClick={clearFilters}>Clear filters</Button></div>
          </div>
        </form>
        <form className="space-y-4 xl:hidden" onSubmit={applyFilters}>
          <label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span>Search</span><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Plate, receipt, or provider ID" aria-label="Search payments" /></label>
          <div className="relative space-y-1.5 text-sm font-semibold text-slate-700"><span>Date range</span><button type="button" aria-label={datePickerOpen ? 'Close date range picker' : 'Open date range picker'} aria-expanded={datePickerOpen} onClick={toggleDatePicker} className="flex h-11 w-full items-center rounded-lg bg-white px-3 text-left text-sm font-normal ring-1 ring-slate-300 hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><span className={from ? 'text-slate-900' : 'text-slate-400'}>{dateRangeDisplay(from, to)}</span><CalendarRange className="ml-auto h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /></button>{datePickerOpen && <DateRangePopover start={pickerStart} end={pickerEnd} month={pickerMonth} onMonthChange={setPickerMonth} onSelect={selectPickerDate} onClear={clearDateRange} onClose={() => setDatePickerOpen(false)} />}</div>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setMobileFiltersOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:ring-slate-400"><SlidersHorizontal className="h-4 w-4" /> Filters{mobileFilterCount(status, method, provider, reconciliation, overrideOnly) > 0 ? ` (${mobileFilterCount(status, method, provider, reconciliation, overrideOnly)})` : ''}</button>
            <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto pb-1 text-xs text-slate-500"><span className="mr-1 shrink-0 font-semibold uppercase tracking-wide text-slate-400">Quick dates</span><QuickDateButton label="Today" onClick={() => setQuickDateRange(setFrom, setTo, 0)} /><QuickDateButton label="Yesterday" onClick={() => setQuickDateRange(setFrom, setTo, 1)} /><QuickDateButton label="7 days" onClick={() => setQuickDateRange(setFrom, setTo, 6)} /><QuickDateButton label="This month" onClick={() => setThisMonth(setFrom, setTo)} /></div>
          </div>
          <Button type="submit" variant="primary" fullWidth><ListFilter className="h-4 w-4" /> Apply filters</Button>
          {mobileFiltersOpen && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileFiltersOpen(false); }}><div className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 pb-24 shadow-2xl" role="dialog" aria-modal="true" aria-label="Payment filters"><div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3"><div><h3 className="text-base font-bold text-slate-950">Payment filters</h3><p className="mt-1 text-xs text-slate-500">Narrow the payment list by status and source.</p></div><button type="button" onClick={() => setMobileFiltersOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close payment filters"><X className="h-5 w-5" /></button></div><div className="space-y-4"><label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span>Status</span><select aria-label="Payment status" value={status} onChange={(event) => setStatus(event.target.value)} className={`${selectClass} w-full`}><option value="">All statuses</option>{['Paid', 'Pending', 'Processing', 'Failed', 'Expired', 'Refunded', 'PartiallyRefunded'].map((value) => <option key={value}>{value}</option>)}<option value="Cancelled">Cancelled / abandoned</option></select></label><label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span>Payment method</span><select aria-label="Payment method" value={method} onChange={(event) => setMethod(event.target.value)} className={`${selectClass} w-full`}><option value="">All methods</option><option value="cash">Cash</option><option value="card">Card</option><option value="gcash">GCash</option><option value="qrph">QR Ph</option></select></label><label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span>Provider</span><select aria-label="Payment provider" value={provider} onChange={(event) => setProvider(event.target.value)} className={`${selectClass} w-full`}><option value="">All providers</option><option value="PayMongo">PayMongo</option><option value="Cash">Cash</option></select></label><label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span>Reconciliation</span><select aria-label="Reconciliation state" value={reconciliation} onChange={(event) => setReconciliation(event.target.value)} className={`${selectClass} w-full`}><option value="">All reconciliation states</option><option value="reconciled">Reconciled</option><option value="needs-review">Needs review</option><option value="provider-mismatch">Provider mismatch</option><option value="webhook-pending">Webhook pending</option></select></label><label className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"><input type="checkbox" checked={overrideOnly} onChange={(event) => setOverrideOnly(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" /> Show override cash only</label></div><div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.12)]"><Button type="submit" variant="primary" fullWidth><ListFilter className="h-4 w-4" /> Apply filters</Button></div></div></div>}
        </form>
        {activeFilters.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active filters</span>{activeFilters.map((filter) => <button key={filter.key} type="button" onClick={() => clearFilter(filter.key)} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-100 hover:bg-brand-100">{filter.label}<X className="h-3 w-3" /></button>)}</div>}
      </Card>

      {payments.isLoading && <LoadingState label="Loading payments..." />}
      {payments.isError && <ErrorState error={payments.error} />}
      {payments.data && <p className="text-sm font-semibold text-slate-700">{(reconciliation ? rows.length : payments.data.totalCount).toLocaleString()} payment{(reconciliation ? rows.length : payments.data.totalCount) === 1 ? '' : 's'}{reconciliation ? ' on this page' : ''}</p>}
      {payments.data && rows.length === 0 && <EmptyState><div className="space-y-3"><p>No payment records match these filters.</p><Button variant="secondary" disabled={!hasAppliedFilters} onClick={clearFilters}>Clear filters</Button></div></EmptyState>}
      {rows.length > 0 && <div className="md:hidden"><div className="space-y-3">{rows.map((row) => <MobilePaymentCard key={row.id} row={row} onSelect={() => {
        const next = new URLSearchParams(params);
        next.set('paymentId', row.id);
        setParams(next);
      }} />)}</div></div>}
      {rows.length > 0 && <div className="hidden md:block xl:hidden"><PaymentCompactTable rows={rows} onSelect={(id) => {
        const next = new URLSearchParams(params);
        next.set('paymentId', id);
        setParams(next);
      }} /></div>}
      {rows.length > 0 && <div className="hidden xl:block"><PaymentTable rows={rows} sortBy={(params.get('sortBy') as 'time' | 'amount') ?? 'time'} sortDirection={(params.get('sortDirection') as 'asc' | 'desc') ?? 'desc'} onSort={sortBy} onSelect={(id) => {
        const next = new URLSearchParams(params);
        next.set('paymentId', id);
        setParams(next);
      }} /></div>}

      {payments.data && payments.data.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Page {payments.data.page} of {payments.data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPageAndUrl(page - 1, params, setParams, setPage)}>Previous</Button>
            <Button variant="secondary" disabled={page >= payments.data.totalPages} onClick={() => setPageAndUrl(page + 1, params, setParams, setPage)}>Next</Button>
          </div>
        </div>
      )}

    </div>
  );
}

function DateRangePopover({ start, end, month, onMonthChange, onSelect, onClear, onClose }: {
  start: string | null;
  end: string | null;
  month: Date;
  onMonthChange: (month: Date) => void;
  onSelect: (iso: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const prompt = start && !end ? 'Select an end date' : start && end ? 'Range selected' : 'Select a start date';
  return (
    <div className="absolute left-0 z-40 mt-2 w-[min(42rem,calc(100vw-2rem))] rounded-xl bg-white p-4 text-slate-900 shadow-xl ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <button type="button" aria-label="Previous month" onClick={() => onMonthChange(addMonths(month, -1))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-center"><p className="text-sm font-bold text-slate-900">{formatCalendarMonth(month)}{<span className="hidden sm:inline"> <span className="px-2 text-slate-300">·</span>{formatCalendarMonth(addMonths(month, 1))}</span>}</p><p className="mt-0.5 text-xs font-semibold text-brand-700">{prompt}</p></div>
        <div className="flex items-center gap-1"><button type="button" aria-label="Next month" onClick={() => onMonthChange(addMonths(month, 1))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><ChevronRight className="h-4 w-4" /></button><button type="button" aria-label="Close date range picker" title="Close date range picker" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="h-4 w-4" /></button></div>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <CalendarMonth month={month} start={start} end={end} onSelect={onSelect} />
        <div className="hidden sm:block"><CalendarMonth month={addMonths(month, 1)} start={start} end={end} onSelect={onSelect} /></div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" onClick={onClear} disabled={!start && !end} className="text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40">Clear date range</button><p className="text-xs text-slate-400">Select dates inclusively</p></div>
    </div>
  );
}

function MobilePaymentCard({ row, onSelect }: { row: PaymentSummary; onSelect: () => void }) {
  const reconciliation = reconciliationView(row);
  const due = balanceDue(row);
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-lg font-extrabold uppercase tracking-wide text-slate-950">{row.plateNumberRaw}</p>
          <p className="mt-1 text-xs text-slate-500">{row.locationName}</p>
        </div>
        <p className="shrink-0 text-lg font-extrabold tabular-nums text-slate-950">{formatMoney(row.amount, row.currency)}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={paymentTone(row.status)}>{row.status}</Badge>
        <span className="text-slate-300">·</span>
        {reconciliation.key === 'reconciled' ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />Reconciled</span> : <Badge tone={reconciliation.tone}>{reconciliation.label}</Badge>}
      </div>
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
        <p className="text-slate-600">{formatPaymentTimestamp(row.paidAt ?? row.createdAt, false, false)}</p>
        <p className="font-medium text-slate-800">{paymentMethodLabel(row.paymentMethod)}{shouldShowProvider(row.paymentMethod, row.provider) ? ` · ${row.provider}` : ''}{row.isOverrideRelated ? ' · Override cash' : ''}</p>
        <p className="text-slate-500">{sessionStatusLabel(row.sessionStatus)}{due != null && due > 0 ? ` · Balance due ${formatMoney(due, row.currency)}` : row.sessionStatus === 'OverstayDue' && due == null ? ' · Balance due not calculated' : ''}</p>
      </div>
      <Button type="button" variant="secondary" fullWidth className="mt-4" onClick={onSelect}>View payment <ExternalLink className="h-4 w-4" /></Button>
    </article>
  );
}

function PaymentCompactTable({ rows, onSelect }: { rows: PaymentSummary[]; onSelect: (id: string) => void }) {
  return <Table><THead><tr><Th>Time</Th><Th>Plate</Th><Th className="text-right">Paid amount</Th><Th>Method</Th><Th>Payment status</Th><Th>Action</Th></tr></THead><TBody>{rows.map((row) => { const reconciliation = reconciliationView(row); return <tr key={row.id}><Td className="whitespace-nowrap text-xs">{formatPaymentTimestamp(row.paidAt ?? row.createdAt, false, false)}</Td><Td><p className="font-mono font-semibold text-slate-950">{row.plateNumberRaw}</p><p className="mt-1 text-xs text-slate-500">{row.locationName}</p></Td><Td className="text-right font-bold tabular-nums text-slate-950">{formatMoney(row.amount, row.currency)}</Td><Td><p>{paymentMethodLabel(row.paymentMethod)}</p>{row.isOverrideRelated && <Badge tone="blue">Override cash</Badge>}</Td><Td><div className="flex flex-wrap items-center gap-1.5"><Badge tone={paymentTone(row.status)}>{row.status}</Badge>{reconciliation.key === 'reconciled' ? <span className="text-xs font-semibold text-slate-500">✓ Reconciled</span> : <Badge tone={reconciliation.tone}>{reconciliation.label}</Badge>}</div></Td><Td><Button type="button" size="sm" variant="secondary" onClick={() => onSelect(row.id)}>View <ExternalLink className="h-3.5 w-3.5" /></Button></Td></tr>; })}</TBody></Table>;
}

function CalendarMonth({ month, start, end, onSelect }: { month: Date; start: string | null; end: string | null; onSelect: (iso: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">{formatCalendarMonth(month)}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day} className="py-1">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays(month).map((iso, index) => {
          if (!iso) return <span key={`blank-${index}`} className="h-9" />;
          const selected = iso === start || iso === end;
          const inRange = !!start && !!end && iso > start && iso < end;
          return <button key={iso} type="button" aria-label={formatCalendarDate(iso)} aria-pressed={selected} onClick={() => onSelect(iso)} className={`h-9 rounded-lg text-sm transition ${selected ? 'bg-brand-700 font-bold text-white' : inRange ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-700 hover:bg-slate-100'}`}>{parseIsoDate(iso).getDate()}</button>;
        })}
      </div>
    </div>
  );
}

function PaymentTable({ rows, sortBy, sortDirection, onSort, onSelect }: { rows: PaymentSummary[]; sortBy: 'time' | 'amount'; sortDirection: 'asc' | 'desc'; onSort: (field: 'time' | 'amount') => void; onSelect: (id: string) => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyReference(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied((current) => current === value ? null : current), 1500);
    } catch {
      setCopied(null);
    }
  }

  return (
      <Table className="[&_td]:py-2.5 [&_th]:py-2.5">
      <THead><tr><Th><SortButton label="Time" field="time" activeField={sortBy} direction={sortDirection} onSort={onSort} /></Th><Th>Plate</Th><Th className="whitespace-nowrap text-right"><SortButton label="Paid amount" field="amount" activeField={sortBy} direction={sortDirection} onSort={onSort} /></Th><Th className="whitespace-nowrap text-right">Balance due</Th><Th>Method / provider</Th><Th>Payment / session</Th><Th>Reconciliation</Th><Th>Payment reference</Th><Th>Action</Th></tr></THead>
      <TBody>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{formatPaymentTimestamp(row.paidAt ?? row.createdAt, false, false)}</Td>
            <Td><p className="font-mono font-semibold uppercase text-slate-950">{row.plateNumberRaw}</p><p className="mt-1 text-xs text-slate-500">{row.locationName}</p></Td>
            <Td className="whitespace-nowrap text-right text-base font-bold tabular-nums text-slate-950">{formatMoney(row.amount, row.currency)}</Td>
            <Td className="whitespace-nowrap text-right text-base font-bold tabular-nums">{balanceDue(row) != null ? <span className={balanceDue(row)! > 0 ? 'text-amber-700' : 'text-slate-700'}>{formatMoney(balanceDue(row)!, row.currency)}</span> : row.sessionStatus === 'OverstayDue' ? <span className="text-amber-700" title="The current session fee could not be calculated.">Not calculated</span> : <span className="text-slate-400">—</span>}</Td>
            <Td><div className="flex flex-col items-start gap-1"><span>{paymentMethodLabel(row.paymentMethod)}</span>{shouldShowProvider(row.paymentMethod, row.provider) && <span className="text-xs text-slate-500">{row.provider}</span>}{row.isOverrideRelated && <Badge tone="blue">Override cash</Badge>}</div></Td>
            <Td>
              <div className="space-y-1.5">
                <div><Badge tone={paymentTone(row.status)}>{row.status}</Badge></div>
                <div><Badge tone={sessionTone(row.sessionStatus)}>{sessionStatusLabel(row.sessionStatus)}</Badge></div>
              </div>
            </Td>
            <Td><ReconciliationStatus row={row} /></Td>
            <Td><div className="inline-flex max-w-44 items-center gap-2"><span className="truncate font-mono text-xs text-slate-700" title={row.receiptNumber ?? row.providerPaymentId ?? row.id}>{truncateReference(row.receiptNumber ?? row.providerPaymentId ?? row.id)}</span><button type="button" onClick={() => copyReference(row.receiptNumber ?? row.providerPaymentId ?? row.id)} className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Copy payment reference" title="Copy payment reference">{copied === (row.receiptNumber ?? row.providerPaymentId ?? row.id) ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}</button></div></Td>
             <Td><button type="button" aria-label="View payment" onClick={() => onSelect(row.id)} className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50">View <ExternalLink className="h-3.5 w-3.5" /></button></Td>
          </tr>
        ))}
      </TBody>
    </Table>
  );
}

function PaymentInvestigation({
  detail,
  isLoading,
  error,
  onBack,
}: {
  detail: PaymentDetail;
  isLoading: boolean;
  error: unknown;
  onBack: () => void;
}) {
  if (isLoading) return <LoadingState label="Loading payment evidence..." />;
  if (error) return <ErrorState error={error} />;
  if (!detail) return <EmptyState>Payment evidence is unavailable.</EmptyState>;
  const { payment, session } = detail;
  const quote = detail.quote!;
  return <PaymentInvestigationView detail={detail} onBack={onBack} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Payment investigation" title={payment.receiptNumber ?? `Payment ${payment.id.slice(0, 8)}`} description="Review the complete internal and provider-linked record for this payment." actions={<Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> All payments</Button>} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment status</p><p className="mt-1 text-2xl font-bold text-slate-950">{formatMoney(payment.amount, payment.currency)}</p></div><Badge tone={paymentTone(payment.status)}>{payment.status}</Badge></div>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Info label="Payment ID" value={payment.id} mono />
            <Info label="Provider / method" value={`${payment.provider} · ${paymentMethodLabel(payment.paymentMethod)}`} />
            <Info label="Created" value={formatPaymentTimestamp(payment.createdAt, true)} />
            <Info label="Paid" value={payment.paidAt ? formatPaymentTimestamp(payment.paidAt, true) : 'Not paid'} />
            <Info label="Receipt number" value={payment.receiptNumber ?? '—'} />
            <Info label="Customer email" value={payment.customerEmail ?? 'Not supplied'} />
            <Info label="Provider checkout ID" value={payment.providerCheckoutSessionId ?? '—'} mono />
            <Info label="Provider payment ID" value={payment.providerPaymentId ?? '—'} mono />
            <Info label="Recorded guard" value={payment.recordedByGuardId ?? 'Online / provider'} mono />
            <Info label="Session" value={`${payment.plateNumberRaw} · ${payment.locationName}`} />
          </dl>
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200">Use the provider payment ID, receipt number, and timestamps to cross-check a customer claim. Webhook evidence is shown below when available.</div>
        </Card>
        <Card className="space-y-4"><h2 className="text-base font-bold text-slate-950">Session context</h2><dl className="grid gap-3 text-sm"><Info label="Vehicle" value={`${session.plateNumberRaw} · ${session.vehicleType}`} /><Info label="Entry" value={formatPaymentTimestamp(session.entryTime, true)} /><Info label="Exit" value={session.exitTime ? formatPaymentTimestamp(session.exitTime, true) : 'Still active'} /><Info label="Session status" value={session.status} /><Info label="Total paid" value={formatMoney(session.totalPaid, payment.currency)} /><Info label="Final fee" value={session.finalFee === null ? 'Not exited' : formatMoney(session.finalFee, payment.currency)} /><Info label="Exit deadline" value={session.paidExitDeadline ? formatPaymentTimestamp(session.paidExitDeadline, true) : '—'} /></dl></Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><h2 className="text-base font-bold text-slate-950">Event timeline</h2><div className="mt-4 space-y-3">{detail.timeline.map((event, index) => <div key={`${event.at}-${event.type}-${index}`} className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" /><div><p className="text-sm font-semibold text-slate-800">{event.label}</p><p className="text-xs text-slate-500">{formatPaymentTimestamp(event.at, true)}{event.detail ? ` · ${event.detail}` : ''}</p></div></div>)}</div></Card>
        <Card><h2 className="text-base font-bold text-slate-950">Fee quote</h2>{quote ? <dl className="mt-4 grid gap-3 text-sm"><Info label="Quote ID" value={quote.id} mono /><Info label="Quote status" value={quote.status} /><Info label="Created / expires" value={`${formatPaymentTimestamp(quote.createdAt, true)} → ${formatPaymentTimestamp(quote.expiresAt, true)}`} /><Info label="Base amount" value={formatMoney(quote.baseAmount, quote.currency)} /><Info label="Discount" value={formatMoney(quote.discountAmount, quote.currency)} /><Info label="Total charged" value={formatMoney(quote.totalAmount, quote.currency)} /><pre className="max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{prettyJson(quote.pricingBreakdownJson)}</pre></dl> : <EmptyState>No fee quote is attached to this payment.</EmptyState>}</Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2"><EvidenceList title="Audit evidence" items={detail.audit.map((item) => ({ title: item.action, time: item.createdAt, detail: [item.reason, item.ipAddress, item.deviceInformation].filter(Boolean).join(' · ') || 'No additional context' }))} empty="No audit entries are linked to this payment." /><EvidenceList title="Provider webhooks" items={detail.webhooks.map((item) => ({ title: `${item.eventType} · ${item.processingStatus}`, time: item.receivedAt, detail: `${item.providerEventId} · hash ${item.payloadHash}` }))} empty="No linked provider webhook is available." /></div>
    </div>
  );
}

function EvidenceList({ title, items, empty }: { title: string; items: { title: string; time: string; detail: string }[]; empty: string }) {
  return <Card><h2 className="text-base font-bold text-slate-950">{title}</h2>{items.length === 0 ? <div className="mt-4"><EmptyState>{empty}</EmptyState></div> : <div className="mt-4 space-y-3">{items.map((item, index) => <div key={`${item.time}-${index}`} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-xs text-slate-500">{formatPaymentTimestamp(item.time, true)} · {item.detail}</p></div>)}</div>}</Card>;
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className={`mt-1 break-words font-semibold text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd></div>;
}

function setOrDelete(params: URLSearchParams, key: string, value: string) { if (value) params.set(key, value); else params.delete(key); }
function setPageAndUrl(nextPage: number, params: URLSearchParams, setParams: (next: URLSearchParams) => void, setPage: (page: number) => void) { const next = new URLSearchParams(params); next.set('page', String(nextPage)); setPage(nextPage); setParams(next); }
function prettyJson(value: string) { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
function paymentTone(status: string): 'green' | 'amber' | 'red' | 'blue' | 'neutral' { if (status === 'Paid') return 'green'; if (['Pending', 'Processing'].includes(status)) return 'amber'; if (['Failed', 'Expired', 'Cancelled'].includes(status)) return 'red'; if (['Refunded', 'PartiallyRefunded'].includes(status)) return 'blue'; return 'neutral'; }
function balanceDue(row: PaymentSummary) {
  if (row.currentOutstanding != null) return Math.max(0, row.currentOutstanding);
  if (row.currentFee != null) return Math.max(0, row.currentFee - row.totalPaid);
  return null;
}
function reconciliationView(row: PaymentSummary): { key: string; label: string; tone: 'green' | 'amber' | 'red' | 'blue' | 'neutral' } {
  if (row.status === 'Refunded') return { key: 'refunded', label: 'Refunded', tone: 'blue' };
  if (row.status === 'PartiallyRefunded') return { key: 'partially-refunded', label: 'Partially refunded', tone: 'blue' };
  if (['Failed', 'Expired', 'Cancelled'].includes(row.status)) return { key: 'needs-review', label: 'Needs review', tone: 'red' };
  if (['Pending', 'Processing'].includes(row.status)) return row.provider === 'Cash'
    ? { key: 'needs-review', label: 'Confirmation pending', tone: 'amber' }
    : { key: 'webhook-pending', label: 'Webhook pending', tone: 'amber' };
  if (row.sessionStatus === 'OverstayDue') return { key: 'needs-review', label: 'Needs review', tone: 'amber' };
  if (row.status === 'Paid' && row.provider !== 'Cash' && !row.providerPaymentId) return { key: 'provider-mismatch', label: 'Provider mismatch', tone: 'red' };
  if (row.status === 'Paid' && (balanceDue(row) ?? 0) > 0) return { key: 'needs-review', label: 'Needs review', tone: 'amber' };
  return { key: 'reconciled', label: 'Reconciled', tone: 'green' };
}
function ReconciliationStatus({ row }: { row: PaymentSummary }) { const status = reconciliationView(row); return status.key === 'reconciled' ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500" title="Reconciled"><Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />Reconciled</span> : <Badge tone={status.tone}>{status.label}</Badge>; }
function paymentMethodLabel(method: string | null | undefined) { const labels: Record<string, string> = { cash: 'Cash', card: 'Card', gcash: 'GCash', qrph: 'QR Ph' }; return method ? labels[method.toLowerCase()] ?? method : 'Not specified'; }
function shouldShowProvider(method: string | null | undefined, provider: string) { return paymentMethodLabel(method).toLowerCase() !== provider.toLowerCase(); }
function truncateReference(value: string) { return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value; }
function paymentPeriodLabel(from: string | null, to: string | null) { if (!from && !to) return 'All dates'; if (from && to) return `${formatDateInput(from)}–${formatDateInput(to)}`; return from ? `From ${formatDateInput(from)}` : `Through ${formatDateInput(to!)}`; }
function getActiveFilters(params: URLSearchParams) { return ([['search', 'Search', params.get('search')], ['status', 'Status', params.get('status')], ['provider', 'Provider', params.get('provider')], ['paymentMethod', 'Method', params.get('paymentMethod') ? paymentMethodLabel(params.get('paymentMethod')) : null], ['reconciliation', 'Reconciliation', params.get('reconciliation') ? reconciliationFilterLabel(params.get('reconciliation')!) : null], ['from', 'From', params.get('from') ? formatDateInput(params.get('from')!) : null], ['to', 'To', params.get('to') ? formatDateInput(params.get('to')!) : null], ['overrideOnly', 'Type', params.get('overrideOnly') === 'true' ? 'Override cash' : null]] as const).filter(([, , value]) => value).map(([key, label, value]) => ({ key, label: `${label}: ${value}` })); }
function reconciliationFilterLabel(value: string) { return ({ reconciled: 'Reconciled', 'needs-review': 'Needs review', 'provider-mismatch': 'Provider mismatch', 'webhook-pending': 'Webhook pending' } as Record<string, string>)[value] ?? value; }
function mobileFilterCount(status: string, method: string, provider: string, reconciliation: string, overrideOnly: boolean) { return [status, method, provider, reconciliation, overrideOnly ? 'override' : ''].filter(Boolean).length; }
function QuickDateButton({ label, onClick }: { label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-slate-50 px-2.5 py-1 font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50 hover:ring-brand-200">{label}</button>; }
function setQuickDateRange(setFrom: (value: string) => void, setTo: (value: string) => void, daysAgo: number) { const end = new Date(); const start = new Date(end); start.setDate(start.getDate() - daysAgo); setFrom(isoToDisplayDate(localIsoDate(start))); setTo(isoToDisplayDate(localIsoDate(end))); }
function setThisMonth(setFrom: (value: string) => void, setTo: (value: string) => void) { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); setFrom(isoToDisplayDate(localIsoDate(start))); setTo(isoToDisplayDate(localIsoDate(now))); }
function localIsoDate(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
function isoToDisplayDate(value: string | null) { if (!value) return ''; const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); return match ? `${match[3]}/${match[2]}/${match[1]}` : value; }
function displayToIso(value: string) { const trimmed = value.trim(); if (!trimmed) return ''; if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed; const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed); if (!match) return ''; const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3]); const date = new Date(Date.UTC(year, month - 1, day)); if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return ''; return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
function dateRangeDisplay(from: string, to: string) { if (from && to) return `${from} – ${to}`; if (from) return `${from} – Select end date`; return 'dd/mm/yyyy – dd/mm/yyyy'; }
function parseIsoDate(value: string) { return new Date(`${value}T00:00:00`); }
function startOfMonth(value: Date) { return new Date(value.getFullYear(), value.getMonth(), 1); }
function addMonths(value: Date, amount: number) { return new Date(value.getFullYear(), value.getMonth() + amount, 1); }
function formatCalendarMonth(value: Date) { return new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(value); }
function formatCalendarDate(value: string) { return new Intl.DateTimeFormat('en-PH', { dateStyle: 'full' }).format(parseIsoDate(value)); }
function calendarDays(month: Date): (string | null)[] { const first = startOfMonth(month); const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); return [...Array(first.getDay()).fill(null), ...Array.from({ length: count }, (_, index) => localIsoDate(new Date(month.getFullYear(), month.getMonth(), index + 1)))]; }
function SortButton({ label, field, activeField, direction, onSort }: { label: string; field: 'time' | 'amount'; activeField: 'time' | 'amount'; direction: 'asc' | 'desc'; onSort: (field: 'time' | 'amount') => void }) { const active = field === activeField; const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown; return <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-600 hover:text-slate-950">{label}<Icon className="h-3.5 w-3.5" /></button>; }
function sessionStatusLabel(status: string) { if (['Exited', 'Void', 'Cancelled'].includes(status)) return status === 'Exited' ? 'Closed session' : status; if (status === 'PaidExitWindow') return 'Awaiting exit'; if (status === 'OverstayDue') return 'Overstay'; return status; }
function sessionTone(status: string): 'green' | 'amber' | 'red' | 'blue' | 'neutral' { if (status === 'Exited') return 'neutral'; if (status === 'OverstayDue') return 'amber'; if (['Void', 'Cancelled'].includes(status)) return 'red'; if (status === 'PaidExitWindow') return 'green'; return 'neutral'; }
const selectClass = 'h-11 min-w-36 rounded-lg bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
