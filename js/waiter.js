// Módulo de mesero
let currentOrder = {
    items: []
};

let availableProducts = [];
let availableToppings = [];
let filteredProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!authManager.isAuthenticated() || !authManager.hasRole(ROLES.MESERO)) {
        authManager.logout();
        return;
    }

    initializeWaiterDashboard();
});

function initializeWaiterDashboard() {
    const user = authManager.getUser();
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = `Usuario: ${user.name}`;
    }
    
    // Inicializar el pedido vacío
    currentOrder.items = [];
    updateOrderDisplay();
    
    // Inicializar filtro de productos
    filteredProducts = [];
    
    // Cargar datos iniciales
    console.log('Inicializando dashboard de mesero...');
    loadProducts();
    loadToppings();
    loadOrders();
    
    // Verificar autenticación periódicamente
    setInterval(() => {
        if (!authManager.isAuthenticated()) {
            authManager.logout();
        }
    }, 60000);
}

function showPanel(panelId) {
    // Ocultar todos los paneles
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Desactivar todas las pestañas
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar panel seleccionado
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.add('active');
    }
    
    // Activar pestaña correspondiente
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Si no hay event, buscar el botón correspondiente
        const tab = document.querySelector(`.nav-tab[onclick*="${panelId}"]`);
        if (tab) {
            tab.classList.add('active');
        }
    }
    
    // Cargar datos según el panel
    if (panelId === 'orders') {
        loadOrders();
    } else if (panelId === 'newOrder') {
        loadProducts();
        loadToppings();
        // Resetear el pedido actual si está vacío
        if (currentOrder.items.length === 0) {
            updateOrderDisplay();
        }
    }
}

async function loadProducts() {
    const container = document.getElementById('productsList');
    if (!container) {
        console.error('Container productsList no encontrado');
        return;
    }
    
    container.innerHTML = '<p class="info-message">🔄 Cargando productos...</p>';
    
    try {
        console.log('Cargando productos desde:', API_CONFIG.ENDPOINTS.PRODUCTS.LIST);
        availableProducts = await api.get(API_CONFIG.ENDPOINTS.PRODUCTS.LIST) || [];
        console.log('Productos cargados:', availableProducts);
        console.log('Total de productos:', availableProducts.length);
        
        // Asegurar que filteredProducts se inicialice correctamente
        if (availableProducts.length > 0) {
            filterProducts();
        } else {
            displayProducts();
        }
    } catch (error) {
        console.error('Error al cargar productos:', error);
        container.innerHTML = 
            `<p class="error-message">❌ Error al cargar productos: ${error.message || 'Error desconocido'}</p>`;
    }
}

async function loadToppings() {
    try {
        console.log('Cargando toppings desde:', API_CONFIG.ENDPOINTS.TOPPINGS.LIST);
        availableToppings = await api.get(API_CONFIG.ENDPOINTS.TOPPINGS.LIST);
        console.log('Toppings cargados:', availableToppings);
    } catch (error) {
        console.error('Error al cargar toppings:', error);
        // No mostrar error al usuario, solo log
    }
}

function filterProducts() {
    const searchInput = document.getElementById('productSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    if (!availableProducts || availableProducts.length === 0) {
        console.warn('No hay productos disponibles para filtrar');
        filteredProducts = [];
        displayProducts();
        return;
    }
    
    // Filtrar solo productos disponibles (availability puede ser true, 1, o no estar definido)
    const availableProductsList = availableProducts.filter(p => {
        return p.availability !== false && p.availability !== 0;
    });
    
    console.log('Productos disponibles (sin filtro de búsqueda):', availableProductsList.length);
    
    if (searchTerm) {
        filteredProducts = availableProductsList.filter(p => 
            (p.name && p.name.toLowerCase().includes(searchTerm)) ||
            (p.description && p.description.toLowerCase().includes(searchTerm))
        );
        console.log('Productos después de búsqueda:', filteredProducts.length);
    } else {
        filteredProducts = [...availableProductsList];
    }
    
    displayProducts();
}

function displayProducts() {
    const container = document.getElementById('productsList');
    
    if (!container) {
        console.error('Container productsList no encontrado');
        return;
    }
    
    if (!availableProducts || availableProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p class="info-message">⚠️ No hay productos disponibles</p>
                <p class="help-text">Contacta al administrador para agregar productos</p>
            </div>
        `;
        return;
    }
    
    const productsToShow = filteredProducts && filteredProducts.length > 0 
        ? filteredProducts 
        : availableProducts.filter(p => p.availability);
    
    if (productsToShow.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p class="info-message">🔍 No se encontraron productos</p>
                <p class="help-text">Intenta con otro término de búsqueda</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="products-grid">';
    
    productsToShow.forEach(product => {
        html += `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-card-header">
                    <h4>${product.name}</h4>
                </div>
                <div class="product-card-body">
                    <p class="product-description">${product.description || 'Sin descripción'}</p>
                    <div class="product-price-container">
                        <span class="product-price"><strong>${formatCurrency(product.base_price || 0)}</strong></span>
                    </div>
                </div>
                <div class="product-card-footer">
                    <button class="btn btn-primary btn-block" onclick="addProductToOrder(${product.id})">
                        ➕ Agregar
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function clearCurrentOrder() {
    const confirmed = await confirmAction('¿Estás seguro de que quieres limpiar el pedido actual?', 'Limpiar Pedido');
    if (confirmed) {
        currentOrder.items = [];
        updateOrderDisplay();
    }
}

let currentProductForOrder = null;

function addProductToOrder(productId) {
    // Convertir productId a número para comparación
    const id = typeof productId === 'string' ? parseInt(productId, 10) : productId;
    
    // Buscar en filteredProducts primero (productos visibles)
    let product = filteredProducts && filteredProducts.length > 0 
        ? filteredProducts.find(p => p.id === id || p.id === productId)
        : null;
    
    // Si no se encuentra, buscar en availableProducts
    if (!product) {
        product = availableProducts.find(p => p.id === id || p.id === productId || String(p.id) === String(productId));
    }
    
    if (!product) {
        console.error('Producto no encontrado. ID buscado:', productId, 'Tipo:', typeof productId);
        console.error('Productos disponibles:', availableProducts.map(p => ({ id: p.id, name: p.name })));
        showNotification('Producto no encontrado. Por favor, recarga la página.', 'error');
        return;
    }

    currentProductForOrder = product;
    showProductOrderModal(product);
}

function showProductOrderModal(product) {
    // Cerrar modal existente si hay uno
    const existingModal = document.getElementById('productOrderModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'productOrderModal';
    modal.style.display = 'block';
    
    const activeToppings = availableToppings.filter(t => t.status === 'activo' || t.status === 'ACTIVO');
    
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2>➕ Agregar ${product.name}</h2>
                <span class="close" onclick="closeProductOrderModal()">&times;</span>
            </div>
            <form id="productOrderForm" onsubmit="return false;">
                <div class="form-group">
                    <label>📦 Cantidad:</label>
                    <input type="number" id="productQuantity" min="1" value="1" required 
                           onchange="updateProductModalTotal()" class="quantity-input">
                </div>
                <div class="form-group">
                    <label>💰 Precio unitario:</label>
                    <p class="price-display">${formatCurrency(product.base_price || 0)}</p>
                </div>
                ${activeToppings.length > 0 ? `
                <div class="form-group">
                    <label>🍕 Toppings (opcional):</label>
                    <div id="toppingsSelection" class="toppings-selection">
                        ${activeToppings.map(topping => `
                            <label class="topping-option">
                                <input type="checkbox" value="${topping.id}" 
                                       data-price="${topping.additional_price || 0}"
                                       onchange="updateProductModalTotal()">
                                <span class="topping-name">${topping.name}</span>
                                <span class="topping-price">+${formatCurrency(topping.additional_price || 0)}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                ` : '<p class="info-message">No hay toppings disponibles</p>'}
                <div class="modal-total">
                    <strong>Subtotal: <span id="modalSubtotal">${formatCurrency(product.base_price || 0)}</span></strong>
                </div>
                <div class="form-actions-inline">
                    <button type="button" class="btn btn-primary btn-large" onclick="addProductToOrderSubmit()">
                        ➕ Agregar al Pedido
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeProductOrderModal()">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Actualizar total cuando cambia cantidad o toppings
    window.updateProductModalTotal = function() {
        const quantity = parseInt(document.getElementById('productQuantity').value) || 1;
        const basePrice = parseFloat(product.base_price || 0);
        let total = basePrice * quantity;
        
        const selectedToppings = Array.from(document.querySelectorAll('#toppingsSelection input:checked'));
        selectedToppings.forEach(input => {
            const toppingPrice = parseFloat(input.dataset.price || 0);
            total += toppingPrice * quantity;
        });
        
        const subtotalEl = document.getElementById('modalSubtotal');
        if (subtotalEl) {
            subtotalEl.textContent = formatCurrency(total);
        }
    };
}

function closeProductOrderModal() {
    const modal = document.getElementById('productOrderModal');
    if (modal) {
        modal.remove();
    }
    currentProductForOrder = null;
}

function addProductToOrderSubmit() {
    if (!currentProductForOrder) {
        showNotification('Error: No hay producto seleccionado', 'error');
        return;
    }
    
    const quantityInput = document.getElementById('productQuantity');
    if (!quantityInput) {
        showNotification('Error: Campo de cantidad no encontrado', 'error');
        return;
    }
    
    const quantity = parseInt(quantityInput.value);
    if (isNaN(quantity) || quantity < 1) {
        showNotification('Por favor ingresa una cantidad válida (mínimo 1)', 'warning');
        quantityInput.focus();
        return;
    }
    
    const selectedToppings = Array.from(document.querySelectorAll('#toppingsSelection input:checked'))
        .map(input => ({
            topping_id: parseInt(input.value),
            price: parseFloat(input.dataset.price || 0)
        }));
    
    addItemToOrder(currentProductForOrder, quantity, selectedToppings);
    closeProductOrderModal();
    currentProductForOrder = null;
    
    // Mostrar mensaje de éxito
    showNotification('Producto agregado al pedido', 'success');
}

function addItemToOrder(product, quantity, toppings) {
    // Asegurar que todos los IDs sean números
    const productId = typeof product.id === 'string' ? parseInt(product.id, 10) : Number(product.id);
    const quantityNum = typeof quantity === 'string' ? parseInt(quantity, 10) : Number(quantity);
    
    const item = {
        product_id: productId,
        product: product,
        quantity: quantityNum,
        toppings: (toppings || []).map(t => ({
            topping_id: typeof t.topping_id === 'string' ? parseInt(t.topping_id, 10) : Number(t.topping_id),
            price: typeof t.price === 'string' ? parseFloat(t.price) : Number(t.price)
        })),
        unit_price: parseFloat(product.base_price),
        subtotal: parseFloat(product.base_price) * quantityNum
    };
    
    // Calcular subtotal con toppings
    item.toppings.forEach(topping => {
        item.subtotal += topping.price * quantityNum;
    });
    
    currentOrder.items.push(item);
    updateOrderDisplay();
}

function updateOrderDisplay() {
    const container = document.getElementById('currentOrder');
    const totalElement = document.getElementById('orderTotal');
    const submitBtn = document.getElementById('submitOrderBtn');
    const clearBtn = document.getElementById('clearOrderBtn');
    
    if (!container) {
        console.error('Container currentOrder no encontrado');
        return;
    }
    
    if (currentOrder.items.length === 0) {
        container.innerHTML = `
            <div class="empty-order-message">
                <p>📝 Tu pedido está vacío</p>
                <p class="help-text">👉 Haz clic en "Agregar" en cualquier producto para comenzar</p>
            </div>
        `;
        if (totalElement) totalElement.textContent = '0.00';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '✅ Crear Pedido';
        }
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }
    
    let html = '<div class="order-items-list">';
    let total = 0;
    
    currentOrder.items.forEach((item, index) => {
        total += item.subtotal || 0;
        const productName = item.product?.name || 'Producto';
        const toppingsList = item.toppings && item.toppings.length > 0 
            ? item.toppings.map(t => {
                const topping = availableToppings.find(to => to.id === t.topping_id);
                return topping ? topping.name : '';
            }).filter(Boolean).join(', ')
            : '';
        
        html += `
            <div class="order-item-card">
                <div class="order-item-header">
                    <div class="order-item-title">
                        <span class="item-quantity">${item.quantity}x</span>
                        <strong>${productName}</strong>
                    </div>
                    <div class="order-item-actions">
                        <span class="item-price">${formatCurrency(item.subtotal || 0)}</span>
                        <button class="btn btn-danger btn-sm" onclick="removeItemFromOrder(${index})" title="Eliminar">
                            🗑️
                        </button>
                    </div>
                </div>
                ${toppingsList ? `
                    <div class="order-item-details">
                        <p class="toppings-list">➕ ${toppingsList}</p>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    if (totalElement) totalElement.textContent = formatCurrency(total);
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = `✅ Crear Pedido - ${formatCurrency(total)}`;
    }
    if (clearBtn) clearBtn.style.display = 'block';
}

function removeItemFromOrder(index) {
    confirmAction('¿Eliminar este item del pedido?', 'Confirmar Eliminación')
        .then(confirmed => {
            if (confirmed) {
                currentOrder.items.splice(index, 1);
                updateOrderDisplay();
                showNotification('Item eliminado del pedido', 'info');
            }
        });
}

async function submitOrder() {
    if (currentOrder.items.length === 0) {
        showNotification('El pedido está vacío', 'warning');
        return;
    }
    
    const submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando pedido...';
    }
    
    try {
        const orderData = {
            items: currentOrder.items.map(item => {
                // Asegurar que product_id sea un número
                const productId = typeof item.product_id === 'string' 
                    ? parseInt(item.product_id, 10) 
                    : Number(item.product_id);
                
                // Asegurar que quantity sea un número
                const quantity = typeof item.quantity === 'string' 
                    ? parseInt(item.quantity, 10) 
                    : Number(item.quantity);
                
                // Mapear toppings asegurando que topping_id sea un número
                const toppings = (item.toppings || []).map(t => {
                    const toppingId = typeof t.topping_id === 'string' 
                        ? parseInt(t.topping_id, 10) 
                        : Number(t.topping_id);
                    
                    return {
                        topping_id: toppingId
                    };
                });
                
                return {
                    product_id: productId,
                    quantity: quantity,
                    toppings: toppings
                };
            })
        };
        
        console.log('Enviando pedido:', JSON.stringify(orderData, null, 2));
        console.log('Tipos de datos:', orderData.items.map(item => ({
            product_id: typeof item.product_id,
            quantity: typeof item.quantity,
            toppings: item.toppings.map(t => ({ topping_id: typeof t.topping_id }))
        })));
        
        const response = await api.post(API_CONFIG.ENDPOINTS.ORDERS.CREATE, orderData);
        console.log('Pedido creado:', response);
        
        showNotification('Pedido creado exitosamente', 'success');
        currentOrder.items = [];
        updateOrderDisplay();
        await loadOrders();
        
        // Notificar que se creó un nuevo pedido para actualizar la cola de cocina
        notifyNewOrderCreated();
        
        // Cambiar a la vista de pedidos
        const ordersPanel = document.getElementById('orders');
        const newOrderPanel = document.getElementById('newOrder');
        const ordersTab = document.querySelector('.nav-tab[onclick*="orders"]');
        const newOrderTab = document.querySelector('.nav-tab[onclick*="newOrder"]');
        
        if (ordersPanel && newOrderPanel) {
            newOrderPanel.classList.remove('active');
            ordersPanel.classList.add('active');
        }
        
        if (ordersTab && newOrderTab) {
            newOrderTab.classList.remove('active');
            ordersTab.classList.add('active');
        }
    } catch (error) {
        console.error('Error al crear pedido:', error);
        showNotification('Error al crear el pedido: ' + (error.message || 'Error desconocido'), 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Pedido';
        }
    }
}

async function loadOrders() {
    try {
        const orders = await api.get(API_CONFIG.ENDPOINTS.ORDERS.LIST);
        displayOrders(orders);
    } catch (error) {
        document.getElementById('ordersList').innerHTML = 
            `<p class="error-message">Error al cargar pedidos: ${error.message}</p>`;
    }
}

function displayOrders(orders) {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay pedidos registrados</p></div>';
        return;
    }
    
    // Ordenar por fecha más reciente primero
    const sortedOrders = [...orders].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
    });
    
    let html = '';
    
    sortedOrders.forEach(order => {
        const isDelivered = order.status === 'Entregado' || order.status === 'ENTREGADO';
        const statusClass = isDelivered ? 'badge-success' : 
                          order.status === 'En proceso' ? 'badge-warning' : 'badge-info';
        
        html += `
            <div class="order-item-card" onclick="toggleOrderDetails(${order.id})" style="cursor: pointer;">
                <div class="order-item-header">
                    <div>
                        <strong>Pedido #${order.id}</strong>
                        <span class="badge ${statusClass}">${order.status}</span>
                    </div>
                    <div>
                        <strong>${formatCurrency(order.total_amount || 0)}</strong>
                    </div>
                </div>
                <div class="order-item-details" id="orderDetails${order.id}" style="display: none;">
                    <p><strong>Fecha:</strong> ${formatDate(order.created_at)}</p>
                    ${order.preparation_time ? `<p><strong>Tiempo de preparación:</strong> ${formatPreparationTime(order.preparation_time)}</p>` : ''}
                    <p><strong>Items (${order.items?.length || 0}):</strong></p>
                    <ul>
        `;
        
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const productName = item.product?.name || 'Producto';
                const toppings = item.toppings?.map(t => t.topping?.name).filter(Boolean).join(', ') || '';
                html += `<li>
                    <strong>${item.quantity}x</strong> ${sanitizeString(productName)}`;
                if (toppings) {
                    html += ` <em>(${sanitizeString(toppings)})</em>`;
                }
                html += ` - ${formatCurrency(item.subtotal || 0)}</li>`;
            });
        } else {
            html += '<li>No hay items disponibles</li>';
        }
        
        html += `
                    </ul>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Notifica que se creó un nuevo pedido para actualizar la cola de cocina
 * Usa eventos personalizados y localStorage para funcionar entre pestañas
 */
function notifyNewOrderCreated() {
    const timestamp = Date.now();
    
    // Actualizar localStorage para notificar a otras pestañas
    const notificationKey = 'kitchen_queue_update';
    localStorage.setItem(notificationKey, JSON.stringify({
        timestamp: timestamp,
        action: 'new_order_created'
    }));
    
    // Disparar evento personalizado para la misma ventana
    const event = new CustomEvent('newOrderCreated', {
        detail: { timestamp, action: 'new_order_created' }
    });
    window.dispatchEvent(event);
    
    // Remover el item después de un breve delay para que el evento se dispare
    setTimeout(() => {
        localStorage.removeItem(notificationKey);
    }, 100);
}

function toggleOrderDetails(orderId) {
    const details = document.getElementById(`orderDetails${orderId}`);
    if (details) {
        details.style.display = details.style.display === 'none' ? 'block' : 'none';
    }
}
