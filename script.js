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
      <div class="tx-left">
        <span class="tx-desc">${t.desc}</span>
        <span class="tx-cat">${emoji} ${t.category}${dateStr}</span>
      </div>
      <div class="tx-right">
        <span class="tx-amount">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</span>
        <button class="del-btn" onclick="deleteTransaction(${t.id})">🗑️</button>
      </div>
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

    // Group by Date for over time line tracking
    const allDates = [...new Set(visibleTx.map(t => t.date))].sort((a,b) => new Date(a) - new Date(b));
    const labels = allDates.map(d => d.split(',')[0]);

    if(typeof Chart !== 'undefined') Chart.defaults.color = '#8f8f9d';

    if (chart) chart.destroy();

    if (labels.length === 0) return;

    const datasets = [];

    if (currentFilter === 'all' || currentFilter === 'income') {
        const incomeTotals = {};
        allDates.forEach(d => incomeTotals[d] = 0);
        visibleTx.filter(t => t.type === 'income').forEach(t => incomeTotals[t.date] += t.amount);

        datasets.push({
            label: 'Income',
            data: allDates.map(d => incomeTotals[d]),
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            borderWidth: 2,
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
        const expenseTotals = {};
        allDates.forEach(d => expenseTotals[d] = 0);
        visibleTx.filter(t => t.type === 'expense').forEach(t => expenseTotals[t.date] += t.amount);

        datasets.push({
            label: 'Expenses',
            data: allDates.map(d => expenseTotals[d]),
            borderColor: '#fb7185',
            backgroundColor: 'rgba(251, 113, 133, 0.1)',
            borderWidth: 2,
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
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        render();
    });
});

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
const interactiveSelectors = 'button, .filter-tab, .custom-select-trigger, .custom-option, input, canvas, li, .del-btn';

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