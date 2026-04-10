import React, { useState, useEffect } from 'react';
import { getAuditLogs, getAuditByUser, getAuditByModule, getAuditByAction, getAuditByDate, clearOldAuditLogs } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const ACTION_COLOR = {
  CREATE:'#16a34a', UPDATE:'#2563eb', DELETE:'#dc2626',
  LOGIN:'#7c3aed', LOGOUT:'#94a3b8', VIEW:'#0891b2', CANCEL:'#f59e0b'
};
const ACTION_ICON = {
  CREATE:'➕', UPDATE:'✏️', DELETE:'🗑️',
  LOGIN:'🔐', LOGOUT:'🚪', VIEW:'👁️', CANCEL:'❌'
};

const PAGE_SIZE = 20;

export default function AuditLogPage() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter,  setFilter]  = useState({ user:'', module:'', action:'all', fromDate:'', toDate:'', search:'' });
  const [page,    setPage]    = useState(1);
  const [confirmClear, setConfirmClear] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let res;
      if (filter.user)              res = await getAuditByUser(filter.user);
      else if (filter.module)       res = await getAuditByModule(filter.module);
      else if (filter.action !== 'all') res = await getAuditByAction(filter.action);
      else if (filter.fromDate && filter.toDate) res = await getAuditByDate(filter.fromDate, filter.toDate);
      else                          res = await getAuditLogs();
      setLogs(Array.isArray(res.data) ? res.data : []);
      setPage(1);
    } catch { toast.error('Failed to load audit logs'); }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const modules = [...new Set(logs.map(l => l.module).filter(Boolean))].sort();
  const users   = [...new Set(logs.map(l => l.username).filter(Boolean))].sort();

  const filtered = logs.filter(l => {
    if (filter.action !== 'all' && l.action !== filter.action) return false;
    if (filter.user   && l.username !== filter.user)   return false;
    if (filter.module && l.module   !== filter.module)  return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const match = (l.username||'').toLowerCase().includes(q)
        || (l.description||'').toLowerCase().includes(q)
        || (l.module||'').toLowerCase().includes(q)
        || (l.action||'').toLowerCase().includes(q)
        || (l.entityType||'').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const stats = {
    total:    logs.length,
    creates:  logs.filter(l => l.action === 'CREATE').length,
    updates:  logs.filter(l => l.action === 'UPDATE').length,
    deletes:  logs.filter(l => l.action === 'DELETE').length,
    logins:   logs.filter(l => l.action === 'LOGIN').length,
    payments: logs.filter(l => l.action === 'PAYMENT').length,
    returns:  logs.filter(l => l.action === 'RETURN').length,
  };

  const exportCSV = () => {
    const header = ['Timestamp','User','Action','Module','Description','Entity Type','Entity ID'];
    const rows   = filtered.map(l => [
      l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN') : '',
      l.username || '', l.action || '', l.module || '',
      (l.description || '').replace(/,/g,'|'), l.entityType || '', l.entityId || ''
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} records`);
  };

  const clearFilters = () => {
    setFilter({ user:'', module:'', action:'all', fromDate:'', toDate:'', search:'' });
    setPage(1);
  };

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:12, marginBottom:16 }}>
        {[
          ['Total',    stats.total,    '#1a4f8a','📋'],
          ['Created',  stats.creates,  '#16a34a','➕'],
          ['Updated',  stats.updates,  '#2563eb','✏️'],
          ['Deleted',  stats.deletes,  '#dc2626','🗑️'],
          ['Payments', stats.payments, '#059669','💰'],
          ['Returns',  stats.returns,  '#7c3aed','↩️'],
          ['Logins',   stats.logins,   '#f59e0b','🔐'],
        ].map(([l,v,c,i]) => (
          <div key={l} style={{ background:'white', border:`2px solid ${c}20`, borderTop:`4px solid ${c}`, borderRadius:8, padding:'10px 14px' }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{i}</div>
            <div style={{ fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1 }}>{l}</div>
            <div style={{ fontWeight:800, color:c, fontSize:18 }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">🔍 Audit Trail — System Activity Log</span>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-outline" onClick={exportCSV} style={{ fontSize:12 }} disabled={filtered.length===0}>
              📥 Export CSV ({filtered.length})
            </button>
            <button className="btn btn-outline" onClick={fetchLogs} disabled={loading} style={{ fontSize:12 }}>
              {loading ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
            <button className="btn btn-outline" onClick={() => setConfirmClear({ count: logs.length })} disabled={loading || logs.length === 0} style={{ fontSize:12, borderColor: '#dc2626', color: '#dc2626' }}>
              🗑️ Clear Old Logs
            </button>
          </div>
        </div>
        <div className="card-body">

          {/* Search Bar */}
          <div style={{ marginBottom:12 }}>
            <input
              type="text"
              placeholder="🔍  Search by user, action, module, description..."
              value={filter.search}
              onChange={e => { setFilter({...filter, search:e.target.value}); setPage(1); }}
              style={{ width:'100%', height:36, fontSize:13, padding:'0 12px', border:'1.5px solid #e2e8f0', borderRadius:8, outline:'none', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor='#2563eb'}
              onBlur={e => e.target.style.borderColor='#e2e8f0'}
            />
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16, padding:'12px 14px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:3 }}>USER</label>
              <select value={filter.user} onChange={e => { setFilter({...filter, user:e.target.value}); setPage(1); }} style={{ height:30, fontSize:12, minWidth:130 }}>
                <option value="">All Users</option>
                {users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:3 }}>MODULE</label>
              <select value={filter.module} onChange={e => { setFilter({...filter, module:e.target.value}); setPage(1); }} style={{ height:30, fontSize:12, minWidth:130 }}>
                <option value="">All Modules</option>
                {modules.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:3 }}>ACTION</label>
              <select value={filter.action} onChange={e => { setFilter({...filter, action:e.target.value}); setPage(1); }} style={{ height:30, fontSize:12 }}>
                <option value="all">All Actions</option>
                {['CREATE','UPDATE','DELETE','PAYMENT','RETURN','LOGIN','LOGOUT','CANCEL'].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:3 }}>FROM DATE</label>
              <input type="date" value={filter.fromDate} onChange={e => setFilter({...filter, fromDate:e.target.value})} style={{ height:30, fontSize:12 }} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:3 }}>TO DATE</label>
              <input type="date" value={filter.toDate} onChange={e => setFilter({...filter, toDate:e.target.value})} style={{ height:30, fontSize:12 }} />
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:6 }}>
              <button className="btn btn-primary" onClick={fetchLogs} disabled={loading} style={{ height:30, fontSize:12 }}>Search</button>
              <button className="btn btn-outline" onClick={clearFilters} style={{ height:30, fontSize:12 }}>Clear</button>
            </div>
          </div>

          {/* Info bar */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontSize:12, color:'#64748b' }}>
              Showing <strong>{paginated.length}</strong> of <strong>{filtered.length}</strong> events
              {filtered.length !== logs.length && ` (filtered from ${logs.length} total)`}
            </div>
            {totalPages > 1 && (
              <div style={{ fontSize:12, color:'#64748b' }}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </div>
            )}
          </div>

          {/* Log Table */}
          {paginated.length > 0 ? (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width:140 }}>Timestamp</th>
                      <th style={{ width:100 }}>User</th>
                      <th style={{ width:80 }}>Action</th>
                      <th style={{ width:110 }}>Module</th>
                      <th>Description</th>
                      <th style={{ width:120 }}>Entity / ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((log, i) => {
                      const color = ACTION_COLOR[log.action] || '#94a3b8';
                      const icon  = ACTION_ICON[log.action]  || '📌';
                      const ts    = log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '—';
                      return (
                        <tr key={log.id || i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                          <td style={{ fontSize:11, color:'#64748b', whiteSpace:'nowrap' }}>{ts}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                              <span style={{ background:'#1a4f8a', color:'white', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
                                {(log.username || '?').charAt(0).toUpperCase()}
                              </span>
                              <span style={{ fontSize:12, fontWeight:600 }}>{log.username || '—'}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ background:`${color}15`, color, border:`1px solid ${color}40`, padding:'3px 8px', borderRadius:12, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
                              {icon} {log.action || '—'}
                            </span>
                          </td>
                          <td>
                            <span style={{ background:'#f0f4ff', color:'#1a4f8a', padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:600 }}>
                              {log.module || '—'}
                            </span>
                          </td>
                          <td style={{ fontSize:12, maxWidth:300 }}>
                            <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={log.description}>
                              {log.description || '—'}
                            </div>
                          </td>
                          <td style={{ fontSize:11, color:'#94a3b8', wordBreak:'break-all' }}>
                            {log.entityType && <div style={{ fontWeight:600, color:'#64748b' }}>{log.entityType}</div>}
                            {log.entityId && <div>{String(log.entityId).substring(0,12)}{String(log.entityId).length > 12 ? '...' : ''}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:6, marginTop:16, paddingTop:12, borderTop:'1px solid #f1f5f9' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => setPage(1)}
                    disabled={page===1}
                    style={{ fontSize:11, padding:'4px 10px' }}
                  >« First</button>
                  <button
                    className="btn btn-outline"
                    onClick={() => setPage(p => Math.max(1,p-1))}
                    disabled={page===1}
                    style={{ fontSize:11, padding:'4px 10px' }}
                  >‹ Prev</button>

                  {/* Page numbers */}
                  {Array.from({length: Math.min(7, totalPages)}, (_,i) => {
                    let p = page - 3 + i;
                    if (p < 1) p = 1 + i;
                    if (p > totalPages) p = totalPages - (6-i);
                    return p;
                  }).filter((p,i,arr) => p >= 1 && p <= totalPages && arr.indexOf(p)===i).map(p => (
                    <button key={p}
                      onClick={() => setPage(p)}
                      style={{
                        fontSize:12, padding:'4px 10px', border:'1px solid', borderRadius:6, cursor:'pointer',
                        background: page===p ? '#1a4f8a' : 'white',
                        color:      page===p ? 'white'   : '#374151',
                        borderColor:page===p ? '#1a4f8a' : '#d1d5db',
                        fontWeight: page===p ? 700 : 400,
                      }}
                    >{p}</button>
                  ))}

                  <button
                    className="btn btn-outline"
                    onClick={() => setPage(p => Math.min(totalPages,p+1))}
                    disabled={page===totalPages}
                    style={{ fontSize:11, padding:'4px 10px' }}
                  >Next ›</button>
                  <button
                    className="btn btn-outline"
                    onClick={() => setPage(totalPages)}
                    disabled={page===totalPages}
                    style={{ fontSize:11, padding:'4px 10px' }}
                  >Last »</button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>
                {filter.search || filter.user || filter.module || filter.action !== 'all' ? 'No matching results' : 'No audit logs found'}
              </div>
              <div style={{ fontSize:12 }}>
                {filter.search ? `No results for "${filter.search}"` : 'System activity will appear here as users perform actions'}
              </div>
              {(filter.search || filter.user || filter.module) && (
                <button className="btn btn-outline" onClick={clearFilters} style={{ marginTop:12, fontSize:12 }}>Clear Filters</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Clear Old Logs */}
      <ConfirmModal
        open={!!confirmClear}
        title="Clear Old Audit Logs?"
        message="All audit logs older than 90 days will be permanently deleted."
        details={confirmClear ? `Total logs in system: ${confirmClear.count}` : ''}
        confirmLabel="Yes, Clear Old Logs"
        type="danger"
        onConfirm={async () => {
          try {
            await clearOldAuditLogs();
            toast.success('Old audit logs cleared successfully');
            fetchLogs();
          } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to clear old logs');
          }
          setConfirmClear(null);
        }}
        onCancel={() => setConfirmClear(null)}
      />
    </div>
  );
}
