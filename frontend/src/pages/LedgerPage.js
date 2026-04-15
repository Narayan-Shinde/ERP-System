import { printReport } from '../utils/printUtils';
import React, { useState, useEffect } from 'react';
import { getLedgers, addLedger, updateLedger, getLedgerStatement, getAllLedgerTransactions, addLedgerTransaction, updateLedgerTransaction, deleteLedgerTransaction } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useFY } from '../context/FYContext';
import ConfirmModal from '../components/ConfirmModal';

const fmt = n => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];

const GROUPS = ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY'];
const SUB_GROUPS = {
  ASSET:     ['Current Assets', 'Fixed Assets', 'Investments', 'Cash & Bank'],
  LIABILITY: ['Current Liabilities', 'Long-term Liabilities', 'Capital'],
  INCOME:    ['Sales Revenue', 'Other Income'],
  EXPENSE:   ['Cost of Goods Sold', 'Operating Expenses', 'Financial Expenses'],
  EQUITY:    ['Share Capital', 'Retained Earnings'],
};
const GC = { ASSET: '#2563eb', LIABILITY: '#dc2626', INCOME: '#16a34a', EXPENSE: '#d97706', EQUITY: '#7c3aed' };

export default function LedgerPage() {
  const { selectedFY } = useFY();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles?.includes('ROLE_ADMIN');

  const [confirmDeleteLedger, setConfirmDeleteLedger] = useState(null);
  const [confirmDeleteTxn, setConfirmDeleteTxn] = useState(null);
  const [editTxnId, setEditTxnId] = useState(null);
  const [tab, setTab]       = useState('accounts');
  const [ledgers, setLedgers] = useState([]);
  const [acFilter, setAcFilter] = useState('');
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({ accountGroup: 'ASSET' });

  const [stmtLedgerId, setStmtLedgerId] = useState('');
  const [stmtFrom, setStmtFrom]         = useState('');
  const [stmtTo, setStmtTo]             = useState('');
  const [stmtData, setStmtData]         = useState(null);
  const [stmtLoading, setStmtLoading]   = useState(false);

  const [allTxns, setAllTxns]     = useState([]);
  const [allFrom, setAllFrom]     = useState('');
  const [allTo, setAllTo]         = useState('');
  const [allLoading, setAllLoading] = useState(false);
  const [allLoaded, setAllLoaded]   = useState(false);

  useEffect(() => { fetchLedgers(); }, []);

  const fetchLedgers = () =>
    getLedgers().then(r => setLedgers(r.data || [])).catch(() => {});

  const fetchStatement = async (ledgerId, from, to) => {
    if (!ledgerId) { toast.error('Ledger Account select करा'); return; }
    setStmtLoading(true);
    setStmtData(null);
    try {
      const params = {};
      if (from) params.fromDate = from;
      if (to)   params.toDate   = to;
      const r = await getLedgerStatement(ledgerId, params);
      const data = r.data;
      if (!data || !data.transactions) {
        toast.error('Invalid response from server');
        setStmtLoading(false);
        return;
      }
      setStmtData(data);
      if (data.transactions.length === 0)
        toast('या period मध्ये transactions नाहीत', { icon: 'ℹ️' });
    } catch (e) {
      toast.error('Statement load failed — ' + (e.response?.data?.message || e.message || 'unknown error'));
    }
    setStmtLoading(false);
  };

  const fetchAllTxns = async () => {
    setAllLoading(true);
    setAllLoaded(false);
    try {
      const params = {};
      if (allFrom) params.fromDate = allFrom;
      if (allTo)   params.toDate   = allTo;
      // Date range नाही तर FY filter लावतो
      if (!allFrom && !allTo && selectedFY.value !== 'ALL') {
        params.fromDate = selectedFY.from;
        params.toDate   = selectedFY.to;
      }
      const r = await getAllLedgerTransactions(params);
      const data = Array.isArray(r.data) ? r.data : [];
      setAllTxns(data);
      setAllLoaded(true);
      if (data.length === 0) toast('कोणतेही transactions आढळले नाहीत', { icon: 'ℹ️' });
      else toast.success(`${data.length} transactions loaded`);
    } catch (e) {
      toast.error('Transactions load failed — ' + (e.response?.data?.message || e.message || 'unknown error'));
    }
    setAllLoading(false);
  };

  const saveLedger = async () => {
    if (!form.accountName?.trim()) { toast.error('Account Name आवश्यक'); return; }
    if (!form.accountGroup)        { toast.error('Account Group select करा'); return; }
    try {
      if (form.id) await updateLedger(form.id, form);
      else         await addLedger(form);
      toast.success('Ledger account saved!');
      setModal(null); setForm({ accountGroup: 'ASSET' }); fetchLedgers();
    } catch { toast.error('Save failed'); }
  };

  const deleteLedger = async () => {
    try {
      await updateLedger(confirmDeleteLedger.id, { ...confirmDeleteLedger, active: false });
      toast.success(`"${confirmDeleteLedger.accountName}" deactivated`);
      setConfirmDeleteLedger(null); fetchLedgers();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Cannot deactivate');
      setConfirmDeleteLedger(null);
    }
  };

  const saveTxn = async () => {
    if (!form.ledgerId)                            { toast.error('Ledger Account select करा'); return; }
    if (!form.amount || Number(form.amount) <= 0)  { toast.error('Amount > 0 हवा'); return; }
    if (!form.entryType)                           { toast.error('Debit/Credit select करा'); return; }
    if (!form.transactionDate)                     { toast.error('Date आवश्यक'); return; }
    const payload = {
      ledgerAccountId:   form.ledgerId,
      ledgerAccountName: form.ledgerName,
      entryType:         form.entryType,
      amount:            Number(form.amount),
      narration:         form.narration,
      voucherNumber:     form.voucherNumber,
      referenceNumber:   form.referenceNumber,
      transactionDate:   form.transactionDate || today(),
      financialYear:     selectedFY.label,
    };
    try {
      if (editTxnId) {
        await updateLedgerTransaction(editTxnId, payload);
        toast.success('Transaction updated!');
      } else {
        await addLedgerTransaction(payload);
        toast.success('Transaction saved!');
      }
      setModal(null); setForm({ accountGroup: 'ASSET' }); setEditTxnId(null);
      if (tab === 'statement' && stmtLedgerId) fetchStatement(stmtLedgerId, stmtFrom, stmtTo);
      if (tab === 'transactions' && allLoaded)  fetchAllTxns();
    } catch { toast.error('Save failed'); }
  };

  const deleteTxn = async () => {
    try {
      await deleteLedgerTransaction(confirmDeleteTxn.id);
      toast.success('Transaction deleted!');
      setConfirmDeleteTxn(null);
      if (tab === 'statement' && stmtLedgerId) fetchStatement(stmtLedgerId, stmtFrom, stmtTo);
      if (allLoaded) fetchAllTxns();
    } catch(e) {
      toast.error(e.response?.data?.error || 'Delete failed');
      setConfirmDeleteTxn(null);
    }
  };

  const filtered = acFilter ? ledgers.filter(l => l.accountGroup === acFilter) : ledgers;

  const stmtAccount = stmtData?.account || null;
  const stmtTxns    = stmtData?.transactions || [];
  const isDebitNature = stmtAccount && (stmtAccount.accountGroup === 'ASSET' || stmtAccount.accountGroup === 'EXPENSE');
  let runBal = stmtAccount?.openingBalance || 0;
  const stmtWithBal = stmtTxns.map(t => {
    runBal = t.entryType === 'DEBIT'
      ? (isDebitNature ? runBal + t.amount : runBal - t.amount)
      : (isDebitNature ? runBal - t.amount : runBal + t.amount);
    return { ...t, balance: runBal };
  });
  const stmtDebit  = stmtData?.totalDebit  || 0;
  const stmtCredit = stmtData?.totalCredit || 0;

  const allDebit  = allTxns.filter(t => t.entryType === 'DEBIT').reduce((s, t) => s + (t.amount || 0), 0);
  const allCredit = allTxns.filter(t => t.entryType === 'CREDIT').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <>
    <div>
      {/* TABS */}
      <div className="tabs">
        <div className={`tab ${tab === 'accounts'     ? 'active' : ''}`} onClick={() => setTab('accounts')}>📒 Ledger Accounts</div>
        <div className={`tab ${tab === 'statement'    ? 'active' : ''}`} onClick={() => setTab('statement')}>📋 Ledger Statement</div>
        <div className={`tab ${tab === 'transactions' ? 'active' : ''}`} onClick={() => setTab('transactions')}>💳 All Transactions</div>
      </div>

      {tab === 'accounts' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📒 Chart of Accounts</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={acFilter} onChange={e => setAcFilter(e.target.value)} style={{ height: 32 }}>
                <option value="">All Groups</option>
                {GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
              <button className="btn btn-primary"
                onClick={() => { setForm({ accountGroup: 'ASSET' }); setModal('ledger'); }}>
                + New Account
              </button>
            </div>
          </div>
          <div className="card-body">
            {/* Group summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
              {GROUPS.map(g => {
                const cnt   = ledgers.filter(l => l.accountGroup === g).length;
                const total = ledgers.filter(l => l.accountGroup === g).reduce((s, l) => s + (l.currentBalance || 0), 0);
                return (
                  <div key={g} style={{ background: 'white', border: `2px solid ${GC[g]}20`, borderTop: `4px solid ${GC[g]}`, borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}
                    onClick={() => setAcFilter(acFilter === g ? '' : g)}>
                    <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{g}</div>
                    <div style={{ fontWeight: 700, color: GC[g], fontSize: 13 }}>{fmt(total)}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{cnt} accounts</div>
                  </div>
                );
              })}
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Code</th><th>Account Name</th><th>Group</th><th>Sub Group</th>
                    <th className="text-right">Opening</th><th className="text-right">Current Balance</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: 11, color: '#94a3b8' }}>{l.accountCode || '—'}</td>
                      <td><strong>{l.accountName}</strong></td>
                      <td>
                        <span style={{ background: GC[l.accountGroup] + '20', color: GC[l.accountGroup], padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                          {l.accountGroup}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{l.subGroup || '—'}</td>
                      <td className="text-right" style={{ fontSize: 12 }}>
                        {fmt(l.openingBalance || 0)} <span style={{ color: '#94a3b8', fontSize: 10 }}>{l.openingBalanceType}</span>
                      </td>
                      <td className="text-right">
                        <strong style={{ color: (l.currentBalance || 0) >= 0 ? '#059669' : '#dc2626' }}>
                          {fmt(l.currentBalance || 0)} <span style={{ fontSize: 10, opacity: .7 }}>{l.currentBalanceType}</span>
                        </strong>
                      </td>
                      <td>
                        <button className="btn btn-outline" style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => { setForm(l); setModal('ledger'); }}>✏️ Edit</button>
                        {!l.isSystem && isAdmin && (
                          <button className="btn btn-outline" style={{ padding: '3px 8px', fontSize: 11, marginLeft: 4, borderColor: '#dc2626', color: '#dc2626' }}
                            onClick={() => setConfirmDeleteLedger(l)}>🗑️</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center" style={{ padding: 40, color: '#94a3b8' }}>
                      <div style={{ fontSize: 36 }}>📒</div><div>No accounts found</div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'statement' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Ledger Statement</span>
            {stmtData && stmtTxns.length > 0 && (
              <button className="btn btn-outline" style={{ fontSize: 12 }}
                onClick={() => printReport({
                  title: 'Ledger Statement',
                  subtitle: `Account: ${stmtAccount?.accountName || ''} | ${stmtFrom || 'All'} to ${stmtTo || 'All'}`,
                  summaryCards: [
                    { label: 'Account',        value: stmtAccount?.accountName || '—' },
                    { label: 'Group',          value: stmtAccount?.accountGroup || '—' },
                    { label: 'Total Debit',    value: fmt(stmtDebit),  color: '#1a4f8a' },
                    { label: 'Total Credit',   value: fmt(stmtCredit), color: '#16a34a' },
                    { label: 'Net Balance',    value: fmt(Math.abs(stmtDebit - stmtCredit)) + ' ' + (stmtDebit >= stmtCredit ? 'Dr' : 'Cr'), color: '#7c3aed' },
                  ],
                  tableHeaders: [
                    { label: 'Date' }, { label: 'Voucher#' }, { label: 'Narration' }, { label: 'Type' },
                    { label: 'Debit ₹', right: true }, { label: 'Credit ₹', right: true }, { label: 'Balance ₹', right: true },
                  ],
                  tableRows: stmtWithBal.map(t => [
                    { value: t.transactionDate || '—' },
                    { value: t.voucherNumber   || '—' },
                    { value: t.narration       || '—' },
                    { value: t.voucherType     || '—' },
                    { value: t.entryType === 'DEBIT'  ? fmt(t.amount) : '—', right: true, style: t.entryType === 'DEBIT'  ? 'color:#1a4f8a;font-weight:700' : 'color:#94a3b8' },
                    { value: t.entryType === 'CREDIT' ? fmt(t.amount) : '—', right: true, style: t.entryType === 'CREDIT' ? 'color:#16a34a;font-weight:700' : 'color:#94a3b8' },
                    { value: fmt(Math.abs(t.balance)) + ' ' + (t.balance >= 0 ? 'Dr' : 'Cr'), right: true, style: 'font-weight:600' },
                  ]),
                  footerNote: `Opening Balance: ${fmt(stmtAccount?.openingBalance || 0)} ${stmtAccount?.openingBalanceType || ''}`,
                })}>🖨️ Print
              </button>
            )}
          </div>
          <div className="card-body">

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ledger Account *</label>
                <select value={stmtLedgerId}
                  onChange={e => {
                    const id = e.target.value;
                    setStmtLedgerId(id);
                    setStmtData(null);
                    if (id) fetchStatement(id, stmtFrom, stmtTo);
                  }}
                  style={{ height: 36, minWidth: 250, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px' }}>
                  <option value="">-- Select Account --</option>
                  {GROUPS.map(g => (
                    <optgroup key={g} label={g}>
                      {ledgers.filter(l => l.accountGroup === g).map(l => (
                        <option key={l.id} value={l.id}>{l.accountName}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>From</label>
                <input type="date" value={stmtFrom} onChange={e => setStmtFrom(e.target.value)}
                  style={{ height: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>To</label>
                <input type="date" value={stmtTo} onChange={e => setStmtTo(e.target.value)}
                  style={{ height: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px' }} />
              </div>
              <button className="btn btn-primary" style={{ height: 36 }}
                disabled={!stmtLedgerId || stmtLoading}
                onClick={() => fetchStatement(stmtLedgerId, stmtFrom, stmtTo)}>
                {stmtLoading ? 'Loading...' : '🔍 View Statement'}
              </button>
              {stmtLedgerId && (
                <button className="btn btn-outline" style={{ height: 36, fontSize: 12 }}
                  onClick={() => { setStmtLedgerId(''); setStmtData(null); setStmtFrom(''); setStmtTo(''); }}>
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Loading */}
            {stmtLoading && (
              <div className="text-center" style={{ padding: 48, color: '#64748b' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <div>Statement load होत आहे...</div>
              </div>
            )}

            {/* Statement table */}
            {!stmtLoading && stmtData && stmtTxns.length > 0 && (
              <>
                {/* Account header */}
                <div style={{ background: '#1a4f8a', color: 'white', padding: '10px 16px', borderRadius: '6px 6px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{stmtAccount.accountName}</div>
                    <div style={{ fontSize: 11, opacity: .8 }}>{stmtAccount.accountGroup} — {stmtAccount.subGroup || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, opacity: .8 }}>Current Balance</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(stmtAccount.currentBalance || 0)} {stmtAccount.currentBalanceType}</div>
                  </div>
                </div>

                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 14px' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Total Debit</div>
                    <div style={{ fontWeight: 700, color: '#1a4f8a', fontSize: 14 }}>{fmt(stmtDebit)}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 14px' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Total Credit</div>
                    <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 14 }}>{fmt(stmtCredit)}</div>
                  </div>
                  <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '8px 14px' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Net Balance</div>
                    <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: 14 }}>{fmt(Math.abs(stmtDebit - stmtCredit))} {stmtDebit >= stmtCredit ? 'Dr' : 'Cr'}</div>
                  </div>
                </div>

                {/* Table */}
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th><th>Voucher#</th><th>Narration / Type</th>
                        <th className="text-right">Debit ₹</th><th className="text-right">Credit ₹</th><th className="text-right">Balance ₹</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: '#f8fafc', fontStyle: 'italic' }}>
                        <td colSpan={5} style={{ padding: '6px 12px', color: '#64748b', fontSize: 12 }}>Opening Balance</td>
                        <td className="text-right" style={{ fontWeight: 600 }}>
                          {fmt(stmtAccount.openingBalance || 0)} {stmtAccount.openingBalanceType}
                        </td>
                      </tr>
                      {stmtWithBal.map((t, i) => (
                        <tr key={t.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ fontSize: 12 }}>{t.transactionDate}</td>
                          <td style={{ fontSize: 11, color: '#1a4f8a', fontWeight: 600 }}>{t.voucherNumber || '—'}</td>
                          <td style={{ fontSize: 12 }}>
                            <div>{t.narration || '—'}</div>
                            {t.voucherType && <div style={{ fontSize: 10, color: '#94a3b8' }}>{t.voucherType}</div>}
                          </td>
                          <td className="text-right" style={{ color: '#1a4f8a', fontWeight: t.entryType === 'DEBIT' ? 700 : 400 }}>
                            {t.entryType === 'DEBIT' ? fmt(t.amount) : '—'}
                          </td>
                          <td className="text-right" style={{ color: '#16a34a', fontWeight: t.entryType === 'CREDIT' ? 700 : 400 }}>
                            {t.entryType === 'CREDIT' ? fmt(t.amount) : '—'}
                          </td>
                          <td className="text-right" style={{ fontWeight: 600, color: t.balance >= 0 ? '#059669' : '#dc2626' }}>
                            {fmt(Math.abs(t.balance))} {t.balance >= 0 ? 'Dr' : 'Cr'}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: '#1a4f8a', color: 'white', fontWeight: 700 }}>
                        <td colSpan={3} style={{ padding: '8px 12px' }}>CLOSING BALANCE</td>
                        <td className="text-right" style={{ padding: '8px 12px' }}>{fmt(stmtDebit)}</td>
                        <td className="text-right" style={{ padding: '8px 12px' }}>{fmt(stmtCredit)}</td>
                        <td className="text-right" style={{ padding: '8px 12px' }}>
                          {fmt(Math.abs(stmtDebit - stmtCredit))} {stmtDebit >= stmtCredit ? 'Dr' : 'Cr'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Empty states */}
            {!stmtLoading && !stmtLedgerId && (
              <div className="text-center" style={{ padding: 56, color: '#94a3b8' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Ledger Account select करा</div>
                <div style={{ fontSize: 13 }}>Select केल्यावर statement आपोआप load होईल</div>
              </div>
            )}
            {!stmtLoading && stmtLedgerId && stmtData && stmtTxns.length === 0 && (
              <div className="text-center" style={{ padding: 40, color: '#94a3b8' }}>
                <div style={{ fontSize: 36 }}>📋</div>
                <div style={{ marginTop: 8, fontWeight: 600 }}>{stmtAccount?.accountName}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>या period मध्ये कोणतेही transactions नाहीत</div>
                <div style={{ fontSize: 12, marginTop: 4, color: '#cbd5e1' }}>Date range बदला किंवा blank ठेवा — सगळे दिसतील</div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">💳 All Ledger Transactions</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {allTxns.length > 0 && (
                <button className="btn btn-outline" style={{ fontSize: 12 }}
                  onClick={() => printReport({
                    title: 'All Ledger Transactions',
                    subtitle: `${allFrom ? 'From: ' + allFrom : ''} ${allTo ? 'To: ' + allTo : ''}`.trim() || 'All Dates',
                    tableHeaders: [
                      { label: 'Date' }, { label: 'Voucher#' }, { label: 'Ledger Account' },
                      { label: 'Narration' }, { label: 'Debit ₹', right: true }, { label: 'Credit ₹', right: true },
                    ],
                    tableRows: allTxns.map(t => [
                      { value: t.transactionDate    || '—' },
                      { value: t.voucherNumber      || '—' },
                      { value: t.ledgerAccountName  || '—' },
                      { value: t.narration          || '—' },
                      { value: t.entryType === 'DEBIT'  ? fmt(t.amount) : '—', right: true, style: t.entryType === 'DEBIT'  ? 'color:#1a4f8a;font-weight:600' : '' },
                      { value: t.entryType === 'CREDIT' ? fmt(t.amount) : '—', right: true, style: t.entryType === 'CREDIT' ? 'color:#16a34a;font-weight:600' : '' },
                    ]),
                    footerNote: `Total Debit: ${fmt(allDebit)} | Total Credit: ${fmt(allCredit)} | Total Entries: ${allTxns.length}`,
                  })}>🖨️ Print
                </button>
              )}
              <button className="btn btn-primary" onClick={() => { setForm({}); setEditTxnId(null); setModal('txn'); }}>+ Manual Entry</button>
            </div>
          </div>
          <div className="card-body">

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>From Date</label>
                <input type="date" value={allFrom} onChange={e => setAllFrom(e.target.value)}
                  style={{ height: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>To Date</label>
                <input type="date" value={allTo} onChange={e => setAllTo(e.target.value)}
                  style={{ height: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px' }} />
              </div>
              <button className="btn btn-primary" style={{ height: 36 }} onClick={fetchAllTxns} disabled={allLoading}>
                {allLoading ? 'Loading...' : '🔄 Load All'}
              </button>
              {allLoaded && (
                <button className="btn btn-outline" style={{ height: 36, fontSize: 12 }}
                  onClick={() => { setAllTxns([]); setAllFrom(''); setAllTo(''); setAllLoaded(false); }}>
                  ✕ Clear
                </button>
              )}
              <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>
                💡 Date optional — blank ठेवल्यास सगळे transactions दिसतील
              </span>
            </div>

            {/* Loading */}
            {allLoading && (
              <div className="text-center" style={{ padding: 48, color: '#64748b' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <div>Transactions load होत आहेत...</div>
              </div>
            )}

            {/* Table */}
            {!allLoading && allTxns.length > 0 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 14px' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Total Debit</div>
                    <div style={{ fontWeight: 700, color: '#1a4f8a', fontSize: 14 }}>{fmt(allDebit)}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 14px' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Total Credit</div>
                    <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 14 }}>{fmt(allCredit)}</div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 14px' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Total Entries</div>
                    <div style={{ fontWeight: 700, color: '#64748b', fontSize: 14 }}>{allTxns.length}</div>
                  </div>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th><th>Voucher#</th><th>Ledger Account</th><th>Narration</th>
                        <th className="text-right">Debit ₹</th><th className="text-right">Credit ₹</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTxns.map((t, i) => (
                        <tr key={t.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ fontSize: 12 }}>{t.transactionDate}</td>
                          <td style={{ fontSize: 11, color: '#1a4f8a', fontWeight: 600 }}>{t.voucherNumber || '—'}</td>
                          <td>
                            <strong>{t.ledgerAccountName || '—'}</strong>
                            {t.voucherType && <div style={{ fontSize: 10, color: '#94a3b8' }}>{t.voucherType}</div>}
                          </td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>{t.narration || '—'}</td>
                          <td className="text-right" style={{ color: '#1a4f8a', fontWeight: t.entryType === 'DEBIT' ? 700 : 400 }}>
                            {t.entryType === 'DEBIT' ? fmt(t.amount) : '—'}
                          </td>
                          <td className="text-right" style={{ color: '#16a34a', fontWeight: t.entryType === 'CREDIT' ? 700 : 400 }}>
                            {t.entryType === 'CREDIT' ? fmt(t.amount) : '—'}
                          </td>
                          <td>
                            <div style={{display:'flex',gap:4}}>
                              <button className="btn btn-outline" style={{padding:'2px 7px',fontSize:11}}
                                onClick={()=>{
                                  setForm({
                                    ledgerId: t.ledgerAccountId,
                                    ledgerName: t.ledgerAccountName,
                                    entryType: t.entryType,
                                    amount: t.amount,
                                    narration: t.narration||'',
                                    voucherNumber: t.voucherNumber||'',
                                    referenceNumber: t.referenceNumber||'',
                                    transactionDate: t.transactionDate,
                                  });
                                  setEditTxnId(t.id);
                                  setModal('txn');
                                }}>✏️</button>
                              {isAdmin && (
                                <button className="btn btn-outline" style={{padding:'2px 7px',fontSize:11,color:'#dc2626',borderColor:'#fca5a5'}}
                                  onClick={()=>setConfirmDeleteTxn(t)}>🗑️</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f0f4ff', fontWeight: 700, borderTop: '2px solid #1a4f8a' }}>
                        <td colSpan={4} style={{ padding: '8px 12px' }}>TOTALS ({allTxns.length} entries)</td>
                        <td className="text-right" style={{ color: '#1a4f8a' }}>{fmt(allDebit)}</td>
                        <td className="text-right" style={{ color: '#16a34a' }}>{fmt(allCredit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Empty state */}
            {!allLoading && !allLoaded && (
              <div className="text-center" style={{ padding: 56, color: '#94a3b8' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>💳</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>All Ledger Transactions</div>
                <div style={{ fontSize: 13 }}>"Load All" click करा — date range optional आहे</div>
              </div>
            )}
            {!allLoading && allLoaded && allTxns.length === 0 && (
              <div className="text-center" style={{ padding: 40, color: '#94a3b8' }}>
                <div style={{ fontSize: 36 }}>💳</div>
                <div style={{ marginTop: 8 }}>कोणतेही transactions आढळले नाहीत</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Date range बदला किंवा blank ठेवा</div>
              </div>
            )}
          </div>
        </div>
      )}

      {modal === 'ledger' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{form.id ? 'Edit' : 'Create'} Ledger Account</h3>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Account Code <span style={{ fontSize: 10, color: '#94a3b8' }}>(optional — auto)</span></label>
                  <input value={form.accountCode || ''} onChange={e => setForm({ ...form, accountCode: e.target.value })} placeholder="e.g. 1001" />
                </div>
                <div className="form-group">
                  <label>Account Name *</label>
                  <input value={form.accountName || ''} onChange={e => setForm({ ...form, accountName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Account Group *</label>
                  <select value={form.accountGroup || 'ASSET'} onChange={e => setForm({ ...form, accountGroup: e.target.value, subGroup: '' })}>
                    {GROUPS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Sub Group</label>
                  <select value={form.subGroup || ''} onChange={e => setForm({ ...form, subGroup: e.target.value })}>
                    <option value="">Select Sub Group</option>
                    {(SUB_GROUPS[form.accountGroup] || []).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Opening Balance (₹)</label>
                  <input type="number" value={form.openingBalance || ''} onChange={e => setForm({ ...form, openingBalance: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Balance Type</label>
                  <select value={form.openingBalanceType || 'DEBIT'} onChange={e => setForm({ ...form, openingBalanceType: e.target.value })}>
                    <option value="DEBIT">DEBIT (Dr)</option>
                    <option value="CREDIT">CREDIT (Cr)</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Description</label>
                  <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveLedger}>Save Account</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'txn' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editTxnId ? "✏️ Edit Transaction" : "📝 Manual Ledger Entry"}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#fef9c3', border: '1px solid #fcd34d', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#92400e' }}>
                💡 Double-entry साठी Accounting Vouchers वापरा. हे direct manual adjustment साठी आहे.
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Ledger Account *</label>
                  <select value={form.ledgerId || ''} onChange={e => {
                    const l = ledgers.find(x => x.id === e.target.value);
                    setForm({ ...form, ledgerId: e.target.value, ledgerName: l?.accountName || '' });
                  }}>
                    <option value="">-- Select Account --</option>
                    {GROUPS.map(g => (
                      <optgroup key={g} label={g}>
                        {ledgers.filter(l => l.accountGroup === g).map(l => (
                          <option key={l.id} value={l.id}>{l.accountName}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Transaction Date</label>
                  <input type="date" value={form.transactionDate || today()} onChange={e => setForm({ ...form, transactionDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Entry Type *</label>
                  <select value={form.entryType || 'DEBIT'} onChange={e => setForm({ ...form, entryType: e.target.value })}>
                    <option value="DEBIT">DEBIT (Dr)</option>
                    <option value="CREDIT">CREDIT (Cr)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Voucher Number</label>
                  <input value={form.voucherNumber || ''} onChange={e => setForm({ ...form, voucherNumber: e.target.value })} placeholder="Optional" />
                </div>
                <div className="form-group">
                  <label>Reference</label>
                  <input value={form.referenceNumber || ''} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Narration *</label>
                  <input value={form.narration || ''} onChange={e => setForm({ ...form, narration: e.target.value })} placeholder="Transaction describe करा" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setModal(null); setEditTxnId(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={saveTxn}>{editTxnId ? "💾 Update" : "💾 Save Entry"}</button>
            </div>
          </div>
        </div>
      )}
    </div>

    <ConfirmModal
      open={!!confirmDeleteTxn} title="Delete Transaction?" type="danger"
      message="हा transaction permanently delete होईल."
      details={confirmDeleteTxn ? `${confirmDeleteTxn.voucherNumber||'Manual'} — ${confirmDeleteTxn.ledgerAccountName||''} — ${fmt(confirmDeleteTxn.amount||0)}` : ''}
      confirmLabel="Yes, Delete" onConfirm={deleteTxn} onCancel={()=>setConfirmDeleteTxn(null)}/>

    <ConfirmModal
      open={!!confirmDeleteLedger}
      title="Deactivate Ledger Account?"
      message="हा ledger account deactivate होईल. Past transactions preserve होतील."
      details={confirmDeleteLedger ? `${confirmDeleteLedger.accountName} (${confirmDeleteLedger.accountCode || '—'})` : ''}
      confirmLabel="Yes, Deactivate" type="warning"
      onConfirm={deleteLedger} onCancel={() => setConfirmDeleteLedger(null)}
    />
    </>
  );
}
