const descInput = document.getElementById('desc');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const addBtn = document.getElementById('addBtn');
const txList = document.getElementById('transactionList');
const noTx = document.getElementById('noTx');
const noChart = document.getElementById('noChart');

let transactions = JSON.parse(localStorage.getItem('budget-transactions')) || [];
let chart = null;
let currentFilter = 'all';

const sortOrderSelect = document.getElementById('sortOrder');

addBtn.addEventListener('click', addTransaction);

function addTransaction() {
    const desc = descInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;
    const type = category === 'Income' ? 'income' : 'expense';
    const date = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    if (!desc || isNaN(amount) || amount <= 0) {
        alert('Please enter a valid description and amount.');
        return;
    }

    transactions.push({
        id: Date.now(),
        desc,
        amount,
        category,
        type,
        date
    });

    save();
    render();
    descInput.value = '';
    amountInput.value = '';
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    save();
    render();
}

function save() {
    localStorage.setItem('budget-transactions', JSON.stringify(transactions));
}

function render() {
    // Totals
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    document.getElementById('balance').textContent = formatCurrency(balance);
    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpense').textContent = formatCurrency(expense);

    const categoryEmojis = {
        'Food': '🍔',
        'Transport': '🚌',
        'Shopping': '🛍️',
        'Bills': '💡',
        'Health': '🏥',
        'Income': '💼',
        'Other': '📦'
    };

    let filteredTransactions = transactions;
    if (typeof currentFilter !== 'undefined' && currentFilter !== 'all') {
        filteredTransactions = transactions.filter(t => t.type === currentFilter);
    }
    
    txList.innerHTML = '';
    noTx.style.display = filteredTransactions.length === 0 ? 'block' : 'none';

    let sortedTransactions = [...filteredTransactions];
    const sortValue = sortOrderSelect.value;
    
    if (sortValue === 'date-desc') {
        sortedTransactions.sort((a, b) => b.id - a.id);
    } else if (sortValue === 'date-asc') {
        sortedTransactions.sort((a, b) => a.id - b.id);
    } else if (sortValue === 'amount-desc') {
        sortedTransactions.sort((a, b) => b.amount - a.amount);
    } else if (sortValue === 'amount-asc') {
        sortedTransactions.sort((a, b) => a.amount - b.amount);
    }

    sortedTransactions.forEach((t, index) => {
        const li = document.createElement('li');
        li.className = t.type;
        li.style.animationDelay = `${index * 0.05}s`;
        const emoji = categoryEmojis[t.category] || '';
        const dateStr = t.date ? ` • ${t.date}` : '';
        li.innerHTML = `
      <div class="tx-card">
        <div class="tx-left">
          <span class="tx-desc">${t.desc}</span>
          <span class="tx-cat">${emoji} ${t.category}${dateStr}</span>
        </div>
        <div class="tx-right">
          <span class="tx-amount">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</span>
        </div>
      </div>
      <button class="del-btn-side" onclick="deleteTransaction(${t.id})">🗑️</button>
    `;
        txList.appendChild(li);
    });

    // Chart
    renderChart();
}

function renderChart() {
    let visibleTx = transactions;
    if (typeof currentFilter !== 'undefined' && currentFilter !== 'all') {
        visibleTx = transactions.filter(t => t.type === currentFilter);
    }

    noChart.style.display = visibleTx.length === 0 ? 'block' : 'none';

    // Map each distinct transaction for individual X-axis points
    const allTx = [...visibleTx].sort((a,b) => a.id - b.id);
    const labels = allTx.map(t => t.desc.length > 12 ? t.desc.substring(0, 10)+'..' : t.desc);

    if(typeof Chart !== 'undefined') Chart.defaults.color = '#8f8f9d';

    if (chart) chart.destroy();

    if (labels.length === 0) return;

    const datasets = [];

    if (currentFilter === 'all' || currentFilter === 'income') {
        const incomeData = allTx.map(t => t.type === 'income' ? t.amount : null);

        datasets.push({
            label: 'Income',
            data: incomeData,
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            borderWidth: 2,
            spanGaps: true, // Bridges gaps between scattered items of same type
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#0f0f11',
            pointBorderColor: '#34d399',
            pointBorderWidth: 2,
            pointRadius: currentFilter === 'all' ? 3 : 4,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ffffff'
        });
    }

    if (currentFilter === 'all' || currentFilter === 'expense') {
        const expenseData = allTx.map(t => t.type === 'expense' ? t.amount : null);

        datasets.push({
            label: 'Expenses',
            data: expenseData,
            borderColor: '#fb7185',
            backgroundColor: 'rgba(251, 113, 133, 0.1)',
            borderWidth: 2,
            spanGaps: true,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#0f0f11',
            pointBorderColor: '#fb7185',
            pointBorderWidth: 2,
            pointRadius: currentFilter === 'all' ? 3 : 4,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ffffff'
        });
    }

    const ctx = document.getElementById('myChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets
        },
        options: {
            responsive: true,
            layout: { padding: 12 },
            scales: {
                y: {
                    border: { display: false },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { 
                        callback: function(value) { return '₹' + value; },
                        font: { family: "'Geist', 'Inter', sans-serif" }
                    }
                },
                x: {
                    border: { display: false },
                    grid: { display: false },
                    ticks: { font: { family: "'Geist', 'Inter', sans-serif" } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 17, 0.95)',
                    titleFont: { family: "'Geist', 'Inter', sans-serif", size: 13 },
                    bodyFont: { family: "'Geist', 'Inter', sans-serif", size: 14, weight: 'bold' },
                    padding: 12,
                    cornerRadius: 8,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return '₹' + context.parsed.y;
                        }
                    }
                }
            }
        }
    });
}

function formatCurrency(amount) {
    return '₹' + amount.toFixed(2);
}

// Initial render
render();

// Function to setup custom select dropdowns
function setupCustomSelect(wrapperId, isSort = false) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    const select = wrapper.querySelector('.custom-select');
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const options = wrapper.querySelectorAll('.custom-option');
    const hiddenInput = wrapper.querySelector('input[type="hidden"]');
    const triggerSpan = trigger.querySelector('span');

    trigger.addEventListener('click', function(e) {
        // close others
        document.querySelectorAll('.custom-select.open').forEach(el => {
            if (el !== select) el.classList.remove('open');
        });
        select.classList.toggle('open');
        e.stopPropagation();
    });

    options.forEach(option => {
        option.addEventListener('click', function(e) {
            // Un-select all and select this
            options.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');

            // Update visible trigger text
            triggerSpan.textContent = this.textContent;

            // Update hidden input
            hiddenInput.value = this.dataset.value;

            // Close dropdown
            select.classList.remove('open');

            // Trigger re-render if it's the sort button
            if (isSort) {
                render();
            }
            e.stopPropagation();
        });
    });
}

// Click outside to close
document.addEventListener('click', function(e) {
    document.querySelectorAll('.custom-select.open').forEach(el => {
        el.classList.remove('open');
    });
});

// Setup both dropdowns
setupCustomSelect('categoryWrapper');
setupCustomSelect('sortWrapper', true);

// Setup Filter Tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        // Exclude the reset tracker button from filter active resetting
        if (e.target.id === 'resetTrackerBtn') return; 

        document.querySelectorAll('.filter-tabs .filter-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        render();
    });
});

// Setup Reset Tracker Logic
const resetBtn = document.getElementById('resetTrackerBtn');
const confirmModal = document.getElementById('confirmModal');
const cancelReset = document.getElementById('cancelReset');
const confirmResetBtn = document.getElementById('confirmReset');

if (resetBtn && confirmModal) {
    resetBtn.addEventListener('click', () => {
        confirmModal.classList.add('active');
    });

    cancelReset.addEventListener('click', () => {
        confirmModal.classList.remove('active');
    });

    confirmResetBtn.addEventListener('click', () => {
        transactions = [];
        currentFilter = 'all';
        
        // Re-select 'all' in the tabs visually
        document.querySelectorAll('.filter-tabs .filter-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.filter-tabs .filter-tab[data-filter="all"]').classList.add('active');
        
        save();
        render();
        confirmModal.classList.remove('active');
    });
}

// Calculator Logic
const calcModal = document.getElementById('calcModal');
const calcOpenBtn = document.getElementById('calcOpenBtn');
const calcCloseBtn = document.getElementById('calcCloseBtn');
const calcDisplay = document.getElementById('calcDisplay');
const calcHistory = document.getElementById('calcHistory');

let calcCurrentValue = '0';
let calcPreviousValue = '';
let calcOperator = null;

if (calcOpenBtn && calcModal) {
    calcOpenBtn.addEventListener('click', () => calcModal.classList.add('active'));
    calcCloseBtn.addEventListener('click', () => calcModal.classList.remove('active'));
}

document.querySelectorAll('.calc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const value = btn.innerText;
        const action = btn.dataset.action;

        if (!action) { // Number or decimal
            if (calcCurrentValue === '0' && value !== '.') {
                calcCurrentValue = value;
            } else {
                if (value === '.' && calcCurrentValue.includes('.')) return;
                calcCurrentValue += value;
            }
        } else if (action === 'clear') {
            calcCurrentValue = '0';
            calcPreviousValue = '';
            calcOperator = null;
        } else if (action === 'delete') {
            calcCurrentValue = calcCurrentValue.slice(0, -1);
            if (calcCurrentValue === '') calcCurrentValue = '0';
        } else if (action === 'operator') {
            if (calcOperator && calcPreviousValue) {
                calcCurrentValue = calculate();
            }
            calcOperator = btn.dataset.value;
            calcPreviousValue = calcCurrentValue;
            calcCurrentValue = '0';
        } else if (action === 'equal') {
            if (!calcOperator || !calcPreviousValue) return;
            calcCurrentValue = calculate();
            calcOperator = null;
            calcPreviousValue = '';
        } else if (action === 'use') {
            const val = parseFloat(calcCurrentValue);
            if (!isNaN(val) && val > 0) {
                amountInput.value = val;
                calcModal.classList.remove('active');
            }
        }
        updateCalcDisplay();
    });
});

function calculate() {
    const prev = parseFloat(calcPreviousValue);
    const current = parseFloat(calcCurrentValue);
    if (isNaN(prev) || isNaN(current)) return '0';
    
    let result = 0;
    switch (calcOperator) {
        case '+': result = prev + current; break;
        case '-': result = prev - current; break;
        case '*': result = prev * current; break;
        case '/': result = current !== 0 ? prev / current : 'Error'; break;
    }
    return result.toString();
}

function updateCalcDisplay() {
    calcDisplay.innerText = calcCurrentValue;
    if (calcOperator) {
        calcHistory.innerText = `${calcPreviousValue} ${calcOperator}`;
    } else {
        calcHistory.innerText = '';
    }
}

// Custom Cursor Logic
const cursor = document.getElementById('cursor');

let isHovering = false;

document.addEventListener('mousemove', (e) => {
    if (!isHovering) {
        cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
        cursor.style.width = '18px';
        cursor.style.height = '18px';
        cursor.style.borderRadius = '50%';
    }
});

// Add hover effect to interactive elements
const interactiveSelectors = 'button, .filter-tab, .custom-select-trigger, .custom-option, input, canvas, .tx-card, .del-btn-side, .calc-btn';

function addCursorHoverEffects() {
    const interactives = document.querySelectorAll(interactiveSelectors);
    
    interactives.forEach(el => {
        // Prevent adding multiple listeners if re-rendered
        if (!el.dataset.cursorEnhanced) {
            el.dataset.cursorEnhanced = 'true';
            
            el.addEventListener('mouseenter', () => {
                isHovering = true;
                cursor.classList.add('hovering');
                
                const rect = el.getBoundingClientRect();
                const padding = 12;
                
                cursor.style.width = `${rect.width + padding}px`;
                cursor.style.height = `${rect.height + padding}px`;
                
                const targetX = rect.left - padding / 2;
                const targetY = rect.top - padding / 2;
                cursor.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
                
                const style = window.getComputedStyle(el);
                let br = parseInt(style.borderRadius) || 8;
                cursor.style.borderRadius = `${br + 4}px`;
            });
            
            el.addEventListener('mouseleave', () => {
                isHovering = false;
                cursor.classList.remove('hovering');
            });
        }
    });
}

// Initial setup
addCursorHoverEffects();

// Since the transaction list is dynamic, we need an observer to add listeners to new elements
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            addCursorHoverEffects();
        }
    });
});

observer.observe(document.body, { childList: true, subtree: true });