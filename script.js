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
    // Robust comparison using Number to handle both int and float IDs
    transactions = transactions.filter(t => Number(t.id) !== Number(id));
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
        // Use Number() to support fractional IDs from statement imports
        const id = Number(btn.getAttribute('data-id'));
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

let isResizing = false;

if (resizer && leftPanel && rightPanel) {

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('dragging');
        document.body.classList.add('resizing');
        cursor.classList.add('hovering');
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
        if (!isResizing) return;
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.classList.remove('resizing');
        cursor.classList.remove('hovering');
        isHovering = false;
        document.body.style.cursor = 'none'; 
    });
}

// Custom Cursor Logic - GPU Optimized
const cursor = document.getElementById('cursor');
let isHovering = false;
let mouseX = 0, mouseY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Low latency background position update
    if (!isHovering && !isResizing) {
        cursor.style.setProperty('--c-x', `${mouseX}px`);
        cursor.style.setProperty('--c-y', `${mouseY}px`);
    }
}, { passive: true });

function animateCursor() {
    if (isResizing) {
        cursor.style.setProperty('--c-x', `${mouseX}px`);
        cursor.style.setProperty('--c-y', `${mouseY}px`);
        cursor.style.setProperty('--c-w', '6px');
        cursor.style.setProperty('--c-h', '60px');
        cursor.style.setProperty('--c-br', '3px');
        cursor.style.setProperty('--c-bg', 'rgba(139, 92, 246, 0.8)');
    } else if (!isHovering) {
        cursor.style.setProperty('--c-w', '20px');
        cursor.style.setProperty('--c-h', '20px');
        cursor.style.setProperty('--c-br', '50%');
        cursor.style.setProperty('--c-bg', 'rgba(255, 255, 255, 0.4)');
    }
    requestAnimationFrame(animateCursor);
}
animateCursor();

// Optimized Cursor Hover Effects using Event Delegation
const interactiveSelectors = 'button, .filter-tab, .custom-select-trigger, .custom-option, input, .tx-card, .del-btn-side, .calc-btn, .resizer, .icon-btn-pill';

// Capturing event listeners for high performance delegated hover detection
document.addEventListener('mouseover', (e) => {
    if (isResizing) return;
    
    const target = e.target.closest(interactiveSelectors);
    if (!target || target.classList.contains('hover-invert')) return;

    // HIGH PERFORMANCE: Read before Write to avoid Layout Thrash
    const rect = target.getBoundingClientRect();
    
    // Mutation phase
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

    const padding = 12;
    // Map radii manually to avoid expensive getComputedStyle lookup
    let br = 12;
    if (target.classList.contains('summary-card')) br = 20;
    if (target.classList.contains('tx-card')) br = 14;
    if (target.classList.contains('icon-btn-pill')) br = 12;

    requestAnimationFrame(() => {
        cursor.style.setProperty('--c-w', `${rect.width + padding}px`);
        cursor.style.setProperty('--c-h', `${rect.height + padding}px`);
        cursor.style.setProperty('--c-x', `${rect.left + rect.width / 2}px`);
        cursor.style.setProperty('--c-y', `${rect.top + rect.height / 2}px`);
        cursor.style.setProperty('--c-br', `${br + 4}px`);
    });
}, true);

document.addEventListener('mouseout', (e) => {
    if (isResizing) return; // Maintain state while dragging
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

if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

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
    
    importFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
            let textToParse = '';
            let sourceFile = file.name;

            try {
                if (file.name.endsWith('.txt')) {
                    textToParse = content;
                } else if (file.name.endsWith('.pdf')) {
                    textToParse = await extractTextFromPDF(content);
                } else {
                    // Assume JSON for others
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
                    importFile.value = '';
                    return;
                }

                // Process extracted text
                if (textToParse) {
                    let imported = parseHDFCStatement(textToParse);
                    let source = 'HDFC Statement';
                    
                    if (imported.length === 0) {
                        imported = parseGooglePayStatement(textToParse);
                        source = 'Google Pay Statement';
                    }

                    if (imported.length > 0) {
                        if (confirm(`Detected ${imported.length} transactions. Import them?`)) {
                            transactions = [...transactions, ...imported];
                            save();
                            render();
                            alert(`Transactions imported successfully!`);
                        }
                    } else {
                        alert('No valid HDFC or Google Pay transactions found in this file.');
                    }
                }
            } catch (err) {
                alert('Error reading file. Make sure it is a valid format.');
                console.error(err);
            }
            importFile.value = ''; 
        };

        if (file.name.endsWith('.pdf')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    });
}

function parseHDFCStatement(text) {
    const lines = text.split('\n');
    const imported = [];
    const dateRegex = /(\d{2}\/\d{2}\/\d{2})/;
    
    lines.forEach(line => {
        const trimmed = line.trim();
        const dateMatch = trimmed.match(dateRegex);
        
        if (dateMatch) {
            const dateStr = dateMatch[1];
            const parts = trimmed.split(/\s{2,}/); 
            
            if (parts.length >= 4) {
                const desc = parts[1] || 'HDFC Tx';
                const withdrawal = parseFloat(parts[parts.length-3]?.replace(/,/g, ''));
                const deposit = parseFloat(parts[parts.length-2]?.replace(/,/g, ''));
                
                let cleanedName = desc;
                const upiMatch = desc.match(/[a-zA-Z0-9.\-_]+@([a-zA-Z0-9.\-_]+)/);
                if (upiMatch) cleanedName = upiMatch[0];
                if (cleanedName.length > 13) cleanedName = cleanedName.substring(0, 13);

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
        }
    });
    return imported;
}

function parseGooglePayStatement(text) {
    const lines = text.split('\n');
    const imported = [];
    
    // Primary Regex: Matches Date, Action, Name (non-greedy), and Amount
    // Matches: 01 Feb, 2026  Paid to Raju Kumar  ₹45
    const lineRegex = /(\d{1,2}\s[A-Za-z]{3},?\s\d{4})\s+(Paid to|Received from|Sent to|Requested from|Top-up to)\s+(.*?)\s+(?:₹|Rs\.|Rs|\$)\s?([\d,.]+)/i;

    lines.forEach(line => {
        const match = line.trim().match(lineRegex);
        if (match) {
            const [_, dateStr, action, rawName, amountStr] = match;
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            const type = (action.toLowerCase().includes('received') || action.toLowerCase().includes('requested')) ? 'income' : 'expense';
            
            let name = rawName.trim();
            // Handle Top-up case
            if (action.toLowerCase().includes('top-up')) {
                name = 'Wallet Top-up';
            }
            
            // Truncate to 13 chars as per user preference
            if (name.length > 13) {
                name = name.substring(0, 13);
            }

            if (!isNaN(amount)) {
                imported.push({
                    id: Date.now() + Math.random(),
                    desc: name,
                    amount: amount,
                    category: type === 'income' ? 'Income' : 'Other',
                    type: type,
                    date: dateStr
                });
            }
        }
    });

    // Fallback: If no transactions found, try the token-based scanner for squashed text
    if (imported.length === 0) {
        const tokens = text.split(/\s+/);
        let tempTx = null;
        const preparedTokens = tokens.flatMap(t => {
            if (t.match(/^[₹$]([\d,.]+)$/)) return [t.charAt(0), t.slice(1)];
            return t;
        });

        for (let i = 0; i < preparedTokens.length; i++) {
            const token = preparedTokens[i];
            const dateMatch = token.match(/(\d{1,2}[A-Za-z]{3},?\d{4})/);
            if (dateMatch) {
                tempTx = { date: dateMatch[1], name: '', amount: null, type: 'expense' };
                continue;
            }
            if (!tempTx) continue;

            const actionMatch = token.match(/^(Paidto|Receivedfrom|Sentto|Requestedfrom|Paid|Received|Sent|Requested)/i);
            if (actionMatch && !tempTx.name) {
                const actionFull = token.toLowerCase();
                tempTx.type = (actionFull.includes('received') || actionFull.includes('requested')) ? 'income' : 'expense';
                let namePart = token.replace(/^(Paidto|Receivedfrom|Sentto|Requestedfrom|Paid|Received|Sent|Requested)\s?/i, '');
                let j = i + 1;
                while (j < preparedTokens.length) {
                    const next = preparedTokens[j];
                    if (next.includes('TransactionID') || next.includes('Paidby') || 
                        next.match(/^[₹$]$/) || next.match(/^[₹$][\d,.]+/) || next.match(/^\d{1,2}[A-Za-z]{3}/)) break;
                    namePart += (namePart ? ' ' : '') + next;
                    j++;
                }
                tempTx.name = namePart.trim();
                i = j - 1;
                continue;
            }

            let amountVal = null;
            if (token.match(/^[₹$]$/) && preparedTokens[i+1]) {
                amountVal = parseFloat(preparedTokens[i+1].replace(/,/g, ''));
                i++;
            } else {
                const m = token.match(/(?:₹|Rs\.|Rs|\$)([\d,.]+)/);
                if (m) amountVal = parseFloat(m[1].replace(/,/g, ''));
            }

            if (amountVal !== null && !isNaN(amountVal)) {
                tempTx.amount = amountVal;
                if (tempTx.name && tempTx.name.length > 1) {
                    let finalName = tempTx.name;
                    if (finalName.length > 13) finalName = finalName.substring(0, 13);
                    imported.push({
                        id: Date.now() + Math.random(),
                        desc: finalName,
                        amount: tempTx.amount,
                        category: tempTx.type === 'income' ? 'Income' : 'Other',
                        type: tempTx.type,
                        date: tempTx.date
                    });
                }
                tempTx = null;
            }
        }
    }
    
    return imported;
}

/**
 * Super-Robust PDF Text Extraction
 * Reconstructs lines by coordinate sorting to handle fragmented PDF.js items
 */
async function extractTextFromPDF(data) {
    try {
        const loadingTask = pdfjsLib.getDocument({ data: data });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Sort items: Top-to-bottom (Y), then Left-to-right (X)
            const items = textContent.items.sort((a, b) => {
                const y1 = a.transform[5];
                const y2 = b.transform[5];
                if (Math.abs(y1 - y2) > 5) return y2 - y1; // Different line
                return a.transform[4] - b.transform[4];   // Same line
            });
            
            let lastY = -1;
            let pageText = '';
            for (const item of items) {
                const currentY = item.transform[5];
                if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
                    pageText += '\n'; // Significant Y change = new line
                } else if (lastY !== -1) {
                    pageText += ' ';  // Small Y change = same line
                }
                pageText += item.str;
                lastY = currentY;
            }
            fullText += pageText + '\n';
        }
        return fullText;
    } catch (err) {
        console.error('PDF extraction error:', err);
        return '';
    }
}