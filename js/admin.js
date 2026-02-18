// Módulo de administrador
let currentStore = null;
let allProducts = [];
let filteredProducts = [];
let allToppings = [];
let filteredToppings = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!authManager.isAuthenticated() || !authManager.hasRole(ROLES.ADMINISTRADOR)) {
        authManager.logout();
        return;
    }

    initializeAdminDashboard();
});

// Variable para prevenir doble envío
let isSubmittingProduct = false;

function initializeAdminDashboard() {
    // Cargar información del usuario
    const user = authManager.getUser();
    document.getElementById('userName').textContent = `Usuario: ${user.name}`;
    
    // Cargar información de la tienda
    loadStoreInfo();
    
    // Cargar datos iniciales
    loadProducts();
    loadToppings();
    loadUsers();
    loadOrders();
    
    // Configurar listener único para el formulario de productos
    const productForm = document.getElementById('productForm');
    if (productForm) {
        // Remover listeners anteriores si existen
        const newForm = productForm.cloneNode(true);
        productForm.parentNode.replaceChild(newForm, productForm);
        
        // Agregar listener único al formulario
        const updatedForm = document.getElementById('productForm');
        updatedForm.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleProductSubmit(e);
            return false;
        }, { once: false });
    }
    
    // Configurar listener para el botón de submit
    // No clonar el botón para mantener el onclick inline del HTML
    const submitBtn = document.getElementById('productSubmitBtn');
    if (submitBtn) {
        // Remover listeners anteriores si existen (pero mantener el onclick inline)
        submitBtn.onclick = null; // Limpiar onclick anterior si existe
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleProductSubmitButton();
            return false;
        }, { once: false });
    }
    
    // Verificar autenticación periódicamente
    setInterval(() => {
        if (!authManager.isAuthenticated()) {
            authManager.logout();
        }
    }, 60000); // Cada minuto
}

function showPanel(panelId) {
    // Ocultar todos los paneles
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Ocultar todas las pestañas
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar panel seleccionado
    document.getElementById(panelId).classList.add('active');
    
    // Activar pestaña correspondiente
    event.target.classList.add('active');
    
    // Cargar datos según el panel
    if (panelId === 'products') {
        loadProducts();
    } else if (panelId === 'toppings') {
        loadToppings();
    } else if (panelId === 'users') {
        loadUsers();
    } else if (panelId === 'orders') {
        loadOrders();
    } else if (panelId === 'reports') {
        loadReports();
    } else if (panelId === 'store') {
        loadStoreInfo();
    }
}

// Gestión de Productos
async function loadProducts() {
    const container = document.getElementById('productsList');
    if (!container) return;
    
    showLoading(container);
    
    try {
        allProducts = await api.get(API_CONFIG.ENDPOINTS.PRODUCTS.LIST) || [];
        filteredProducts = [...allProducts];
        filterProducts();
    } catch (error) {
        console.error('Error al cargar productos:', error);
        const errorMessage = error.message || 'Error desconocido';
        container.innerHTML = 
            `<div class="error-message active">Error al cargar productos: ${errorMessage}</div>`;
        showNotification('Error al cargar productos', 'error');
    }
}

function filterProducts() {
    const searchInput = document.getElementById('productSearch');
    const filterSelect = document.getElementById('productFilter');
    
    if (!searchInput || !filterSelect) {
        displayProducts(allProducts);
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filterValue = filterSelect.value;
    
    filteredProducts = allProducts.filter(product => {
        // Filtro de búsqueda
        const matchesSearch = !searchTerm || 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm));
        
        // Filtro de disponibilidad
        let matchesFilter = true;
        if (filterValue === 'available') {
            matchesFilter = product.availability === true;
        } else if (filterValue === 'unavailable') {
            matchesFilter = product.availability === false;
        }
        
        return matchesSearch && matchesFilter;
    });
    
    displayProducts(filteredProducts);
}

function displayProducts(products) {
    const container = document.getElementById('productsList');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay productos que coincidan con los filtros</p>
                <p class="help-text">Intenta ajustar tu búsqueda o crear un nuevo producto</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Precio</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    products.forEach(product => {
        html += `
            <tr>
                <td><strong>${sanitizeString(product.name)}</strong></td>
                <td>${product.description ? sanitizeString(product.description) : '<span class="help-text">Sin descripción</span>'}</td>
                <td><strong>${formatCurrency(product.base_price)}</strong></td>
                <td>
                    <span class="badge ${product.availability ? 'badge-success' : 'badge-danger'}">
                        ${product.availability ? 'Disponible' : 'No disponible'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="editProduct(${product.id})" title="Editar producto">
                            ✏️ Editar
                        </button>
                        <button class="btn ${product.availability ? 'btn-warning' : 'btn-success'} btn-sm" 
                                onclick="toggleProductAvailability(${product.id}, ${!product.availability})"
                                title="${product.availability ? 'Desactivar' : 'Activar'} producto">
                            ${product.availability ? '⏸️ Desactivar' : '▶️ Activar'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function showProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');
    
    // Resetear la bandera de envío
    isSubmittingProduct = false;
    
    if (productId) {
        title.textContent = 'Editar Producto';
        // Cargar datos del producto
        loadProductData(productId);
    } else {
        title.textContent = 'Nuevo Producto';
        if (form) {
            form.reset();
            const productIdInput = document.getElementById('productId');
            const productAvailabilityInput = document.getElementById('productAvailability');
            if (productIdInput) productIdInput.value = '';
            if (productAvailabilityInput) productAvailabilityInput.checked = true;
        }
    }
    
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('active');
    }
}

async function loadProductData(productId) {
    try {
        const product = await api.get(`${API_CONFIG.ENDPOINTS.PRODUCTS.GET}/${productId}`);
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.base_price;
        document.getElementById('productAvailability').checked = product.availability;
    } catch (error) {
        showNotification('Error al cargar el producto: ' + error.message, 'error');
    }
}

// Función para ser llamada desde el botón directamente
async function handleProductSubmitButton() {
    if (isSubmittingProduct) {
        console.log('Ya se está procesando un envío, ignorando...');
        return false;
    }
    
    const form = document.getElementById('productForm');
    if (form) {
        const fakeEvent = {
            target: form,
            preventDefault: () => {},
            stopPropagation: () => {}
        };
        await handleProductSubmit(fakeEvent);
    }
    return false;
}

async function handleProductSubmit(e) {
    // Prevenir doble envío
    if (isSubmittingProduct) {
        console.log('Ya se está procesando un envío, ignorando...');
        return false;
    }
    
    console.log('handleProductSubmit llamado', e);
    
    // Marcar como en proceso
    isSubmittingProduct = true;
    
    // Prevenir el comportamiento por defecto del formulario
    if (e && e.preventDefault) {
        e.preventDefault();
    }
    if (e && e.stopPropagation) {
        e.stopPropagation();
    }
    
    // Deshabilitar el botón de submit para evitar doble envío
    const form = e?.target || document.getElementById('productForm');
    const submitButton = form?.querySelector('button[type="submit"]') || 
                         document.querySelector('#productForm button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
    }
    
    try {
        const productId = document.getElementById('productId').value;
        const priceValue = document.getElementById('productPrice').value;
        
        if (!priceValue || isNaN(parseFloat(priceValue)) || parseFloat(priceValue) < 0) {
            showNotification('Por favor ingresa un precio válido', 'warning');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar';
            }
            return false;
        }
        
        const productData = {
            name: document.getElementById('productName').value.trim(),
            description: document.getElementById('productDescription').value.trim() || null,
            base_price: parseFloat(priceValue),
            availability: document.getElementById('productAvailability').checked
        };
        
            if (!productData.name || productData.name.trim().length === 0) {
                showNotification('El nombre del producto es requerido', 'warning');
                isSubmittingProduct = false;
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Guardar';
                }
                return false;
            }
        
        console.log('=== INICIANDO CREACIÓN DE PRODUCTO ===');
        console.log('Product Data:', productData);
        console.log('API Config:', API_CONFIG);
        console.log('Endpoint:', API_CONFIG.ENDPOINTS.PRODUCTS.CREATE);
        console.log('Full URL:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.CREATE}`);
        console.log('Token disponible:', !!api.getToken());
        
        let response;
        if (productId) {
            console.log('Actualizando producto existente:', productId);
            response = await api.patch(`${API_CONFIG.ENDPOINTS.PRODUCTS.UPDATE}/${productId}`, productData);
        } else {
            console.log('Creando nuevo producto...');
            response = await api.post(API_CONFIG.ENDPOINTS.PRODUCTS.CREATE, productData);
        }
        
        console.log('Producto guardado exitosamente:', response);
        
        // Cerrar modal y limpiar formulario
        closeModal('productModal');
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('productAvailability').checked = true;
        
        // Recargar la lista de productos
        await loadProducts();
        
        // Mostrar mensaje de éxito
        showNotification('Producto guardado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error completo al guardar producto:', error);
        let errorMessage = 'Error desconocido al guardar el producto';
        
        if (error.message) {
            errorMessage = error.message;
        } else if (error.response) {
            errorMessage = error.response.message || JSON.stringify(error.response);
        }
        
        showNotification('Error al guardar el producto: ' + errorMessage, 'error');
    } finally {
        // Rehabilitar el botón y resetear la bandera
        isSubmittingProduct = false;
        const submitButton = document.querySelector('#productForm button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar';
        }
    }
    
    return false;
}

async function toggleProductAvailability(productId, availability) {
    try {
        await api.patch(`${API_CONFIG.ENDPOINTS.PRODUCTS.UPDATE}/${productId}/availability`, { availability });
        showNotification(
            `Producto ${availability ? 'activado' : 'desactivado'} exitosamente`, 
            'success'
        );
        loadProducts();
    } catch (error) {
        showNotification('Error al actualizar disponibilidad: ' + error.message, 'error');
    }
}

// Gestión de Toppings
async function loadToppings() {
    const container = document.getElementById('toppingsList');
    if (!container) return;
    
    showLoading(container);
    
    try {
        allToppings = await api.get(API_CONFIG.ENDPOINTS.TOPPINGS.LIST) || [];
        filteredToppings = [...allToppings];
        filterToppings();
    } catch (error) {
        console.error('Error al cargar toppings:', error);
        const errorMessage = error.message || 'Error desconocido';
        container.innerHTML = 
            `<div class="error-message active">Error al cargar toppings: ${errorMessage}</div>`;
        showNotification('Error al cargar toppings', 'error');
    }
}

function filterToppings() {
    const searchInput = document.getElementById('toppingSearch');
    const filterSelect = document.getElementById('toppingFilter');
    
    if (!searchInput || !filterSelect) {
        displayToppings(allToppings);
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filterValue = filterSelect.value;
    
    filteredToppings = allToppings.filter(topping => {
        // Filtro de búsqueda
        const matchesSearch = !searchTerm || 
            topping.name.toLowerCase().includes(searchTerm);
        
        // Filtro de estado
        let matchesFilter = true;
        if (filterValue === 'active') {
            matchesFilter = topping.status === 'activo' || topping.status === 'ACTIVO';
        } else if (filterValue === 'inactive') {
            matchesFilter = topping.status === 'inactivo' || topping.status === 'INACTIVO';
        }
        
        return matchesSearch && matchesFilter;
    });
    
    displayToppings(filteredToppings);
}

function displayToppings(toppings) {
    const container = document.getElementById('toppingsList');
    if (!container) return;
    
    if (toppings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay toppings que coincidan con los filtros</p>
                <p class="help-text">Intenta ajustar tu búsqueda o crear un nuevo topping</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Precio Adicional</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    toppings.forEach(topping => {
        const isActive = topping.status === 'activo' || topping.status === 'ACTIVO';
        html += `
            <tr>
                <td><strong>${sanitizeString(topping.name)}</strong></td>
                <td><strong>${formatCurrency(topping.additional_price)}</strong></td>
                <td>
                    <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">
                        ${isActive ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="editTopping(${topping.id})" title="Editar topping">
                            ✏️ Editar
                        </button>
                        <button class="btn ${isActive ? 'btn-warning' : 'btn-success'} btn-sm" 
                                onclick="toggleToppingStatus(${topping.id})"
                                title="${isActive ? 'Desactivar' : 'Activar'} topping">
                            ${isActive ? '⏸️ Desactivar' : '▶️ Activar'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Gestión de Usuarios
let allUsers = [];
let availableRoles = [];

async function loadRoles() {
    try {
        availableRoles = await api.get(API_CONFIG.ENDPOINTS.ROLES.LIST) || [];
    } catch (error) {
        console.error('Error al cargar roles:', error);
        // Roles por defecto si falla la carga
        availableRoles = [
            { id: 2, name: 'Mesero' },
            { id: 3, name: 'Cocina' }
        ];
    }
}

async function loadUsers() {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    showLoading(container);
    
    try {
        allUsers = await api.get(API_CONFIG.ENDPOINTS.USERS.LIST) || [];
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        const errorMessage = error.message || 'Error desconocido';
        container.innerHTML = 
            `<div class="error-message active">Error al cargar usuarios: ${errorMessage}</div>`;
        showNotification('Error al cargar usuarios', 'error');
    }
}

function displayUsers(users) {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay usuarios registrados</p>
                <p class="help-text">Crea un nuevo usuario para comenzar</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        const isActive = user.status === 'activo' || user.status === 'ACTIVO';
        html += `
            <tr>
                <td><strong>${sanitizeString(user.name)}</strong></td>
                <td>${user.role?.name || 'N/A'}</td>
                <td>
                    <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">
                        ${isActive ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="editUser(${user.id})" title="Editar usuario">
                            ✏️ Editar
                        </button>
                        <button class="btn ${isActive ? 'btn-warning' : 'btn-success'} btn-sm" 
                                onclick="toggleUserStatus(${user.id})"
                                title="${isActive ? 'Desactivar' : 'Activar'} usuario">
                            ${isActive ? '⏸️ Desactivar' : '▶️ Activar'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Gestión de Pedidos
let allOrders = [];
let filteredOrders = [];
let currentDateFilter = 'today'; // Filtro de fecha actual
let customStartDate = null;
let customEndDate = null;

async function loadOrders() {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    showLoading(container);
    
    try {
        // Construir URL con parámetros de fecha si es necesario
        let url = API_CONFIG.ENDPOINTS.ORDERS.LIST;
        const dateParams = getDateFilterParams();
        const dateFilter = document.getElementById('orderDateFilter')?.value || 'today';
        
        const params = new URLSearchParams();
        
        if (dateFilter === 'all') {
            // Para "Todos", usar el parámetro allDates
            params.append('allDates', 'true');
        } else if (dateParams.startDate || dateParams.endDate) {
            // Si hay fechas específicas, enviarlas
            if (dateParams.startDate) {
                params.append('startDate', dateParams.startDate.toISOString());
            }
            if (dateParams.endDate) {
                params.append('endDate', dateParams.endDate.toISOString());
            }
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        allOrders = await api.get(url) || [];
        filteredOrders = [...allOrders];
        filterOrders();
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        const errorMessage = error.message || 'Error desconocido';
        container.innerHTML = 
            `<div class="error-message active">Error al cargar pedidos: ${errorMessage}</div>`;
        showNotification('Error al cargar pedidos', 'error');
    }
}

/**
 * Obtiene los parámetros de fecha según el filtro seleccionado
 */
function getDateFilterParams() {
    const dateFilter = document.getElementById('orderDateFilter')?.value || 'today';
    const now = new Date();
    let startDate = null;
    let endDate = null;
    
    switch (dateFilter) {
        case 'today':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'yesterday':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
            startDate = new Date(now);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            const startDateInput = document.getElementById('orderStartDate');
            const endDateInput = document.getElementById('orderEndDate');
            if (startDateInput && startDateInput.value) {
                startDate = new Date(startDateInput.value);
                startDate.setHours(0, 0, 0, 0);
            }
            if (endDateInput && endDateInput.value) {
                endDate = new Date(endDateInput.value);
                endDate.setHours(23, 59, 59, 999);
            }
            break;
        case 'all':
        default:
            // Para "Todos", no enviar fechas y usar el parámetro allDates
            startDate = null;
            endDate = null;
            break;
    }
    
    return { startDate, endDate };
}

/**
 * Aplica el filtro de fecha seleccionado
 */
function applyDateFilter() {
    const dateFilter = document.getElementById('orderDateFilter')?.value || 'today';
    currentDateFilter = dateFilter;
    
    const customDateRange = document.getElementById('customDateRange');
    if (dateFilter === 'custom') {
        if (customDateRange) {
            customDateRange.style.display = 'flex';
            customDateRange.style.alignItems = 'center';
            customDateRange.style.gap = '10px';
            customDateRange.style.flexWrap = 'wrap';
        }
    } else {
        if (customDateRange) {
            customDateRange.style.display = 'none';
        }
        loadOrders();
    }
}

/**
 * Aplica el filtro de rango de fechas personalizado
 */
function applyCustomDateFilter() {
    loadOrders();
}

function filterOrders() {
    const filterSelect = document.getElementById('orderFilter');
    
    if (!filterSelect) {
        displayOrders(allOrders);
        return;
    }
    
    const filterValue = filterSelect.value;
    
    filteredOrders = allOrders.filter(order => {
        if (filterValue === 'all') return true;
        if (filterValue === 'delivered') {
            return order.status === 'Entregado' || order.status === 'ENTREGADO';
        }
        if (filterValue === 'pending') {
            return order.status !== 'Entregado' && order.status !== 'ENTREGADO';
        }
        return true;
    });
    
    displayOrders(filteredOrders);
}

function displayOrders(orders) {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay pedidos registrados</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    orders.forEach(order => {
        const isDelivered = order.status === 'Entregado' || order.status === 'ENTREGADO';
        html += `
            <div class="order-item-card">
                <div class="order-item-header">
                    <div onclick="toggleOrderDetails(${order.id})" style="cursor: pointer; flex: 1;">
                        <strong>Pedido #${order.daily_order_number || order.id}${order.name ? ` - ${sanitizeString(order.name)}` : ''}</strong>
                        <span class="badge ${isDelivered ? 'badge-success' : 'badge-warning'}">${order.status}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <strong>${formatCurrency(order.total_amount)}</strong>
                        ${!isDelivered ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteOrder(${order.id})" title="Eliminar pedido">
                            🗑️
                        </button>` : ''}
                    </div>
                </div>
                <div class="order-item-details" id="orderDetails${order.id}" style="display: none;" onclick="event.stopPropagation();">
                    ${order.name ? `<p><strong>Nombre:</strong> ${sanitizeString(order.name)}</p>` : ''}
                    <p><strong>Fecha:</strong> ${formatDate(order.created_at)}</p>
                    <p><strong>Mesero:</strong> ${order.waiter?.name || 'N/A'}</p>
                    ${order.preparation_time ? `<p><strong>Tiempo de preparación:</strong> ${formatPreparationTime(order.preparation_time)}</p>` : ''}
                    <p><strong>Items (${order.items?.length || 0}):</strong></p>
                    <ul>
        `;
        
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const toppings = item.toppings?.map(t => t.topping?.name).filter(Boolean).join(', ') || '';
                html += `<li>
                    <strong>${item.quantity}x</strong> ${item.product?.name || 'Producto'} 
                    ${toppings ? `<em>(${toppings})</em>` : ''}
                    - ${formatCurrency(item.subtotal)}
                </li>`;
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

function toggleOrderDetails(orderId) {
    const details = document.getElementById(`orderDetails${orderId}`);
    if (details) {
        details.style.display = details.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Elimina (desactiva) un pedido
 */
async function deleteOrder(orderId) {
    try {
        // Primero verificar el estado del pedido
        const order = await api.get(`${API_CONFIG.ENDPOINTS.ORDERS.GET}/${orderId}`);
        
        // Verificar que el pedido no esté entregado
        if (order.status === 'Entregado' || order.status === 'ENTREGADO') {
            showNotification('No se puede eliminar un pedido que ya fue entregado', 'warning');
            return;
        }
        
        await api.delete(`${API_CONFIG.ENDPOINTS.ORDERS.DELETE}/${orderId}`);
        showNotification('Pedido eliminado exitosamente', 'success');
        await loadOrders();
    } catch (error) {
        console.error('Error al eliminar pedido:', error);
        showNotification(`Error al eliminar pedido: ${error.message}`, 'error');
    }
}

// Gestión de Reportes
// Variable global para almacenar los datos de reportes actuales
let currentReportsData = null;

async function loadReports() {
    const container = document.getElementById('reportsData');
    if (!container) return;
    
    showLoading(container);
    
    try {
        const startDate = document.getElementById('reportStartDate');
        const endDate = document.getElementById('reportEndDate');
        
        let reportsData = {};
        
        if (startDate && endDate && startDate.value && endDate.value) {
            const rangeData = await api.get(
                `${API_CONFIG.ENDPOINTS.REPORTS.RANGE}?startDate=${startDate.value}&endDate=${endDate.value}`
            );
            // Convertir array a objeto con totales
            if (Array.isArray(rangeData)) {
                reportsData.range = {
                    totalSales: rangeData.reduce((sum, day) => sum + (parseFloat(day.total_sales) || 0), 0),
                    totalOrders: rangeData.reduce((sum, day) => sum + (day.order_count || 0), 0),
                    startDate: startDate.value,
                    endDate: endDate.value
                };
            } else {
                reportsData.range = rangeData;
            }
        }
        
        reportsData.summary = await api.get(API_CONFIG.ENDPOINTS.REPORTS.SUMMARY);
        // No cargar productos más vendidos - el usuario no lo necesita
        
        // Guardar datos para exportación
        currentReportsData = reportsData;
        
        displayReports(reportsData);
    } catch (error) {
        console.error('Error al cargar reportes:', error);
        const errorMessage = error.message || 'Error desconocido';
        container.innerHTML = 
            `<div class="error-message active">Error al cargar reportes: ${errorMessage}</div>`;
        showNotification('Error al cargar reportes', 'error');
    }
}

function displayReports(data) {
    const container = document.getElementById('reportsData');
    if (!container) return;
    
    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px;">
            <div class="card">
                <h3>📊 Resumen del Día</h3>
                <div style="font-size: 1.5em; color: var(--primary-color); font-weight: bold; margin: 10px 0;">
                    ${formatCurrency(data.summary?.today?.totalSales || 0)}
                </div>
                <p>Pedidos: <strong>${data.summary?.today?.orderCount || 0}</strong></p>
            </div>
            <div class="card">
                <h3>📈 Resumen del Mes</h3>
                <div style="font-size: 1.5em; color: var(--primary-color); font-weight: bold; margin: 10px 0;">
                    ${formatCurrency(data.summary?.thisMonth?.totalSales || 0)}
                </div>
                <p>Pedidos: <strong>${data.summary?.thisMonth?.totalOrders || 0}</strong></p>
            </div>
        </div>
    `;
    
        if (data.range) {
            const rangeTotalSales = Array.isArray(data.range) 
                ? data.range.reduce((sum, day) => sum + (parseFloat(day.total_sales) || 0), 0)
                : (data.range.totalSales || 0);
            const rangeTotalOrders = Array.isArray(data.range)
                ? data.range.reduce((sum, day) => sum + (day.order_count || 0), 0)
                : (data.range.totalOrders || 0);
            
            html += `
            <div class="card">
                <h3>📅 Reporte por Rango de Fechas</h3>
                <p>Fecha Inicio: <strong>${data.range.startDate || ''}</strong></p>
                <p>Fecha Fin: <strong>${data.range.endDate || ''}</strong></p>
                <p>Ventas: <strong>${formatCurrency(rangeTotalSales)}</strong></p>
                <p>Pedidos: <strong>${rangeTotalOrders}</strong></p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Función para exportar a Excel
async function exportToExcel() {
    if (!window.XLSX) {
        showNotification('Error: La librería de Excel no está cargada. Por favor, recarga la página.', 'error');
        return;
    }

    try {
        showNotification('Generando archivo Excel...', 'info');
        
        // Obtener todos los datos necesarios
        const startDate = document.getElementById('reportStartDate');
        const endDate = document.getElementById('reportEndDate');
        
        let reportsData = currentReportsData;
        
        // Si no hay datos cargados o cambió el filtro, cargar de nuevo
        if (!reportsData || (startDate?.value && endDate?.value)) {
            if (startDate?.value && endDate?.value) {
                const rangeData = await api.get(
                    `${API_CONFIG.ENDPOINTS.REPORTS.RANGE}?startDate=${startDate.value}&endDate=${endDate.value}`
                );
                if (Array.isArray(rangeData)) {
                    reportsData = {
                        range: {
                            totalSales: rangeData.reduce((sum, day) => sum + (parseFloat(day.total_sales) || 0), 0),
                            totalOrders: rangeData.reduce((sum, day) => sum + (day.order_count || 0), 0),
                            startDate: startDate.value,
                            endDate: endDate.value
                        }
                    };
                }
            }
            
            if (!reportsData) {
                reportsData = {};
            }
            
            reportsData.summary = await api.get(API_CONFIG.ENDPOINTS.REPORTS.SUMMARY);
            reportsData.products = await api.get(API_CONFIG.ENDPOINTS.REPORTS.PRODUCTS);
        }
        
        // Obtener todos los productos y toppings
        const allProducts = await api.get(API_CONFIG.ENDPOINTS.PRODUCTS.LIST);
        const allToppings = await api.get(API_CONFIG.ENDPOINTS.TOPPINGS.LIST);
        
        // Obtener todos los pedidos para calcular toppings más solicitados
        let allOrders = [];
        try {
            if (startDate?.value && endDate?.value) {
                allOrders = await api.get(
                    `${API_CONFIG.ENDPOINTS.ORDERS.LIST}?startDate=${startDate.value}&endDate=${endDate.value}`
                );
            } else {
                allOrders = await api.get(API_CONFIG.ENDPOINTS.ORDERS.LIST);
            }
        } catch (error) {
            console.warn('Error al cargar pedidos para exportación:', error);
            allOrders = [];
        }
        
        // Calcular toppings más solicitados
        const toppingStats = {};
        allOrders.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    if (item.toppings) {
                        item.toppings.forEach(topping => {
                            const toppingId = topping.topping_id || topping.topping?.id;
                            const toppingName = topping.topping?.name || 'Desconocido';
                            if (!toppingStats[toppingId]) {
                                toppingStats[toppingId] = {
                                    name: toppingName,
                                    count: 0,
                                    revenue: 0
                                };
                            }
                            toppingStats[toppingId].count += item.quantity;
                            toppingStats[toppingId].revenue += parseFloat(topping.topping_price || 0) * item.quantity;
                        });
                    }
                });
            }
        });
        
        const topToppings = Object.values(toppingStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
        
        // Crear el libro de trabajo
        const wb = XLSX.utils.book_new();
        
        // Hoja 1: Resumen General
        const summaryData = [
            ['REPORTE DE VENTAS'],
            [''],
            ['Resumen del Día'],
            ['Ventas Totales', reportsData.summary?.today?.totalSales || 0],
            ['Cantidad de Pedidos', reportsData.summary?.today?.orderCount || 0],
            [''],
            ['Resumen del Mes'],
            ['Ventas Totales', reportsData.summary?.thisMonth?.totalSales || 0],
            ['Cantidad de Pedidos', reportsData.summary?.thisMonth?.totalOrders || 0],
        ];
        
        if (reportsData.range) {
            summaryData.push(['']);
            summaryData.push(['Reporte por Rango de Fechas']);
            summaryData.push(['Fecha Inicio', reportsData.range.startDate || '']);
            summaryData.push(['Fecha Fin', reportsData.range.endDate || '']);
            summaryData.push(['Ventas Totales', reportsData.range.totalSales || 0]);
            summaryData.push(['Cantidad de Pedidos', reportsData.range.totalOrders || 0]);
        }
        
        const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');
        
        // Hoja 2: Productos con Toppings
        const productsData = [
            ['ID', 'Producto', 'Descripción', 'Precio Base', 'Disponible', 'Toppings Adicionales']
        ];
        
        allProducts.forEach(product => {
            // Obtener todos los toppings disponibles (no solo los activos, para mostrar todos)
            const toppingsList = allToppings.length > 0 
                ? allToppings.map(t => {
                    const price = parseFloat(t.additional_price || 0);
                    const priceFormatted = price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                    return `${t.name} (+$${priceFormatted})`;
                }).join(', ')
                : 'Ninguno';
            
            productsData.push([
                product.id,
                product.name || '',
                product.description || '',
                parseFloat(product.base_price || 0),
                product.availability ? 'Sí' : 'No',
                toppingsList
            ]);
        });
        
        const ws2 = XLSX.utils.aoa_to_sheet(productsData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Productos y Toppings');
        
        // Hoja 3: Toppings Más Solicitados
        const topToppingsData = [
            ['Topping', 'Cantidad de Veces Solicitado', 'Ingresos Generados']
        ];
        
        if (topToppings.length > 0) {
            topToppings.forEach(topping => {
                topToppingsData.push([
                    topping.name || 'Sin nombre',
                    topping.count || 0,
                    parseFloat(topping.revenue || 0)
                ]);
            });
        } else {
            topToppingsData.push(['No hay datos disponibles', '', '']);
        }
        
        const ws3 = XLSX.utils.aoa_to_sheet(topToppingsData);
        XLSX.utils.book_append_sheet(wb, ws3, 'Toppings Más Solicitados');
        
        // Hoja 4: Detalle de Pedidos
        const ordersData = [
            ['ID Pedido', 'Fecha', 'Estado', 'Total', 'Tiempo Preparación', 'Items', 'Toppings']
        ];
        
        allOrders.forEach(order => {
            const itemsList = [];
            const toppingsList = [];
            
            if (order.items) {
                order.items.forEach(item => {
                    const productName = item.product?.name || 'Producto';
                    itemsList.push(`${item.quantity}x ${productName}`);
                    
                    if (item.toppings && item.toppings.length > 0) {
                        item.toppings.forEach(topping => {
                            const toppingName = topping.topping?.name || topping.topping?.name || 'Desconocido';
                            toppingsList.push(toppingName);
                        });
                    }
                });
            }
            
            ordersData.push([
                order.id,
                order.created_at ? new Date(order.created_at).toLocaleDateString('es-CO') : '',
                order.status || '',
                order.total_amount || 0,
                order.preparation_time ? formatPreparationTime(order.preparation_time) : 'N/A',
                itemsList.join('; ') || 'Ninguno',
                [...new Set(toppingsList)].join(', ') || 'Ninguno'
            ]);
        });
        
        const ws4 = XLSX.utils.aoa_to_sheet(ordersData);
        XLSX.utils.book_append_sheet(wb, ws4, 'Detalle de Pedidos');
        
        // Generar nombre del archivo con fecha
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const fileName = `Reporte_Ventas_${dateStr}.xlsx`;
        
        // Descargar el archivo
        XLSX.writeFile(wb, fileName);
        
        showNotification('Archivo Excel generado exitosamente', 'success');
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showNotification('Error al exportar a Excel: ' + (error.message || 'Error desconocido'), 'error');
    }
}

// Información de la Tienda
async function loadStoreInfo() {
    const container = document.getElementById('storeInfo');
    if (!container) return;
    
    showLoading(container);
    
    try {
        const storeId = authManager.getStoreId();
        const store = await api.get(`${API_CONFIG.ENDPOINTS.STORES.GET}/${storeId}`);
        currentStore = store;
        
        const storeNameEl = document.getElementById('storeName');
        if (storeNameEl) {
            storeNameEl.textContent = `Tienda: ${store.name}`;
        }
        
        const isActive = store.status === 'activa' || store.status === 'ACTIVA';
        container.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Nombre:</label>
                    <p style="font-size: 1.2em; font-weight: 600; color: var(--dark-color);">${sanitizeString(store.name)}</p>
                </div>
                <div class="form-group">
                    <label>Estado:</label>
                    <p><span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">${isActive ? 'Activa' : 'Inactiva'}</span></p>
                </div>
                <div class="form-group">
                    <label>Dirección:</label>
                    <p>${sanitizeString(store.address)}</p>
                </div>
                <div class="form-group">
                    <label>Teléfono:</label>
                    <p>${sanitizeString(store.phone)}</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error al cargar información de tienda:', error);
        container.innerHTML = 
            `<div class="error-message active">Error al cargar información: ${error.message}</div>`;
        showNotification('Error al cargar información de la tienda', 'error');
    }
}

async function loadStoreData() {
    try {
        if (!currentStore) {
            const storeId = authManager.getStoreId();
            currentStore = await api.get(`${API_CONFIG.ENDPOINTS.STORES.GET}/${storeId}`);
        }
        
        const nameInput = document.getElementById('storeNameInput');
        const addressInput = document.getElementById('storeAddressInput');
        const phoneInput = document.getElementById('storePhoneInput');
        const statusInput = document.getElementById('storeStatusInput');
        
        if (nameInput) nameInput.value = currentStore.name || '';
        if (addressInput) addressInput.value = currentStore.address || '';
        if (phoneInput) phoneInput.value = currentStore.phone || '';
        if (statusInput) statusInput.value = currentStore.status || 'activa';
    } catch (error) {
        showNotification('Error al cargar datos de la tienda: ' + error.message, 'error');
    }
}

async function handleStoreSubmit() {
    try {
        if (!currentStore) {
            showNotification('No se pudo obtener la información de la tienda', 'error');
            return;
        }
        
        const name = document.getElementById('storeNameInput').value.trim();
        const address = document.getElementById('storeAddressInput').value.trim();
        const phone = document.getElementById('storePhoneInput').value.trim();
        const status = document.getElementById('storeStatusInput').value;
        
        // Validaciones
        if (!name || name.length === 0) {
            showNotification('El nombre de la tienda es requerido', 'warning');
            return;
        }
        
        if (!address || address.length === 0) {
            showNotification('La dirección es requerida', 'warning');
            return;
        }
        
        if (!phone || phone.length === 0) {
            showNotification('El teléfono es requerido', 'warning');
            return;
        }
        
        const storeData = {
            name,
            address,
            phone,
            status
        };
        
        await api.patch(`${API_CONFIG.ENDPOINTS.STORES.UPDATE}/${currentStore.id}`, storeData);
        closeModal('storeModal');
        loadStoreInfo();
        showNotification('Información de la tienda actualizada exitosamente', 'success');
    } catch (error) {
        showNotification('Error al actualizar la tienda: ' + error.message, 'error');
    }
}

function showStoreEditModal() {
    const modal = document.getElementById('storeModal');
    if (!modal) return;
    
    loadStoreData();
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

// Cerrar modal al hacer clic fuera
if (typeof window !== 'undefined' && !window._modalClickHandlerAdded) {
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        });
    };
    window._modalClickHandlerAdded = true;
}

// Funciones placeholder para edición
function editProduct(id) {
    showProductModal(id);
}

function showToppingModal(toppingId = null) {
    const modal = document.getElementById('toppingModal');
    const form = document.getElementById('toppingForm');
    const title = document.getElementById('toppingModalTitle');
    
    if (toppingId) {
        title.textContent = 'Editar Topping';
        loadToppingData(toppingId);
    } else {
        title.textContent = 'Nuevo Topping';
        form.reset();
        document.getElementById('toppingId').value = '';
        document.getElementById('toppingStatus').value = 'activo';
    }
    
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('active');
    }
}

async function loadToppingData(toppingId) {
    try {
        const topping = await api.get(`${API_CONFIG.ENDPOINTS.TOPPINGS.GET}/${toppingId}`);
        document.getElementById('toppingId').value = topping.id;
        document.getElementById('toppingName').value = topping.name;
        document.getElementById('toppingPrice').value = topping.additional_price;
        document.getElementById('toppingStatus').value = topping.status;
    } catch (error) {
        showNotification('Error al cargar el topping: ' + error.message, 'error');
    }
}

function editTopping(id) {
    showToppingModal(id);
}

async function handleToppingSubmit() {
    const toppingId = document.getElementById('toppingId').value;
    const name = document.getElementById('toppingName').value.trim();
    const priceValue = document.getElementById('toppingPrice').value;
    const status = document.getElementById('toppingStatus').value;
    
    // Validaciones
    if (!name || name.length === 0) {
        showNotification('El nombre del topping es requerido', 'warning');
        return;
    }
    
    if (!priceValue || isNaN(parseFloat(priceValue)) || parseFloat(priceValue) < 0) {
        showNotification('Por favor ingresa un precio válido', 'warning');
        return;
    }
    
    const toppingData = {
        name,
        additional_price: parseFloat(priceValue),
        status
    };
    
    try {
        if (toppingId) {
            await api.patch(`${API_CONFIG.ENDPOINTS.TOPPINGS.UPDATE}/${toppingId}`, toppingData);
        } else {
            await api.post(API_CONFIG.ENDPOINTS.TOPPINGS.CREATE, toppingData);
        }
        closeModal('toppingModal');
        loadToppings();
        showNotification('Topping guardado exitosamente', 'success');
    } catch (error) {
        showNotification('Error al guardar el topping: ' + (error.message || 'Error desconocido'), 'error');
    }
}

async function toggleToppingStatus(toppingId) {
    try {
        const topping = await api.get(`${API_CONFIG.ENDPOINTS.TOPPINGS.GET}/${toppingId}`);
        const isActive = topping.status === 'activo' || topping.status === 'ACTIVO';
        const newStatus = isActive ? 'inactivo' : 'activo';
        await api.patch(`${API_CONFIG.ENDPOINTS.TOPPINGS.UPDATE}/${toppingId}/status`, { status: newStatus });
        showNotification(
            `Topping ${newStatus === 'activo' ? 'activado' : 'desactivado'} exitosamente`, 
            'success'
        );
        loadToppings();
    } catch (error) {
        showNotification('Error al cambiar estado del topping: ' + error.message, 'error');
    }
}

function showUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');
    
    if (userId) {
        title.textContent = 'Editar Usuario';
        loadUserData(userId);
    } else {
        title.textContent = 'Nuevo Usuario';
        form.reset();
        document.getElementById('userId').value = '';
        document.getElementById('userPassword').value = '';
        document.getElementById('userStatus').value = 'activo';
        loadRolesForUserForm();
    }
    
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('active');
    }
}

async function loadUserData(userId) {
    try {
        const user = await api.get(`${API_CONFIG.ENDPOINTS.USERS.GET}/${userId}`);
        document.getElementById('userId').value = user.id;
        document.getElementById('userNameInput').value = user.name;
        document.getElementById('userStatus').value = user.status;
        await loadRolesForUserForm(user.role_id);
    } catch (error) {
        showNotification('Error al cargar el usuario: ' + error.message, 'error');
    }
}

async function loadRolesForUserForm(selectedRoleId = null) {
    try {
        if (availableRoles.length === 0) {
            await loadRoles();
        }
        
        const roleSelect = document.getElementById('userRole');
        if (!roleSelect) return;
        
        roleSelect.innerHTML = '<option value="">Seleccionar...</option>';
        
        // Filtrar solo roles que no sean Administrador para evitar crear múltiples admins
        const nonAdminRoles = availableRoles.filter(role => 
            role.name !== 'Administrador' && role.name !== 'ADMINISTRADOR'
        );
        
        nonAdminRoles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.name;
            if (selectedRoleId && role.id === selectedRoleId) {
                option.selected = true;
            }
            roleSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar roles:', error);
        showNotification('Error al cargar roles para el formulario', 'error');
    }
}

function editUser(id) {
    showUserModal(id);
}

async function toggleUserStatus(userId) {
    try {
        const user = await api.get(`${API_CONFIG.ENDPOINTS.USERS.GET}/${userId}`);
        const isActive = user.status === 'activo' || user.status === 'ACTIVO';
        const newStatus = isActive ? 'inactivo' : 'activo';
        await api.patch(`${API_CONFIG.ENDPOINTS.USERS.UPDATE}/${userId}/status`, { status: newStatus });
        showNotification(
            `Usuario ${newStatus === 'activo' ? 'activado' : 'desactivado'} exitosamente`, 
            'success'
        );
        loadUsers();
    } catch (error) {
        showNotification('Error al cambiar estado del usuario: ' + error.message, 'error');
    }
}

async function handleUserSubmit() {
    const userId = document.getElementById('userId').value;
    const userName = document.getElementById('userNameInput').value.trim();
    const userRole = document.getElementById('userRole').value;
    const userStatus = document.getElementById('userStatus').value;
    const password = document.getElementById('userPassword').value;

    // Validaciones
    if (!userName || userName.length === 0) {
        showNotification('El nombre de usuario es requerido', 'warning');
        return;
    }

    if (!userId && !password) {
        showNotification('La contraseña es requerida para nuevos usuarios', 'warning');
        return;
    }

    if (!userRole) {
        showNotification('Debes seleccionar un rol', 'warning');
        return;
    }

    const userData = {
        name: userName,
        role_id: parseInt(userRole),
        status: userStatus
    };

    // Solo agregar contraseña si se proporciona (para nuevos usuarios o actualización)
    if (password && password.length > 0) {
        userData.credentials = password;
    }

    try {
        if (userId) {
            // Actualizar usuario existente
            await api.patch(`${API_CONFIG.ENDPOINTS.USERS.UPDATE}/${userId}`, userData);
        } else {
            // Crear nuevo usuario - NO enviar store_id, se obtiene del token
            await api.post(API_CONFIG.ENDPOINTS.USERS.CREATE, userData);
        }
        closeModal('userModal');
        loadUsers();
        showNotification('Usuario guardado exitosamente', 'success');
    } catch (error) {
        console.error('Error al guardar usuario:', error);
        showNotification('Error al guardar usuario: ' + (error.message || 'Error desconocido'), 'error');
    }
}
