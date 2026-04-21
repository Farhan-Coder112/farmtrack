/* expenses.js */

let allExpenses = [];
let currentExpenseEdit = null;
let workersData = [];

async function loadExpenses() {
  const listEl = document.getElementById('expenses-list');
  listEl.innerHTML = '<div class="loading-spinner"></div>';

  const month = document.getElementById('expense-month')?.value || thisMonth();
  const cat = document.getElementById('expense-cat-filter')?.value || '';

  try {
    const params = new URLSearchParams({ month });
    if (cat) params.set('category', cat);

    const [expenses, summary] = await Promise.all([
      apiGet(`/expenses/?${params}`),
      apiGet(`/expenses/summary?month=${month}`),
    ]);

    allExpenses = expenses || [];
    renderExpenseSummary(summary);
    renderExpensesTable(allExpenses);
  } catch (e) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load expenses</div></div>`;
  }
}

const CAT_COLORS = {
  seeds: 'var(--green)', fertilizer: 'var(--blue)', pesticide: 'var(--red)',
  labor: 'var(--purple)', equipment: 'var(--cyan)', irrigation: '#0ea5e9',
  transport: 'var(--amber)', other: 'var(--text-3)',
};

function renderExpenseSummary(summary) {
  if (!summary) return;

  const totalEl = document.getElementById('expense-total');
  if (totalEl) totalEl.textContent = fmtCurrency(summary.total || 0);

  const catEl = document.getElementById('expense-by-category');
  if (catEl && summary.by_category) {
    catEl.innerHTML = summary.by_category.map(c => `
      <div class="cat-chip">
        <span class="cat-chip-dot" style="width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[c.category] || 'var(--text-3)'}; display:inline-block;"></span>
        <span class="cat-chip-name">${c.category}</span>
        <span class="cat-chip-amount">${fmtCurrency(c.total)}</span>
      </div>`).join('');
  }
}

function renderExpensesTable(expenses) {
  const listEl = document.getElementById('expenses-list');
  if (!expenses.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💰</div>
        <div class="empty-title">No expenses found</div>
        <div class="empty-sub">Record your first expense for this month</div>
      </div>`;
    return;
  }

  listEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Category</th>
          <th>Date</th>
          <th>Payment</th>
          <th style="text-align:right">Amount</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${expenses.map(e => `
          <tr>
            <td>
              <span class="td-name">${e.title}</span>
              ${e.description ? `<div style="font-size:0.75rem; color:var(--text-3); margin-top:0.2rem;">${e.description}</div>` : ''}
            </td>
            <td>
              <span class="cat-chip" style="background:var(--bg-3); border:1px solid var(--border); border-radius:999px; padding:0.2rem 0.6rem; font-size:0.75rem; display:inline-flex; gap:0.35rem; align-items:center;">
                <span style="width:7px;height:7px;border-radius:50%;background:${CAT_COLORS[e.category] || 'var(--text-3)'}; display:inline-block;"></span>
                ${capitalize(e.category)}
              </span>
            </td>
            <td>${fmtDate(e.date)}</td>
            <td style="text-transform:uppercase; font-size:0.75rem; color:var(--text-2);">${e.payment_method || 'cash'}</td>
            <td style="text-align:right; font-weight:700; color:var(--amber);">${fmtCurrency(e.amount)}</td>
            <td>
              <div style="display:flex; gap:0.3rem; justify-content:flex-end;">
                <button class="btn-icon success" onclick="editExpense(${e.id})" title="Edit">✏️</button>
                <button class="btn-icon danger" onclick="deleteExpense(${e.id})" title="Delete">🗑️</button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="font-weight:600; color:var(--text); padding-top:0.75rem; border-top:1px solid var(--border);">
            Total (${expenses.length} records)
          </td>
          <td style="text-align:right; font-weight:700; color:var(--amber); font-size:1rem; padding-top:0.75rem; border-top:1px solid var(--border);">
            ${fmtCurrency(expenses.reduce((s, e) => s + (e.amount || 0), 0))}
          </td>
          <td style="border-top:1px solid var(--border);"></td>
        </tr>
      </tfoot>
    </table>`;
}

function openExpenseModal() {
  document.getElementById('expense-modal-title').textContent = 'Add Expense';
  document.getElementById('expense-id').value = '';
  document.getElementById('expense-title').value = '';
  document.getElementById('expense-category').value = 'fertilizer';
  document.getElementById('expense-amount').value = '';
  document.getElementById('expense-date').value = today();
  document.getElementById('expense-payment').value = 'cash';
  document.getElementById('expense-description').value = '';
  
  // Load workers for labor selection
  loadWorkersForExpense();
  
  openModal('expense-modal');
}

function editExpense(id) {
  const e = allExpenses.find(x => x.id === id);
  if (!e) return;
  document.getElementById('expense-modal-title').textContent = 'Edit Expense';
  document.getElementById('expense-id').value = e.id;
  document.getElementById('expense-title').value = e.title || '';
  document.getElementById('expense-category').value = e.category || 'other';
  document.getElementById('expense-amount').value = e.amount || '';
  document.getElementById('expense-date').value = e.date || today();
  document.getElementById('expense-payment').value = e.payment_method || 'cash';
  document.getElementById('expense-description').value = e.description || '';
  
  // Load workers for labor selection
  loadWorkersForExpense();
  
  // Handle category change to show/hide worker selection
  handleExpenseCategoryChange();
  
  openModal('expense-modal');
}

async function saveExpense() {
  const id = document.getElementById('expense-id').value;
  const title = document.getElementById('expense-title').value.trim();
  const amount = parseFloat(document.getElementById('expense-amount').value);
  const category = document.getElementById('expense-category').value;

  if (!title) { showToast('Title is required', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }

  const payload = {
    title,
    category,
    amount,
    date: document.getElementById('expense-date').value,
    payment_method: document.getElementById('expense-payment').value,
    description: document.getElementById('expense-description').value.trim(),
  };

  try {
    if (id) {
      await apiPut(`/expenses/${id}`, payload);
      showToast('Expense updated ✓');
    } else {
      await apiPost('/expenses/', payload);
      showToast('Expense recorded ✓');
    }
    closeModal('expense-modal');
    loadExpenses();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteExpense(id) {
  const ok = await confirmDialog('Delete this expense? This cannot be undone.');
  if (!ok) return;
  try {
    await apiDelete(`/expenses/${id}`);
    showToast('Expense deleted');
    loadExpenses();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// Load workers for labor expense selection
async function loadWorkersForExpense() {
  try {
    workersData = await apiGet('/workers/?status=active') || [];
    populateWorkerSelect();
  } catch (e) {
    console.error('Failed to load workers:', e);
  }
}

function populateWorkerSelect() {
  const select = document.getElementById('expense-worker');
  if (!select) return;
  
  select.innerHTML = '<option value="">Select worker...</option>' +
    workersData.map(w => `<option value="${w.id}" data-weekly-wages="${w.weekly_wages || 0}">${w.name} - Weekly: ${fmtRupees(w.weekly_wages || 0)}</option>`).join('');
}

function handleExpenseCategoryChange() {
  const category = document.getElementById('expense-category').value;
  const workerRow = document.getElementById('expense-worker-row');
  const amountInput = document.getElementById('expense-amount');
  
  if (category === 'labor') {
    workerRow.style.display = 'flex';
    amountInput.placeholder = 'Auto-calculated from weekly wages';
    amountInput.readOnly = true;
    amountInput.style.background = 'var(--bg-2)';
  } else {
    workerRow.style.display = 'none';
    amountInput.placeholder = 'e.g. 2500';
    amountInput.readOnly = false;
    amountInput.style.background = '';
    amountInput.value = '';
  }
}

function calculateLaborAmount() {
  const workerSelect = document.getElementById('expense-worker');
  const amountInput = document.getElementById('expense-amount');
  const selectedOption = workerSelect.options[workerSelect.selectedIndex];
  
  if (selectedOption && selectedOption.value) {
    const weeklyWages = parseFloat(selectedOption.dataset.weeklyWages) || 0;
    amountInput.value = weeklyWages.toFixed(2);
    
    // Auto-fill title with worker name
    const workerName = selectedOption.text.split(' - ')[0];
    const titleInput = document.getElementById('expense-title');
    if (!titleInput.value || titleInput.value.includes('Weekly wages')) {
      titleInput.value = `Weekly wages - ${workerName}`;
    }
  } else {
    amountInput.value = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[onclick="openModal(\'expense-modal\')"]')
    ?.setAttribute('onclick', 'openExpenseModal()');
});
