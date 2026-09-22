/* ==========================================================================
   CUERO GENUINO - APPLICATION LOGIC (SPA)
   State Management, Filtering, Modal, Cart & WhatsApp Ordering
   ========================================================================== */

(function () {
  'use strict';

  // Config & State
  const WHATSAPP_PHONE = '573000000000'; // Default Store WhatsApp Number
  
  let state = {
    gender: 'all',
    category: 'all',
    size: 'all',
    search: '',
    sort: 'default',
    wishlistOnly: false,
    selectedProduct: null,
    selectedModalSize: null,
    cart: JSON.parse(localStorage.getItem('cg_cart') || '[]'),
    wishlist: new Set(JSON.parse(localStorage.getItem('cg_wishlist') || '[]')),
    theme: localStorage.getItem('cg_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  };

  // DOM Elements
  const el = {
    productGrid: document.getElementById('productGrid'),
    emptyState: document.getElementById('emptyState'),
    resultsCount: document.getElementById('resultsCount'),
    sectionTitle: document.getElementById('sectionTitle'),
    categoryPillsContainer: document.getElementById('categoryPillsContainer'),
    searchInput: document.getElementById('searchInput'),
    sizeSelect: document.getElementById('sizeSelect'),
    sortSelect: document.getElementById('sortSelect'),
    genderTabs: document.querySelectorAll('.gender-tab'),
    
    // Modal
    productModal: document.getElementById('productModal'),
    modalContent: document.getElementById('modalContent'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    
    // Cart Drawer
    cartBtn: document.getElementById('cartBtn'),
    cartBadge: document.getElementById('cartBadge'),
    cartDrawerBackdrop: document.getElementById('cartDrawerBackdrop'),
    cartCloseBtn: document.getElementById('cartCloseBtn'),
    cartBody: document.getElementById('cartBody'),
    cartTotalAmount: document.getElementById('cartTotalAmount'),
    customerNameInput: document.getElementById('customerNameInput'),
    sendWhatsAppCartBtn: document.getElementById('sendWhatsAppCartBtn'),
    
    // Wishlist
    wishlistBtn: document.getElementById('wishlistBtn'),
    wishlistBadge: document.getElementById('wishlistBadge'),
    
    // Theme
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeMoonIcon: document.getElementById('themeMoonIcon'),
    themeSunIcon: document.getElementById('themeSunIcon'),
    logoBtn: document.getElementById('logoBtn'),
    toastContainer: document.getElementById('toastContainer')
  };

  // Products Data Reference
  const PRODUCTS = window.PRODUCTS || [];

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  function init() {
    applyTheme(state.theme);
    bindEvents();
    renderCategoryPills();
    renderProducts();
    updateBadges();
  }

  // ==========================================================================
  // THEME & BADGES
  // ==========================================================================

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cg_theme', theme);

    if (theme === 'dark') {
      el.themeMoonIcon.style.display = 'none';
      el.themeSunIcon.style.display = 'block';
    } else {
      el.themeMoonIcon.style.display = 'block';
      el.themeSunIcon.style.display = 'none';
    }
  }

  function updateBadges() {
    // Cart badge
    const totalItems = state.cart.reduce((sum, item) => sum + item.qty, 0);
    el.cartBadge.textContent = totalItems;
    el.cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';

    // Wishlist badge
    const wishCount = state.wishlist.size;
    el.wishlistBadge.textContent = wishCount;
    el.wishlistBadge.style.display = wishCount > 0 ? 'flex' : 'none';

    // Save persistence
    localStorage.setItem('cg_cart', JSON.stringify(state.cart));
    localStorage.setItem('cg_wishlist', JSON.stringify(Array.from(state.wishlist)));
  }

  // ==========================================================================
  // FILTERING & CATEGORIES
  // ==========================================================================

  function getAvailableCategories() {
    let prods = PRODUCTS;
    if (state.gender !== 'all') {
      prods = prods.filter(p => p.gender === state.gender);
    }
    const categories = new Set(prods.map(p => p.cat));
    return ['all', ...Array.from(categories).sort()];
  }

  function renderCategoryPills() {
    const categories = getAvailableCategories();
    el.categoryPillsContainer.innerHTML = '';

    categories.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = `cat-pill ${state.category === cat ? 'active' : ''}`;
      pill.textContent = cat === 'all' ? 'Todas las Categorías' : cat;
      pill.addEventListener('click', () => {
        state.category = cat;
        renderCategoryPills();
        renderProducts();
      });
      el.categoryPillsContainer.appendChild(pill);
    });
  }

  function filterAndSortProducts() {
    let result = [...PRODUCTS];

    // Gender Filter
    if (state.gender !== 'all') {
      result = result.filter(p => p.gender === state.gender);
    }

    // Category Filter
    if (state.category !== 'all') {
      result = result.filter(p => p.cat === state.category);
    }

    // Size Filter
    if (state.size !== 'all') {
      result = result.filter(p => p.sizes && p.sizes.includes(state.size));
    }

    // Wishlist Only Filter
    if (state.wishlistOnly) {
      result = result.filter(p => state.wishlist.has(p.id));
    }

    // Search Query (name, color, material, cat, blurb)
    if (state.search.trim() !== '') {
      const q = state.search.toLowerCase().trim();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q) ||
        p.material.toLowerCase().includes(q) ||
        p.cat.toLowerCase().includes(q) ||
        (p.blurb && p.blurb.toLowerCase().includes(q))
      );
    }

    // Sort
    if (state.sort === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (state.sort === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (state.sort === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }

  // ==========================================================================
  // RENDER PRODUCTS GRID
  // ==========================================================================

  function renderProducts() {
    const products = filterAndSortProducts();
    el.productGrid.innerHTML = '';

    // Section title & Count
    let titleText = 'Todos los Productos';
    if (state.wishlistOnly) {
      titleText = 'Mis Favoritos';
    } else if (state.gender === 'caballero') {
      titleText = 'Colección Caballero';
    } else if (state.gender === 'dama') {
      titleText = 'Colección Dama';
    }
    if (state.category !== 'all') {
      titleText += ` — ${state.category}`;
    }
    el.sectionTitle.textContent = titleText;
    el.resultsCount.textContent = `${products.length} producto${products.length !== 1 ? 's' : ''}`;

    if (products.length === 0) {
      el.emptyState.style.display = 'block';
      return;
    }
    el.emptyState.style.display = 'none';

    // Render Cards
    const fragment = document.createDocumentFragment();

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';

      const isFav = state.wishlist.has(p.id);
      const genderLabel = p.gender === 'caballero' ? 'Caballero' : 'Dama';

      card.innerHTML = `
        <div class="card-image-container" data-id="${p.id}">
          <img src="${p.img}" alt="${p.name}" loading="lazy">
          
          <div class="card-badges">
            <span class="badge-gender">${genderLabel}</span>
            <span class="badge-material">${p.material}</span>
          </div>

          <button class="card-fav-btn ${isFav ? 'active' : ''}" data-id="${p.id}" title="Favorito">
            <svg xmlns="http://www.w3.org/2000/svg" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        <div class="card-body">
          <span class="card-category">${p.cat}</span>
          <h3 class="card-title">${p.name}</h3>
          <span class="card-color">Piel ${p.color} (${p.material})</span>

          <div class="card-footer">
            <span class="card-price">$${p.price.toFixed(2)}</span>
            <button class="card-view-btn" data-id="${p.id}">Ver Detalle</button>
          </div>
        </div>
      `;

      // Event listeners for card
      card.querySelector('.card-image-container').addEventListener('click', (e) => {
        if (!e.target.closest('.card-fav-btn')) {
          openModal(p);
        }
      });
      card.querySelector('.card-view-btn').addEventListener('click', () => openModal(p));
      
      const favBtn = card.querySelector('.card-fav-btn');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWishlist(p.id);
      });

      fragment.appendChild(card);
    });

    el.productGrid.appendChild(fragment);
  }

  // ==========================================================================
  // PRODUCT DETAIL MODAL
  // ==========================================================================

  function openModal(product) {
    state.selectedProduct = product;
    state.selectedModalSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : null;

    const sizesButtons = product.sizes.map(sz => `
      <button class="size-btn ${sz === state.selectedModalSize ? 'selected' : ''}" data-size="${sz}">${sz}</button>
    `).join('');

    el.modalContent.innerHTML = `
      <div class="modal-image-col">
        <img src="${product.img}" alt="${product.name}">
      </div>

      <div class="modal-details-col">
        <span class="modal-cat-tag">${product.cat} • Piel 100% Genuina</span>
        <h2 class="modal-title">${product.name}</h2>
        <div class="modal-price">$${product.price.toFixed(2)}</div>

        <div class="modal-meta-list">
          <div><b>Color:</b> ${product.color}</div>
          <div><b>Material / Piel:</b> ${product.material}</div>
          <div><b>Colección:</b> ${product.gender === 'caballero' ? 'Caballero' : 'Dama'}</div>
        </div>

        <div class="modal-blurb">"${product.blurb || 'Pieza 100% cuero genuino, con acabado y costura cuidados al detalle.'}"</div>

        <div class="size-selection-label">
          <span>Selecciona tu Talla:</span>
          <span style="font-weight:400; font-size:0.8rem; color:var(--text-muted);">Disponibles</span>
        </div>
        <div class="size-grid" id="modalSizeGrid">
          ${sizesButtons}
        </div>

        <div class="modal-actions">
          <button class="btn-add-cart" id="modalAddCartBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 11h14l1 12H4L5 11z" />
            </svg>
            Añadir al Carrito
          </button>
          
          <button class="btn-wa-direct" id="modalWaDirectBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            Pedir Directo por WhatsApp
          </button>
        </div>
      </div>
    `;

    // Size Selection Logic
    const sizeBtns = el.modalContent.querySelectorAll('#modalSizeGrid .size-btn');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sizeBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.selectedModalSize = btn.dataset.size;
      });
    });

    // Modal Action Handlers
    el.modalContent.querySelector('#modalAddCartBtn').addEventListener('click', () => {
      if (!state.selectedModalSize) {
        showToast('Por favor selecciona una talla');
        return;
      }
      addToCart(product, state.selectedModalSize);
      closeModal();
    });

    el.modalContent.querySelector('#modalWaDirectBtn').addEventListener('click', () => {
      if (!state.selectedModalSize) {
        showToast('Por favor selecciona una talla');
        return;
      }
      sendDirectWhatsAppProduct(product, state.selectedModalSize);
    });

    el.productModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    el.productModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ==========================================================================
  // SHOPPING CART & DRAWER
  // ==========================================================================

  function addToCart(product, size) {
    const existingIndex = state.cart.findIndex(item => item.id === product.id && item.size === size);

    if (existingIndex > -1) {
      state.cart[existingIndex].qty += 1;
    } else {
      state.cart.push({
        id: product.id,
        size: size,
        qty: 1
      });
    }

    updateBadges();
    showToast(`Añadido "${product.name}" (Talla ${size}) al carrito`);
  }

  function updateCartQty(index, delta) {
    if (state.cart[index]) {
      state.cart[index].qty += delta;
      if (state.cart[index].qty <= 0) {
        state.cart.splice(index, 1);
      }
      updateBadges();
      renderCartDrawer();
    }
  }

  function removeCartItem(index) {
    if (state.cart[index]) {
      state.cart.splice(index, 1);
      updateBadges();
      renderCartDrawer();
      showToast('Producto eliminado del carrito');
    }
  }

  function renderCartDrawer() {
    el.cartBody.innerHTML = '';

    if (state.cart.length === 0) {
      el.cartBody.innerHTML = `
        <div style="text-align:center; padding: 40px 0; color: var(--text-muted);">
          <svg xmlns="http://www.w3.org/2000/svg" style="width:48px; height:48px; opacity:0.5; margin-bottom:12px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 11h14l1 12H4L5 11z" />
          </svg>
          <p>Tu carrito está vacío</p>
        </div>
      `;
      el.cartTotalAmount.textContent = '$0.00';
      el.sendWhatsAppCartBtn.style.opacity = '0.5';
      el.sendWhatsAppCartBtn.style.pointerEvents = 'none';
      return;
    }

    el.sendWhatsAppCartBtn.style.opacity = '1';
    el.sendWhatsAppCartBtn.style.pointerEvents = 'auto';

    let total = 0;

    state.cart.forEach((cartItem, idx) => {
      const product = PRODUCTS.find(p => p.id === cartItem.id);
      if (!product) return;

      const subtotal = product.price * cartItem.qty;
      total += subtotal;

      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <img src="${product.img}" alt="${product.name}" class="cart-item-img">
        
        <div class="cart-item-info">
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-meta">Talla: ${cartItem.size} • Piel ${product.color}</div>
          <div class="cart-item-price">$${product.price.toFixed(2)}</div>
          
          <div class="cart-item-controls">
            <button class="qty-btn" data-action="minus" data-idx="${idx}">-</button>
            <span class="cart-item-qty">${cartItem.qty}</span>
            <button class="qty-btn" data-action="plus" data-idx="${idx}">+</button>
            
            <button class="cart-item-remove" data-action="remove" data-idx="${idx}">Eliminar</button>
          </div>
        </div>
      `;

      itemEl.querySelector('[data-action="minus"]').addEventListener('click', () => updateCartQty(idx, -1));
      itemEl.querySelector('[data-action="plus"]').addEventListener('click', () => updateCartQty(idx, 1));
      itemEl.querySelector('[data-action="remove"]').addEventListener('click', () => removeCartItem(idx));

      el.cartBody.appendChild(itemEl);
    });

    el.cartTotalAmount.textContent = `$${total.toFixed(2)}`;
  }

  function openCartDrawer() {
    renderCartDrawer();
    el.cartDrawerBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    el.cartDrawerBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ==========================================================================
  // WHATSAPP ORDER INTEGRATION
  // ==========================================================================

  function sendDirectWhatsAppProduct(product, size) {
    const text = 
`🛒 *Nuevo Pedido - Cuero Genuino*

Hola! Me interesa comprar el siguiente producto:

📌 *Producto:* ${product.name}
👞 *Categoría:* ${product.cat} (${product.gender === 'caballero' ? 'Caballero' : 'Dama'})
🎨 *Color/Piel:* ${product.color} (${product.material})
📏 *Talla:* ${size}
💰 *Precio:* $${product.price.toFixed(2)}

Quedo atento a las instrucciones de pago y envío. Gracias!`;

    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  function sendCartWhatsAppOrder() {
    if (state.cart.length === 0) return;

    const customerName = el.customerNameInput.value.trim();
    let total = 0;
    let itemsText = '';

    state.cart.forEach((cartItem, idx) => {
      const p = PRODUCTS.find(prod => prod.id === cartItem.id);
      if (!p) return;

      const subtotal = p.price * cartItem.qty;
      total += subtotal;

      itemsText += `${idx + 1}. *${p.name}* (Talla ${cartItem.size}) x${cartItem.qty} - $${subtotal.toFixed(2)}\n   Piel: ${p.color} (${p.material})\n`;
    });

    const text = 
`🛒 *Pedido de Carrito - Cuero Genuino*
${customerName ? `👤 *Cliente:* ${customerName}\n` : ''}
Detalle del pedido:
${itemsText}
💰 *TOTAL: $${total.toFixed(2)}*

Hola! Quisiera confirmar la disponibilidad y coordinar el pago/envío de mi pedido. Gracias!`;

    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  // ==========================================================================
  // WISHLIST
  // ==========================================================================

  function toggleWishlist(productId) {
    if (state.wishlist.has(productId)) {
      state.wishlist.delete(productId);
      showToast('Eliminado de tus favoritos');
    } else {
      state.wishlist.add(productId);
      showToast('Añadido a tus favoritos ❤️');
    }

    updateBadges();
    renderProducts();
  }

  // ==========================================================================
  // TOAST NOTIFICATIONS
  // ==========================================================================

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span>✨</span>
      <span>${message}</span>
    `;

    el.toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ==========================================================================
  // EVENT BINDINGS
  // ==========================================================================

  function bindEvents() {
    // Gender tabs
    el.genderTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        el.genderTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.gender = tab.dataset.gender;
        state.category = 'all';
        state.wishlistOnly = false;
        renderCategoryPills();
        renderProducts();
      });
    });

    // Search Input
    let searchTimeout;
    el.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.search = e.target.value;
        renderProducts();
      }, 200);
    });

    // Size & Sort Selects
    el.sizeSelect.addEventListener('change', (e) => {
      state.size = e.target.value;
      renderProducts();
    });

    el.sortSelect.addEventListener('change', (e) => {
      state.sort = e.target.value;
      renderProducts();
    });

    // Wishlist Toggle Filter
    el.wishlistBtn.addEventListener('click', () => {
      state.wishlistOnly = !state.wishlistOnly;
      renderProducts();
      if (state.wishlistOnly) {
        showToast('Mostrando solo tus favoritos');
      }
    });

    // Theme Toggle
    el.themeToggleBtn.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    // Logo Click
    el.logoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      state.gender = 'all';
      state.category = 'all';
      state.size = 'all';
      state.search = '';
      state.wishlistOnly = false;
      el.searchInput.value = '';
      el.sizeSelect.value = 'all';
      el.sortSelect.value = 'default';
      
      el.genderTabs.forEach(t => t.classList.remove('active'));
      el.genderTabs[0].classList.add('active');

      renderCategoryPills();
      renderProducts();
    });

    // Modal Events
    el.modalCloseBtn.addEventListener('click', closeModal);
    el.productModal.addEventListener('click', (e) => {
      if (e.target === el.productModal) closeModal();
    });

    // Cart Drawer Events
    el.cartBtn.addEventListener('click', openCartDrawer);
    el.cartCloseBtn.addEventListener('click', closeCartDrawer);
    el.cartDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === el.cartDrawerBackdrop) closeCartDrawer();
    });

    el.sendWhatsAppCartBtn.addEventListener('click', sendCartWhatsAppOrder);

    // Keyboard Accessibility (Esc closes modal/drawer)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeCartDrawer();
      }
    });
  }

  // Initialize App on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
