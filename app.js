// ==========================================
// GROCERY POS State Management (MySQL Edition, Thai)
// Multi-Tab Checkout + Receipt Preview
// ==========================================

const API_BASE = '/api';
let products = [];
let currentCategory = 'ทั้งหมด';

// ==========================================
// Multi-Tab State
// ==========================================
const MAX_TABS = 5;
let tabs = [];
let activeTabIndex = 0;
let tabIdCounter = 0;

function createTabState() {
    tabIdCounter++;
    return {
        id: tabIdCounter,
        name: `#${tabIdCounter}`,
        cart: [],
        totalDue: 0
    };
}

function getActiveTab() {
    return tabs[activeTabIndex];
}

// ==========================================
// DOM Elements
// ==========================================

// Navigation
const sidebarNav = document.getElementById('sidebar-nav');
const navBtns = document.querySelectorAll('.nav-btn');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const views = document.querySelectorAll('.view-section');

// POS Elements
const posProductGrid = document.getElementById('pos-product-grid');
const categoryBtns = document.querySelectorAll('.category-btn');
const posSearchInput = document.getElementById('pos-search');
const globalBarcodeInput = document.getElementById('global-barcode-input');

// Cart Elements
const cartItemsContainer = document.getElementById('cart-items');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartTaxEl = document.getElementById('cart-tax');
const cartTotalEl = document.getElementById('cart-total');
const btnClearCart = document.getElementById('btn-clear-cart');
const btnCheckout = document.getElementById('btn-checkout');

// Tab Bar
const tabBar = document.getElementById('tab-bar');
const btnAddTab = document.getElementById('btn-add-tab');

// Inventory Elements
const inventoryTableBody = document.getElementById('inventory-table-body');
const inventorySearchInput = document.getElementById('inventory-search');
const btnAddProduct = document.getElementById('btn-add-product');

// Product Modal
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const modalTitle = document.getElementById('modal-title');

// Image Upload UI refs
const productImageFile = document.getElementById('product-image-file');
const imagePreview = document.getElementById('image-preview');
const imageUploadPlaceholder = document.getElementById('image-upload-placeholder');
const imageUploadingIndicator = document.getElementById('image-uploading-indicator');
const productImageUrlInput = document.getElementById('product-image-url');
const productImageHidden = document.getElementById('product-image');

// Payment Modal Elements
const paymentModal = document.getElementById('payment-modal');
const paymentForm = document.getElementById('payment-form');
const closePaymentBtns = document.querySelectorAll('.btn-close-payment');
const paymentTotalDueEl = document.getElementById('payment-total-due');
const cashGivenInput = document.getElementById('cash-given');
const changeResultBox = document.getElementById('change-result-box');
const paymentChangeAmountEl = document.getElementById('payment-change-amount');
const btnConfirmPayment = document.getElementById('btn-confirm-payment');

// Receipt Preview Modal
const receiptPreviewModal = document.getElementById('receipt-preview-modal');
const receiptPreviewBody = document.getElementById('receipt-preview-body');
const btnCloseReceiptPreview = document.getElementById('btn-close-receipt-preview');
const btnReceiptClose = document.getElementById('btn-receipt-close');
const btnReceiptPrint = document.getElementById('btn-receipt-print');

// Toast
const scannerToast = document.getElementById('scanner-toast');
const toastTitle = document.getElementById('toast-title');

// ==========================================
// API Handlers
// ==========================================
async function fetchProducts() {
    try {
        posProductGrid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500"><i class="ri-loader-4-line text-3xl animate-spin block mb-2"></i>กำลังดึงข้อมูลจาก Database...</div>';
        const res = await fetch(`${API_BASE}/products`);
        if (!res.ok) throw new Error('Network response was not ok');
        products = await res.json();

        renderPosProducts();
        renderInventory();
    } catch (err) {
        console.error('API Fetch failed:', err);
        posProductGrid.innerHTML = `
            <div class="col-span-full text-center py-10 text-red-500">
                <i class="ri-error-warning-line text-3xl block mb-2"></i>
                ไม่สามารถเชื่อมต่อฐานข้อมูลได้<br>
                กรุณาตรวจสอบให้แน่ใจว่ารัน 'node server.js' และเชื่อมต่อ MySQL แล้ว
            </div>`;
    }
}

async function addProductAPI(data) {
    const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add product');
    return await res.json();
}

async function updateProductAPI(id, data) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update product');
    return await res.json();
}

async function deleteProductAPI(id) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete product');
    return await res.json();
}


// ==========================================
// Initialize App
// ==========================================
async function initApp() {
    // Create first tab
    tabs.push(createTabState());
    activeTabIndex = 0;

    setupEventListeners();
    await fetchProducts();
    renderTabBar();
    renderCart();
    globalBarcodeInput.focus();
}

// ==========================================
// Tab Management
// ==========================================
function renderTabBar() {
    tabBar.innerHTML = '';
    tabs.forEach((tab, index) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === activeTabIndex ? 'active' : ''}`;

        const itemCount = tab.cart.reduce((sum, item) => sum + item.qty, 0);
        const badge = itemCount > 0 ? `<span class="tab-badge">${itemCount}</span>` : '';

        btn.innerHTML = `
            <i class="ri-shopping-bag-line text-sm"></i>
            <span>${tab.name}</span>
            ${badge}
            ${tabs.length > 1 ? '<span class="tab-close" data-close="true">&times;</span>' : ''}
        `;

        btn.addEventListener('click', (e) => {
            if (e.target.closest('[data-close]')) {
                closeTab(index);
                return;
            }
            switchTab(index);
        });

        tabBar.appendChild(btn);
    });

    // Show/hide add button
    btnAddTab.style.display = tabs.length >= MAX_TABS ? 'none' : 'flex';
}

function switchTab(index) {
    if (index === activeTabIndex) return;
    activeTabIndex = index;
    renderTabBar();
    renderCart();
}

function addNewTab() {
    if (tabs.length >= MAX_TABS) return;
    const newTab = createTabState();
    tabs.push(newTab);
    activeTabIndex = tabs.length - 1;
    renderTabBar();
    renderCart();
}

function closeTab(index) {
    if (tabs.length <= 1) return;

    const tab = tabs[index];
    if (tab.cart.length > 0) {
        if (!confirm(`Tab "${tab.name}" ยังมีสินค้าในตะกร้า ต้องการปิดหรือไม่?`)) {
            return;
        }
    }

    tabs.splice(index, 1);

    // Adjust activeTabIndex
    if (activeTabIndex >= tabs.length) {
        activeTabIndex = tabs.length - 1;
    } else if (activeTabIndex > index) {
        activeTabIndex--;
    }

    renderTabBar();
    renderCart();
}

// ==========================================
// Event Listeners
// ==========================================
function setupEventListeners() {
    // Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const viewId = e.currentTarget.dataset.view;

            navBtns.forEach(b => {
                b.classList.remove('active', 'bg-gray-100', 'text-primary');
                b.classList.add('text-secondary');
            });
            e.currentTarget.classList.remove('text-secondary');
            e.currentTarget.classList.add('active', 'bg-gray-100', 'text-primary');

            views.forEach(v => {
                v.classList.remove('active-view');
                v.classList.add('hidden');
            });
            const targetView = document.getElementById(`${viewId}-view`);
            targetView.classList.remove('hidden');
            setTimeout(() => targetView.classList.add('active-view'), 10);

            if (viewId === 'pos') {
                globalBarcodeInput.focus();
            }
        });
    });

    // POS Categories
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            categoryBtns.forEach(b => {
                b.classList.remove('active', 'bg-primary', 'text-white', 'border-primary');
                b.classList.add('bg-gray-50', 'text-secondary', 'border-gray-200');
            });
            e.currentTarget.classList.remove('bg-gray-50', 'text-secondary', 'border-gray-200');
            e.currentTarget.classList.add('active', 'bg-primary', 'text-white', 'border-primary');

            currentCategory = e.currentTarget.dataset.category;
            renderPosProducts();
        });
    });

    posSearchInput.addEventListener('input', renderPosProducts);
    inventorySearchInput.addEventListener('input', renderInventory);
    btnClearCart.addEventListener('click', clearCart);
    btnCheckout.addEventListener('click', openPaymentModal);

    // Tab Management
    btnAddTab.addEventListener('click', addNewTab);

    // Sidebar Toggle
    btnToggleSidebar.addEventListener('click', () => {
        sidebarNav.classList.toggle('nav-collapsed');
        const label = btnToggleSidebar.querySelector('.nav-label');
        if (sidebarNav.classList.contains('nav-collapsed')) {
            label.textContent = 'ขยายเมนู';
        } else {
            label.textContent = 'ยุบเมนู';
        }
    });

    // Add/Edit Product Modal
    btnAddProduct.addEventListener('click', openAddModal);
    btnCloseModal.addEventListener('click', closeProductModal);
    btnCancelModal.addEventListener('click', closeProductModal);
    productForm.addEventListener('submit', handleProductSubmit);

    // Image Upload: file picker -> upload to server -> set hidden field
    productImageFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        imageUploadingIndicator.classList.remove('hidden');
        imageUploadPlaceholder.classList.add('hidden');

        try {
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();

            productImageHidden.value = data.url;
            productImageUrlInput.value = data.url;
            showImagePreview(data.url);
        } catch (err) {
            console.error('Image upload error:', err);
            alert('อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่');
            resetImagePreview();
        } finally {
            imageUploadingIndicator.classList.add('hidden');
            productImageFile.value = '';
        }
    });

    // Manual URL input: sync to hidden field + show preview
    productImageUrlInput.addEventListener('input', () => {
        const url = productImageUrlInput.value.trim();
        productImageHidden.value = url;
        if (url) {
            showImagePreview(url);
        } else {
            resetImagePreview();
        }
    });

    // Payment Modal
    closePaymentBtns.forEach(btn => btn.addEventListener('click', closePaymentModal));
    cashGivenInput.addEventListener('input', calculateChangeOnTheFly);
    btnConfirmPayment.addEventListener('click', handlePaymentSubmit);

    cashGivenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            btnConfirmPayment.click();
        }
    });

    // Receipt Preview Modal
    btnCloseReceiptPreview.addEventListener('click', closeReceiptPreviewAndReset);
    btnReceiptClose.addEventListener('click', closeReceiptPreviewAndReset);
    btnReceiptPrint.addEventListener('click', printReceipt);

    // Clicking backdrops
    [productModal, paymentModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === productModal) closeProductModal();
            if (e.target === paymentModal) closePaymentModal();
        });
    });

    receiptPreviewModal.addEventListener('click', (e) => {
        if (e.target === receiptPreviewModal) closeReceiptPreviewAndReset();
    });

    // Global Keydown for Barcode Scanner
    let barcodeSeq = "";
    let lastKeyTime = Date.now();

    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        const isInputActive = activeElement.tagName === 'INPUT' && activeElement.id !== 'global-barcode-input' && activeElement.id !== 'pos-search' && activeElement.id !== 'cash-given';

        if (isInputActive) return;

        const currentTime = Date.now();
        if (currentTime - lastKeyTime > 50) {
            barcodeSeq = "";
        }

        if (e.key === 'Enter') {
            let codeToProcess = barcodeSeq || globalBarcodeInput.value || posSearchInput.value;
            codeToProcess = codeToProcess.trim();

            if (codeToProcess && !paymentModal.classList.contains('show-modal')) {
                const product = products.find(p => p.barcode === codeToProcess || String(p.id) === codeToProcess);
                if (product) {
                    e.preventDefault();
                    addToCart(product);
                    showToast(product.name);

                    barcodeSeq = "";
                    globalBarcodeInput.value = "";
                    posSearchInput.value = "";
                    renderPosProducts();
                }
            } else if (paymentModal.classList.contains('show-modal')) {
                return;
            }
        } else if (e.key.length === 1) {
            barcodeSeq += e.key;
        }
        lastKeyTime = currentTime;
    });

    document.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
            globalBarcodeInput.focus();
        }
    });
}

function showToast(productName) {
    toastTitle.textContent = productName;
    scannerToast.classList.remove('translate-y-[150%]');
    setTimeout(() => {
        scannerToast.classList.add('translate-y-[150%]');
    }, 2500);
}

// ==========================================
// POS Logic
// ==========================================
function renderPosProducts() {
    const searchTerm = posSearchInput.value.toLowerCase().trim();
    posProductGrid.innerHTML = '';

    const filtered = products.filter(p => {
        const matchCategory = currentCategory === 'ทั้งหมด' || p.category === currentCategory;
        const matchSearch = p.name.toLowerCase().includes(searchTerm) || (p.barcode && p.barcode.includes(searchTerm));
        return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
        posProductGrid.innerHTML = `
            <div class="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
                <i class="ri-search-line text-4xl mb-3"></i>
                <p>ไม่พบรายการสินค้า</p>
            </div>`;
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow hover:border-accent hover:-translate-y-[2px] transition-all flex flex-col active:scale-95 group h-[140px]';
        card.innerHTML = `
            <div class="h-[60px] bg-gray-50 overflow-hidden shrink-0 relative">
                <img src="${p.image || 'https://via.placeholder.com/300'}" alt="${p.name}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.src='https://via.placeholder.com/300'">
            </div>
            <div class="p-2 flex-1 flex flex-col justify-between">
                <div>
                    <h4 class="text-sm font-light text-gray-800 leading-tight line-clamp-2">${p.name}</h4>
                </div>
                <div class="font-medium text-accent mt-auto text-sm flex justify-between items-center">
                    <span>฿${parseFloat(p.price).toFixed(2)}</span>
                    <span class="text-[9px] font-normal text-gray-300 bg-gray-50 px-1 rounded border border-gray-100">${p.barcode ? '<i class="ri-barcode-line"></i>' : ''}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => addToCart(p));
        posProductGrid.appendChild(card);
    });
}

// ==========================================
// Cart Logic (Multi-Tab)
// ==========================================
function addToCart(product) {
    const tab = getActiveTab();
    const existingItem = tab.cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        tab.cart.push({ ...product, qty: 1 });
    }
    renderCart();
    renderTabBar(); // update badge count
    setTimeout(() => {
        cartItemsContainer.scrollTop = cartItemsContainer.scrollHeight;
    }, 50);
}

window.updateCartQty = function (id, delta) {
    const tab = getActiveTab();
    const item = tab.cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            tab.cart = tab.cart.filter(i => i.id !== id);
        }
    }
    renderCart();
    renderTabBar();
}

function clearCart() {
    const tab = getActiveTab();
    if (tab.cart.length === 0) return;
    if (confirm('คุณต้องการเคลียร์รายการสั่งซื้อหรือไม่?')) {
        tab.cart = [];
        renderCart();
        renderTabBar();
        globalBarcodeInput.focus();
    }
}

function formatMoney(amount) {
    return '฿' + amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderCart() {
    const tab = getActiveTab();
    cartItemsContainer.innerHTML = '';

    if (tab.cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-gray-300 space-y-3 pointer-events-none p-4 text-center">
                <i class="ri-shopping-cart-2-line text-5xl"></i>
                <p class="text-sm font-medium">ตระกร้าว่างเปล่า</p>
                <p class="text-xs text-gray-400">แตะหมวดหมู่ หรือสแกนบาร์โค้ดเพื่อเพิ่มรายการ</p>
            </div>
        `;
        cartSubtotalEl.textContent = '฿0.00';
        cartTaxEl.textContent = '฿0.00';
        cartTotalEl.textContent = '฿0.00';
        btnCheckout.disabled = true;
        tab.totalDue = 0;
        return;
    }

    btnCheckout.disabled = false;
    let subtotal = 0;

    tab.cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;

        const cartItemEl = document.createElement('div');
        cartItemEl.className = 'px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50';
        cartItemEl.innerHTML = `
            <div class="flex gap-3">
                <div class="flex-1 min-w-0 flex flex-col justify-center">
                    <h5 class="text-[16px] font-medium text-gray-900 truncate">${item.name}</h5>
                    <div class="text-[14px] text-gray-500 mt-0.5">${formatMoney(item.price)} ต่อชิ้น</div>
                </div>
                <div class="text-right flex flex-col justify-center">
                    <div class="text-lg font-medium text-accent">${formatMoney(itemTotal)}</div>
                </div>
            </div>
            <div class="flex items-center gap-2 mt-2 bg-white rounded-lg border border-gray-200 p-0.5 w-fit">
                <button class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors" onclick="updateCartQty(${item.id}, -1)">
                    <i class="ri-subtract-line text-sm"></i>
                </button>
                <span class="text-sm font-medium w-8 text-center">${item.qty}</span>
                <button class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors" onclick="updateCartQty(${item.id}, 1)">
                    <i class="ri-add-line text-sm"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItemEl);
    });

    const totalIncludingVat = subtotal;
    const tax = totalIncludingVat * 7 / 107;
    const subtotalExclVat = totalIncludingVat - tax;

    tab.totalDue = totalIncludingVat;

    cartSubtotalEl.textContent = formatMoney(subtotalExclVat);
    cartTaxEl.textContent = formatMoney(tax);
    cartTotalEl.textContent = formatMoney(tab.totalDue);
}

// ==========================================
// Payment Modal Logic
// ==========================================
function openPaymentModal() {
    const tab = getActiveTab();
    if (tab.cart.length === 0) return;

    paymentTotalDueEl.textContent = formatMoney(tab.totalDue);
    cashGivenInput.value = '';
    changeResultBox.classList.add('hidden');
    paymentChangeAmountEl.textContent = '฿0.00';
    btnConfirmPayment.innerHTML = '<i class="ri-calculator-line"></i> คำนวณเงินทอน';
    btnConfirmPayment.disabled = false;

    cashGivenInput.min = tab.totalDue.toFixed(2);

    paymentModal.classList.add('show-modal');
    setTimeout(() => {
        cashGivenInput.focus();
        cashGivenInput.select();
    }, 150);
}

function closePaymentModal() {
    paymentModal.classList.remove('show-modal');
    globalBarcodeInput.focus();
}

function calculateChangeOnTheFly() {
    const tab = getActiveTab();
    const cash = parseFloat(cashGivenInput.value) || 0;
    const difference = cash - tab.totalDue;

    if (cash > 0 && cash >= tab.totalDue) {
        changeResultBox.classList.remove('hidden');
        paymentChangeAmountEl.textContent = formatMoney(difference);
        paymentChangeAmountEl.className = 'text-3xl font-bold font-mono text-green-600';
        btnConfirmPayment.disabled = false;
    } else if (cash > 0 && cash < tab.totalDue) {
        changeResultBox.classList.remove('hidden');
        paymentChangeAmountEl.textContent = "เงินไม่พอ";
        paymentChangeAmountEl.className = 'text-lg font-bold font-mono text-red-500';
        btnConfirmPayment.disabled = true;
    } else {
        changeResultBox.classList.add('hidden');
        btnConfirmPayment.disabled = false;
    }
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    e.stopPropagation();

    const tab = getActiveTab();
    const cash = parseFloat(cashGivenInput.value);

    if (cash < tab.totalDue) {
        alert("จำนวนเงินที่รับมาน้อยกว่ายอดที่ต้องชำระ!");
        return;
    }

    const changeAmount = cash - tab.totalDue;
    btnConfirmPayment.disabled = true;

    document.getElementById('receipt-date').textContent = new Date().toLocaleString('th-TH');

    const receiptItemsBody = document.getElementById('receipt-items-body');
    receiptItemsBody.innerHTML = '';

    let subtotal = 0;
    tab.cart.forEach(item => {
        const lineTotal = item.price * item.qty;
        subtotal += lineTotal;
        receiptItemsBody.innerHTML += `
            <tr class="align-top">
                <td class="py-1 pe-2">
                    <div class="break-words">${item.name}</div>
                    <div class="text-[10px] text-gray-500">@${item.price.toFixed(2)}</div>
                </td>
                <td class="text-center py-1 px-1">${item.qty}</td>
                <td class="text-right py-1 pl-2">${lineTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    const totalIncludingVat = subtotal;
    const tax = totalIncludingVat * 7 / 107;
    const subtotalExclVat = totalIncludingVat - tax;

    document.getElementById('receipt-subtotal').textContent = subtotalExclVat.toFixed(2);
    document.getElementById('receipt-tax').textContent = tax.toFixed(2);
    document.getElementById('receipt-total').textContent = totalIncludingVat.toFixed(2);
    document.getElementById('receipt-cash').textContent = cash.toFixed(2);
    document.getElementById('receipt-change').textContent = changeAmount.toFixed(2);

    // Close payment modal, then open receipt preview
    closePaymentModal();
    openReceiptPreview();
}

// ==========================================
// Receipt Preview Modal
// ==========================================
function openReceiptPreview() {
    // Clone the receipt HTML into the preview body
    const receiptSource = document.getElementById('receipt-container');
    receiptPreviewBody.innerHTML = receiptSource.innerHTML;

    receiptPreviewModal.classList.add('show-modal');
}

function closeReceiptPreviewAndReset() {
    receiptPreviewModal.classList.remove('show-modal');

    // Reset active tab cart after closing receipt
    const tab = getActiveTab();
    tab.cart = [];
    tab.totalDue = 0;
    renderCart();
    renderTabBar();
    globalBarcodeInput.focus();
}

function printReceipt() {
    // Print first, then reset
    receiptPreviewModal.classList.remove('show-modal');

    setTimeout(() => {
        window.print();

        // Reset after print dialog closes
        const tab = getActiveTab();
        tab.cart = [];
        tab.totalDue = 0;
        renderCart();
        renderTabBar();
        globalBarcodeInput.focus();
    }, 100);
}

// ==========================================
// Inventory Management (CRUD Modal)
// ==========================================
function renderInventory() {
    const searchTerm = inventorySearchInput.value.toLowerCase().trim();
    inventoryTableBody.innerHTML = '';

    const filtered = products.filter(p => {
        return p.name.toLowerCase().includes(searchTerm) || (p.barcode && p.barcode.includes(searchTerm));
    });

    if (filtered.length === 0) {
        inventoryTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400">ไม่พบสินค้าที่ตรงตามเงื่อนไข</td></tr>`;
        return;
    }

    filtered.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors group';
        tr.innerHTML = `
            <td class="px-6 py-3 whitespace-nowrap">
                <img src="${p.image || 'https://via.placeholder.com/150'}" alt="${p.name}" class="h-10 w-10 rounded object-cover border border-gray-200" onerror="this.src='https://via.placeholder.com/150'">
            </td>
            <td class="px-6 py-3 whitespace-nowrap font-mono text-xs text-gray-500 pl-4 border-l-2 border-transparent group-hover:border-accent">
                ${p.barcode || '-'}
            </td>
            <td class="px-6 py-3 font-medium text-gray-900 max-w-xs truncate" title="${p.name}">
                ${p.name}
            </td>
            <td class="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                <span class="bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">${p.category}</span>
            </td>
            <td class="px-6 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                ฿${parseFloat(p.price).toFixed(2)}
            </td>
            <td class="px-6 py-3 whitespace-nowrap text-right text-sm">
                <button class="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors mr-2 cursor-pointer" onclick="openEditModal(${p.id})"><i class="ri-pencil-line"></i></button>
                <button class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors cursor-pointer" onclick="deleteProduct(${p.id})"><i class="ri-delete-bin-line"></i></button>
            </td>
        `;
        inventoryTableBody.appendChild(tr);
    });
}

function openAddModal() {
    productForm.reset();
    document.getElementById('product-id').value = '';
    productImageHidden.value = '';
    productImageUrlInput.value = '';
    resetImagePreview();
    modalTitle.textContent = 'เพิ่มสินค้าใหม่';
    productModal.classList.add('show-modal');
    setTimeout(() => document.getElementById('product-barcode').focus(), 100);
}

function closeProductModal() {
    productModal.classList.remove('show-modal');
    globalBarcodeInput.focus();
}

window.openEditModal = function (id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('product-id').value = p.id;
    document.getElementById('product-barcode').value = p.barcode || '';
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-price').value = p.price;
    document.getElementById('product-category').value = p.category;
    document.getElementById('product-image').value = p.image || '';
    productImageUrlInput.value = p.image || '';

    if (p.image) {
        showImagePreview(p.image);
    } else {
        resetImagePreview();
    }

    modalTitle.textContent = 'แก้ไขสินค้า';
    productModal.classList.add('show-modal');
};

async function handleProductSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('product-id').value;
    const data = {
        barcode: document.getElementById('product-barcode').value.trim(),
        name: document.getElementById('product-name').value.trim(),
        price: parseFloat(document.getElementById('product-price').value),
        category: document.getElementById('product-category').value,
        image: document.getElementById('product-image').value.trim()
    };

    try {
        if (id) {
            await updateProductAPI(id, data);
        } else {
            await addProductAPI(data);
        }
        await fetchProducts();
        closeProductModal();
    } catch (err) {
        alert("บันทึกไม่สำเร็จ ตรวจสอบว่าบาร์โค้ดอาจซ้ำกัน?");
    }
}

window.deleteProduct = async function (id) {
    if (confirm('ยืนยันลบสินค้านี้ออกจากฐานข้อมูลอย่างถาวร?')) {
        try {
            await deleteProductAPI(id);
            // Remove from all tabs' carts
            tabs.forEach(tab => {
                tab.cart = tab.cart.filter(i => i.id !== id);
            });
            await fetchProducts();
            renderCart();
            renderTabBar();
        } catch (err) {
            alert("ไม่สามารถลบสินค้าได้ระบบมีปัญหา");
        }
    }
};

// ==========================================
// Image Preview Helpers
// ==========================================
function showImagePreview(url) {
    imagePreview.src = url;
    imagePreview.classList.remove('hidden');
    imageUploadPlaceholder.classList.add('hidden');
}

function resetImagePreview() {
    imagePreview.src = '';
    imagePreview.classList.add('hidden');
    imageUploadPlaceholder.classList.remove('hidden');
}


document.addEventListener('DOMContentLoaded', initApp);
