const descInput = document.getElementById('desc');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const addBtn = document.getElementById('addBtn');
const txList = document.getElementById('transactionList');
const noTx = document.getElementById('noTx');
const noChart = document.getElementById('noChart');
const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('totalIncome');
const expenseEl = document.getElementById('totalExpense');

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

const CATEGORY_EMOJIS = {
    'Food': '🍔', 'Transport': '🚌', 'Shopping': '🛍️', 
    'Bills': '💡', 'Health': '🏥', 'Income': '💼', 'Other': '📦'
};

function render() {
    let income = 0, expense = 0;
    
    // Performance: single pass for totals
    for (const t of transactions) {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
    }
    
    const balance = income - expense;
    balanceEl.textContent = formatCurrency(balance);
    incomeEl.textContent = formatCurrency(income);
    expenseEl.textContent = formatCurrency(expense);

    let filteredTransactions = transactions;
    if (typeof currentFilter !== 'undefined' && currentFilter !== 'all') {
        filteredTransactions = transactions.filter(t => t.type === currentFilter);
    }

    const sortValue = sortOrderSelect.value;
    let sortedTransactions = [...filteredTransactions];
    
    // Optimized Sorting
    if (sortValue.startsWith('date')) {
        const isAsc = sortValue.endsWith('asc');
        sortedTransactions.sort((a, b) => isAsc ? a.id - b.id : b.id - a.id);
    } else {
        const isAsc = sortValue.endsWith('asc');
        sortedTransactions.sort((a, b) => isAsc ? a.amount - b.amount : b.amount - a.amount);
    }

    noTx.style.display = sortedTransactions.length === 0 ? 'block' : 'none';

    // Batch DOM updates with DocumentFragment
    const fragment = document.createDocumentFragment();
    const newestId = sortedTransactions.length > 0 ? Math.max(...transactions.map(t => t.id)) : 0;

    sortedTransactions.forEach((t, index) => {
        const li = document.createElement('li');
        li.className = t.type;
        // Only animate the very newest item
        if (t.id === newestId) {
            li.classList.add('new-item');
        }
        
        const emoji = CATEGORY_EMOJIS[t.category] || '📦';
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
            <button class="del-btn-side" data-id="${t.id}">🗑️</button>
        `;
        fragment.appendChild(li);
    });

    txList.replaceChildren(fragment); // High performance clear and append
    renderChart();
}

// Delegate delete events
txList.addEventListener('click', (e) => {
    const btn = e.target.closest('.del-btn-side');
    if (btn) {
        const id = parseInt(btn.dataset.id);
        deleteTransaction(id);
    }
});

function renderChart() {
    let visibleTx = transactions;
    if (typeof currentFilter !== 'undefined' && currentFilter !== 'all') {
        visibleTx = transactions.filter(t => t.type === currentFilter);
    }

    noChart.style.display = visibleTx.length === 0 ? 'block' : 'none';

    // Map each distinct transaction for individual X-axis points
    const allTx = [...visibleTx].sort((a, b) => a.id - b.id);
    const labels = allTx.map(t => t.desc.length > 12 ? t.desc.substring(0, 10) + '..' : t.desc);

    if (typeof Chart !== 'undefined') Chart.defaults.color = '#8f8f9d';

    if (labels.length === 0) {
        if (chart) {
            chart.destroy();
            chart = null;
        }
        return;
    }

    const datasets = [];

    if (currentFilter === 'all') {
        let runningBalance = 0;
        // Strict chronological sort for graph history
        const balanceData = [...transactions].sort((a,b) => a.id - b.id).map(t => {
            if (t.type === 'income') runningBalance += t.amount;
            else runningBalance -= t.amount;
            return runningBalance;
        });
        
        // Match labels to the chronologically sorted history
        const historyLabels = [...transactions].sort((a,b) => a.id - b.id).map(t => t.desc);

        datasets.push({
            label: 'Balance',
            data: balanceData,
            borderColor: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#0f0f11',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ffffff'
        });
        
        if (chart) {
            chart.data.labels = historyLabels;
            chart.data.datasets = datasets;
            chart.update('none');
            return;
        }
    } else if (currentFilter === 'income') {
        const incomeData = allTx.map(t => t.type === 'income' ? t.amount : null);

        datasets.push({
            label: 'Income',
            data: incomeData,
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            borderWidth: 2,
            spanGaps: true,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#0f0f11',
            pointBorderColor: '#34d399',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ffffff'
        });
    } else if (currentFilter === 'expense') {
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
            pointRadius: 4,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ffffff'
        });
    }

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets = datasets;
        chart.update('none');
    } else {
        const ctx = document.getElementById('myChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: chartOptions
        });
    }
}

// Chart options cached outside for performance
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 12 },
    scales: {
        y: {
            border: { display: false },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
                callback: function (value) { return '₹' + value; },
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
                label: function (context) {
                    return '₹' + context.parsed.y;
                }
            }
        }
    }
};

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

    trigger.addEventListener('click', function (e) {
        // close others
        document.querySelectorAll('.custom-select.open').forEach(el => {
            if (el !== select) el.classList.remove('open');
        });
        select.classList.toggle('open');
        e.stopPropagation();
    });

    options.forEach(option => {
        option.addEventListener('click', function (e) {
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
document.addEventListener('click', function (e) {
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
// Resizer Logic
const resizer = document.getElementById('resizer');
const leftPanel = document.getElementById('leftPanel');
const rightPanel = document.getElementById('rightPanel');
const mainLayout = document.getElementById('mainLayout');

if (resizer && leftPanel && rightPanel) {
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const containerRect = mainLayout.getBoundingClientRect();
        const pointerX = e.clientX - containerRect.left;
        
        // Calculate percentages
        const leftWidth = (pointerX / containerRect.width) * 100;
        const rightWidth = 100 - leftWidth;

        // Constraints
        if (leftWidth > 20 && leftWidth < 80) {
            leftPanel.style.flex = leftWidth;
            rightPanel.style.flex = rightWidth;
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = 'none'; // Back to hidden for custom cursor
    });
}

// Custom Cursor Logic
const cursor = document.getElementById('cursor');
let isHovering = false;
let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function animateCursor() {
    if (!isHovering) {
        // Direct assignment for zero lag when not hovering
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
        cursor.style.width = '18px';
        cursor.style.height = '18px';
        cursor.style.borderRadius = '50%';
    }
    requestAnimationFrame(animateCursor);
}
animateCursor();

// Optimized Cursor Hover Effects using Event Delegation
const interactiveSelectors = 'button, .filter-tab, .custom-select-trigger, .custom-option, input, .tx-card, .del-btn-side, .calc-btn, .resizer, .icon-btn-pill';

// Capturing event listeners for high performance delegated hover detection
document.addEventListener('mouseover', (e) => {
    const target = e.target.closest(interactiveSelectors);
    if (!target) return;

    target.classList.add('hover-invert');
    if (isHovering) return;

    isHovering = true;
    cursor.classList.add('hovering');
    
    // Check if it's a danger element
    const isDanger = target.classList.contains('del-btn-side') || 
                   target.classList.contains('floating-reset') || 
                   target.classList.contains('confirm-btn') || 
                   target.classList.contains('utility');
    
    if (isDanger) cursor.classList.add('cursor-danger');

    const rect = target.getBoundingClientRect();
    const padding = 12;

    requestAnimationFrame(() => {
        // High performance update: Match target size and position with pill-style cursor
        cursor.style.width = `${rect.width + padding}px`;
        cursor.style.height = `${rect.height + padding}px`;
        // Use translate3d for GPU acceleration
        cursor.style.transform = `translate3d(${rect.left - padding / 2}px, ${rect.top - padding / 2}px, 0)`;

        const br = parseInt(window.getComputedStyle(target).borderRadius) || 8;
        cursor.style.borderRadius = `${br + 4}px`;
    });
}, true);

document.addEventListener('mouseout', (e) => {
    const target = e.target.closest(interactiveSelectors);
    const relatedTarget = e.relatedTarget ? e.relatedTarget.closest(interactiveSelectors) : null;
    
    if (target && target !== relatedTarget) {
        target.classList.remove('hover-invert');
        isHovering = false;
        cursor.classList.remove('hovering');
        cursor.classList.remove('cursor-danger');
    }
}, true);

// Remove old expensive observer and addCursorHoverEffects function logic
// (Cleaned up in the next step or consolidated here)

// History Import/Export Logic
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        if (transactions.length === 0) {
            alert('No transactions to export.');
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "budgetly_history.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });
}

if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            try {
                if (file.name.endsWith('.txt')) {
                    const imported = parseHDFCStatement(content);
                    if (imported.length > 0) {
                        if (confirm(`Detected ${imported.length} transactions in HDFC Statement. Import them?`)) {
                            transactions = [...transactions, ...imported]; // Append instead of overwrite for statements
                            save();
                            render();
                            alert('HDFC Statement imported successfully!');
                        }
                    } else {
                        alert('No valid transactions found in the text file.');
                    }
                } else {
                    const imported = JSON.parse(content);
                    if (Array.isArray(imported)) {
                        if (confirm('Importing will overwrite your current history. Continue?')) {
                            transactions = imported;
                            save();
                            render();
                            alert('History imported successfully!');
                        }
                    } else {
                        alert('Invalid JSON format.');
                    }
                }
            } catch (err) {
                alert('Error reading file. Make sure it is a valid format.');
                console.error(err);
            }
            importFile.value = ''; 
        };
        reader.readAsText(file);
    });
}

function parseHDFCStatement(text) {
    const lines = text.split('\n');
    const imported = [];
    const dateRegex = /^(\d{2}\/\d{2}\/\d{2})/;
    
    lines.forEach(line => {
        if (dateRegex.test(line.trim())) {
            // HDFC Fixed Width Column analysis:
            // Date: 0-8, Desc: 10-50, Withdrawal: 80-100, Deposit: 100-120
            const dateStr = line.substring(0, 8).trim();
            const rawDesc = line.substring(10, 50).trim();
            const withdrawalPart = line.substring(80, 100).trim().replace(/,/g, '');
            const depositPart = line.substring(100, 120).trim().replace(/,/g, '');
            
            const withdrawal = parseFloat(withdrawalPart);
            const deposit = parseFloat(depositPart);

            // Extract UPI ID and truncate to 13 chars
            let cleanedName = rawDesc;
            const upiMatch = rawDesc.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-_]+/);
            if (upiMatch) {
                cleanedName = upiMatch[0];
            } else {
                cleanedName = rawDesc.replace(/^UPI-/, '');
            }
            
            if (cleanedName.length > 13) {
                cleanedName = cleanedName.substring(0, 13);
            }
            
            if (!isNaN(withdrawal) && withdrawal > 0) {
                imported.push({
                    id: Date.now() + Math.random(),
                    desc: cleanedName,
                    amount: withdrawal,
                    category: 'Other',
                    type: 'expense',
                    date: dateStr
                });
            } else if (!isNaN(deposit) && deposit > 0) {
                imported.push({
                    id: Date.now() + Math.random(),
                    desc: cleanedName,
                    amount: deposit,
                    category: 'Income',
                    type: 'income',
                    date: dateStr
                });
            }
        }
    });
    return imported;
}