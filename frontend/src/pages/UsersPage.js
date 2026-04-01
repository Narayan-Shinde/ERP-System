import React, { useState, useEffect } from 'react';
import { register, updateUser, deleteUser, toggleUserStatus, changePassword } from '../services/api';
import API from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const ROLES = [
  { value: 'ROLE_ADMIN',             label: 'Admin',             color: '#dc2626', desc: 'Full access to all modules' },
  { value: 'ROLE_ACCOUNTANT',        label: 'Accountant',        color: '#2563eb', desc: 'Purchase, Sales, Expense, Vouchers, Ledger, GST, Reports' },
  { value: 'ROLE_SALES_EXECUTIVE',   label: 'Sales Executive',   color: '#16a34a', desc: 'Customer master & Sales invoices only' },
  { value: 'ROLE_PURCHASE_EXECUTIVE',label: 'Purchase Executive',color: '#d97706', desc: 'Supplier master, Purchase & Inventory only' },
  { value: 'ROLE_MANAGER',           label: 'Manager',           color: '#7c3aed', desc: 'View-only: Reports, Dashboard, GST' },
];

const roleColor = r => ROLES.find(x => x.value === r)?.color || '#64748b';
const roleLabel = roles => {
  if (!roles || roles.length === 0) return 'Unknown';
  const r = Array.isArray(roles) ? roles[0] : roles;
  return ROLES.find(x => x.value === r)?.label || r.replace('ROLE_', '');
};

const validateUserForm = (form, users, editingId = null) => {
  // ── Required fields ──
  if (!form.fullName?.trim())  return 'Full Name required aahe!';
  if (!editingId && !form.username?.trim()) return 'Username required aahe!';
  if (!form.email?.trim())     return 'Email required aahe!';
  if (!form.phone?.trim())     return 'Phone number required aahe!';

  // ── Username: only alphanumeric + underscore, 3-20 chars ──
  if (!editingId && form.username?.trim()) {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username.trim()))
      return 'Username: 3-20 chars, only letters/numbers/underscore allowed';
  }

  // ── Email: proper pattern ──
  if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(form.email.trim()))
    return 'Email address invalid! Got: ' + form.email;

  // ── Phone: 10 digits, starts 6-9 ──
  const phone = form.phone.trim().replace(/[\s\-()]/g, '');
  if (!/^[6-9]\d{9}$/.test(phone))
    return 'Phone invalid! 10 digits, 6-9 se start honyapahijhe. Got: ' + form.phone;

  // ── Password: required on create, min 8 chars, must have number ──
  if (!editingId) {
    if (!form.password?.trim()) return 'Password required aahe!';
    if (form.password.length < 8) return 'Password min 8 characters cha hava!';
    if (!/\d/.test(form.password)) return 'Password madhe at least 1 number hava! (e.g. Admin@123)';
  }
  if (form.password && form.password.length > 0 && form.password.length < 8)
    return 'Password min 8 characters cha hava!';

  // ── Duplicate checks ──
  if (!editingId) {
    const dupUser  = users.find(u => u.username?.toLowerCase() === form.username?.trim().toLowerCase());
    if (dupUser)  return 'Username "' + form.username + '" already taken!';
    const dupEmail = users.find(u => u.email?.toLowerCase() === form.email.trim().toLowerCase());
    if (dupEmail) return 'Email "' + form.email + '" already registered by ' + dupEmail.fullName;
    const dupPhone = users.find(u => u.phone?.replace(/[\s\-()]/g,'') === phone);
    if (dupPhone) return 'Phone ' + phone + ' already registered by ' + dupPhone.fullName;
  } else {
    const dupEmail = users.find(u => u.email?.toLowerCase() === form.email.trim().toLowerCase() && u.id !== editingId);
    if (dupEmail) return 'Email "' + form.email + '" already registered by ' + dupEmail.fullName;
    const dupPhone = users.find(u => u.phone?.replace(/[\s\-()]/g,'') === phone && u.id !== editingId);
    if (dupPhone) return 'Phone ' + phone + ' already registered by ' + dupPhone.fullName;
  }
  return null;
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(false);

  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState({ role: 'ROLE_ACCOUNTANT' });
  const [editUser, setEditUser]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);

  const [pwForm, setPwForm]         = useState({});
  const [showPw, setShowPw]         = useState({ old: false, new: false, confirm: false });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try { const res = await API.get('/users'); setUsers(res.data); }
    catch { setUsers([]); }
    setLoading(false);
  };

  const saveNewUser = async () => {
    const err = validateUserForm(form, users);
    if (err) { toast.error(err); return; }
    try {
      await register(form);
      toast.success(`✅ User "${form.username}" created successfully!`);
      setModal(null); setForm({ role: 'ROLE_ACCOUNTANT' });
      fetchUsers();
    } catch (e) {
      const msg = e.response?.data;
      if (typeof msg === 'string' && msg.includes('username')) toast.error('Username already exists');
      else if (typeof msg === 'string' && msg.includes('email')) toast.error('Email already registered');
      else toast.error(typeof msg === 'string' ? msg : 'Failed to create user');
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ username: u.username, fullName: u.fullName, email: u.email, phone: u.phone || '',
              roles: u.roles, role: Array.isArray(u.roles) ? u.roles[0] : u.roles, password: '' });
    setModal('edit');
  };

  const saveEditUser = async () => {
    const err = validateUserForm(form, users, editUser.id);
    if (err) { toast.error(err); return; }
    try {
      const payload = {
        fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(),
        roles: [form.role],
        ...(form.password?.trim() ? { password: form.password } : {})
      };
      await updateUser(editUser.id, payload);
      toast.success(`✅ User "${editUser.username}" updated successfully!`);
      setModal(null); setEditUser(null); setForm({ role: 'ROLE_ACCOUNTANT' });
      fetchUsers();
    } catch (e) {
      const msg = e.response?.data;
      toast.error(typeof msg === 'string' ? msg : 'Failed to update user');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(confirmDelete.id);
      toast.success(`User "${confirmDelete.username}" deleted`);
      setConfirmDelete(null); fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data || 'Failed to delete');
      setConfirmDelete(null);
    }
  };

  const handleToggle = async () => {
    try {
      await toggleUserStatus(confirmToggle.id);
      toast.success(`User ${confirmToggle.active !== false ? 'deactivated' : 'activated'}`);
      setConfirmToggle(null); fetchUsers();
    } catch (e) {
      toast.error(e.response?.data || 'Failed to update status');
      setConfirmToggle(null);
    }
  };

  const handleAdminChangePassword = async () => {
    if (!pwForm.newPassword?.trim())    { toast.error('New password is required'); return; }
    if (pwForm.newPassword.length < 6)  { toast.error('Password must be at least 6 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    try {
      await updateUser(editUser.id, { fullName: editUser.fullName, email: editUser.email,
        phone: editUser.phone, roles: editUser.roles, password: pwForm.newPassword });
      toast.success(`✅ Password changed for "${editUser.username}"`);
      setModal(null); setPwForm({}); setEditUser(null);
    } catch (e) { toast.error(e.response?.data || 'Failed to change password'); }
  };

  const handleMyPassword = async () => {
    if (!pwForm.oldPassword?.trim())   { toast.error('Current password is required'); return; }
    if (!pwForm.newPassword?.trim())   { toast.error('New password is required'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    try {
      await changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      toast.success('✅ Password changed! Please login again.');
      setModal(null); setPwForm({});
      setTimeout(() => {
        localStorage.clear();
        window.location.href = '/login';
      }, 1500);
    } catch (e) {
      const msg = e.response?.data;
      toast.error(typeof msg === 'string' ? msg : 'Failed to change password');
    }
  };

  const isAdmin = currentUser?.roles?.includes('ROLE_ADMIN');

  return (
    <>
    <div>

      {/* Change My Password Button — visible to ALL users */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-outline" style={{ fontSize: 13, gap: 6 }}
          onClick={() => { setPwForm({}); setShowPw({}); setModal('myPassword'); }}>
          🔑 Change My Password
        </button>
      </div>

      {/* Role Permissions Info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">👥 Role Permissions</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {ROLES.map(r => (
              <div key={r.value} style={{
                border: `2px solid ${r.color}20`, borderLeft: `4px solid ${r.color}`,
                borderRadius: 6, padding: '10px 12px', background: `${r.color}08`
              }}>
                <div style={{ fontWeight: 700, color: r.color, fontSize: 13, marginBottom: 4 }}>{r.label}</div>
                <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.4 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Users List */}
      {isAdmin && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">👤 User Accounts</span>
            <button className="btn btn-primary"
              onClick={() => { setForm({ role: 'ROLE_ACCOUNTANT' }); setModal('add'); }}>
              + Add New User
            </button>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center" style={{ padding: 40 }}>Loading users...</div>
            ) : users.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Full Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr key={u.id || idx}>
                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                        <td><strong>{u.fullName}</strong></td>
                        <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}>{u.username}</code></td>
                        <td style={{ fontSize: 12 }}>{u.email}</td>
                        <td style={{ fontSize: 12 }}>{u.phone || '—'}</td>
                        <td>
                          <span style={{
                            background: `${roleColor(Array.isArray(u.roles) ? u.roles[0] : u.roles)}15`,
                            color: roleColor(Array.isArray(u.roles) ? u.roles[0] : u.roles),
                            border: `1px solid ${roleColor(Array.isArray(u.roles) ? u.roles[0] : u.roles)}40`,
                            padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600
                          }}>
                            {roleLabel(u.roles)}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            background: u.active !== false ? '#d1fae5' : '#fee2e2',
                            color: u.active !== false ? '#059669' : '#dc2626',
                            padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600
                          }}>
                            {u.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {/* Edit */}
                            <button className="btn btn-outline" style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => openEdit(u)} title="Edit user">
                              ✏️ Edit
                            </button>
                            {/* Change Password */}
                            <button className="btn btn-outline" style={{ padding: '3px 8px', fontSize: 11, borderColor: '#7c3aed', color: '#7c3aed' }}
                              onClick={() => { setEditUser(u); setPwForm({}); setShowPw({}); setModal('changePassword'); }}
                              title="Change password">
                              🔑 Pwd
                            </button>
                            {/* Toggle Active/Inactive */}
                            {u.username !== 'admin' && (
                              <button className="btn btn-outline"
                                style={{ padding: '3px 8px', fontSize: 11,
                                  borderColor: u.active !== false ? '#d97706' : '#16a34a',
                                  color: u.active !== false ? '#d97706' : '#16a34a' }}
                                onClick={() => setConfirmToggle(u)}
                                title={u.active !== false ? 'Deactivate user' : 'Activate user'}>
                                {u.active !== false ? '🔒 Deactivate' : '✅ Activate'}
                              </button>
                            )}
                            {/* Delete */}
                            {u.username !== 'admin' && (
                              <button className="btn btn-outline"
                                style={{ padding: '3px 8px', fontSize: 11, borderColor: '#dc2626', color: '#dc2626' }}
                                onClick={() => setConfirmDelete(u)}
                                title="Delete user">
                                🗑️ Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center" style={{ padding: 48, color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
                <div style={{ fontSize: 15, marginBottom: 6 }}>No users created yet</div>
                <div style={{ fontSize: 12 }}>Click "+ Add New User" to create your first user</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* ── ADD USER MODAL ── */}
    {modal === 'add' && (
      <div className="modal-overlay" onClick={() => setModal(null)}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
          <div className="modal-header">
            <h3>➕ Create New User</h3>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
          </div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input placeholder="e.g. Rahul Sharma"
                  value={form.fullName || ''} onChange={e => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Username * (for login)</label>
                <input placeholder="e.g. rahul.sharma (3-20 chars)"
                  value={form.username || ''} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" placeholder="rahul@company.com"
                  value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone * (10 digits)</label>
                <input placeholder="9876543210" maxLength={10}
                  value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div className="form-group">
                <label>Password * (min 6 chars)</label>
                <input type="password" placeholder="Minimum 6 characters"
                  value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px',
              background: `${ROLES.find(r => r.value === form.role)?.color}10`,
              border: `1px solid ${ROLES.find(r => r.value === form.role)?.color}30`,
              borderRadius: 6, fontSize: 12, color: '#475569' }}>
              <strong style={{ color: ROLES.find(r => r.value === form.role)?.color }}>
                {ROLES.find(r => r.value === form.role)?.label} permissions:
              </strong>{' '}{ROLES.find(r => r.value === form.role)?.desc}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveNewUser}>✅ Create User</button>
          </div>
        </div>
      </div>
    )}

    {/* ── EDIT USER MODAL ── */}
    {modal === 'edit' && editUser && (
      <div className="modal-overlay" onClick={() => setModal(null)}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
          <div className="modal-header">
            <h3>✏️ Edit User — {editUser.username}</h3>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
          </div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input value={form.fullName || ''} onChange={e => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Username (cannot change)</label>
                <input value={editUser.username} disabled style={{ background: '#f1f5f9', color: '#64748b' }} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone * (10 digits)</label>
                <input maxLength={10} value={form.phone || ''}
                  onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select value={form.role || ''} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input type="password" placeholder="Leave blank to keep unchanged"
                  value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEditUser}>✅ Save Changes</button>
          </div>
        </div>
      </div>
    )}

    {/* ── ADMIN: CHANGE ANY USER PASSWORD ── */}
    {modal === 'changePassword' && editUser && (
      <div className="modal-overlay" onClick={() => setModal(null)}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
          <div className="modal-header">
            <h3>🔑 Change Password — {editUser.username}</h3>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
          </div>
          <div className="modal-body">
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
              ⚠️ You are changing password for user: <strong>{editUser.fullName} ({editUser.username})</strong>
            </div>
            <div className="form-group">
              <label>New Password * (min 6 chars)</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw.new ? 'text' : 'password'} placeholder="Enter new password"
                  value={pwForm.newPassword || ''} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  style={{ paddingRight: 40 }} />
                <span onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 16 }}>
                  {showPw.new ? '🙈' : '👁️'}
                </span>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw.confirm ? 'text' : 'password'} placeholder="Re-enter new password"
                  value={pwForm.confirmPassword || ''} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  style={{ paddingRight: 40 }} />
                <span onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 16 }}>
                  {showPw.confirm ? '🙈' : '👁️'}
                </span>
              </div>
            </div>
            {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
              <div style={{ color: '#dc2626', fontSize: 12, marginTop: -8 }}>❌ Passwords do not match</div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => { setModal(null); setPwForm({}); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdminChangePassword}>🔑 Change Password</button>
          </div>
        </div>
      </div>
    )}

    {/* ── SELF: CHANGE MY OWN PASSWORD ── */}
    {modal === 'myPassword' && (
      <div className="modal-overlay" onClick={() => setModal(null)}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
          <div className="modal-header">
            <h3>🔑 Change My Password</h3>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
          </div>
          <div className="modal-body">
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#0369a1' }}>
              Changing password for: <strong>{currentUser?.fullName} ({currentUser?.username})</strong>
            </div>
            <div className="form-group">
              <label>Current Password *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw.old ? 'text' : 'password'} placeholder="Enter current password"
                  value={pwForm.oldPassword || ''} onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })}
                  style={{ paddingRight: 40 }} />
                <span onClick={() => setShowPw(p => ({ ...p, old: !p.old }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 16 }}>
                  {showPw.old ? '🙈' : '👁️'}
                </span>
              </div>
            </div>
            <div className="form-group">
              <label>New Password * (min 6 chars)</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw.new ? 'text' : 'password'} placeholder="Enter new password"
                  value={pwForm.newPassword || ''} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  style={{ paddingRight: 40 }} />
                <span onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 16 }}>
                  {showPw.new ? '🙈' : '👁️'}
                </span>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm New Password *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw.confirm ? 'text' : 'password'} placeholder="Re-enter new password"
                  value={pwForm.confirmPassword || ''} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  style={{ paddingRight: 40 }} />
                <span onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 16 }}>
                  {showPw.confirm ? '🙈' : '👁️'}
                </span>
              </div>
            </div>
            {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
              <div style={{ color: '#dc2626', fontSize: 12, marginTop: -8 }}>❌ Passwords do not match</div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => { setModal(null); setPwForm({}); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleMyPassword}>🔑 Change Password</button>
          </div>
        </div>
      </div>
    )}

    {/* ── CONFIRM DELETE ── */}
    <ConfirmModal
      open={!!confirmDelete}
      title="Delete User?"
      message={`Are you sure you want to permanently delete this user?`}
      details={confirmDelete ? `${confirmDelete.fullName} (${confirmDelete.username}) — ${roleLabel(confirmDelete.roles)}` : ''}
      confirmLabel="Yes, Delete"
      type="danger"
      onConfirm={handleDelete}
      onCancel={() => setConfirmDelete(null)}
    />

    {/* ── CONFIRM TOGGLE STATUS ── */}
    <ConfirmModal
      open={!!confirmToggle}
      title={confirmToggle?.active !== false ? 'Deactivate User?' : 'Activate User?'}
      message={confirmToggle?.active !== false
        ? 'This user will not be able to login until reactivated.'
        : 'This user will be able to login again.'}
      details={confirmToggle ? `${confirmToggle.fullName} (${confirmToggle.username})` : ''}
      confirmLabel={confirmToggle?.active !== false ? 'Yes, Deactivate' : 'Yes, Activate'}
      type={confirmToggle?.active !== false ? 'warning' : 'info'}
      onConfirm={handleToggle}
      onCancel={() => setConfirmToggle(null)}
    />
    </>
  );
}
