// 🔥 formatters.js - तुझ्या ReportsPage साठी
export const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const fmtN = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pct = (n) => Number(n || 0).toFixed(1);

// Indian Rupee formatting
export const formatRupees = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Date formatting
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-IN');
};
