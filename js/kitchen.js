// Módulo de cocina
let queueUpdateInterval = null;
let authCheckInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!authManager.isAuthenticated() || !authManager.hasRole(ROLES.COCINA)) {
        authManager.logout();
        return;
    }

    initializeKitchenDashboard();
});

// Limpiar intervalos cuando la página se oculta o se cierra
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pausar actualizaciones cuando la pestaña está oculta
        clearIntervals();
    } else {
        // Reanudar actualizaciones cuando la pestaña vuelve a estar visible
        if (authManager.isAuthenticated() && authManager.hasRole(ROLES.COCINA)) {
            startAutoUpdate();
        }
    }
});

// Limpiar intervalos antes de cerrar la página
window.addEventListener('beforeunload', () => {
    clearIntervals();
});

function clearIntervals() {
    if (queueUpdateInterval) {
        clearInterval(queueUpdateInterval);
        queueUpdateInterval = null;
    }
    if (authCheckInterval) {
        clearInterval(authCheckInterval);
        authCheckInterval = null;
    }
}

function startAutoUpdate() {
    // Limpiar intervalos existentes si los hay
    clearIntervals();
    
    // Actualizar cada minuto (60000 ms)
    queueUpdateInterval = setInterval(() => {
        if (authManager.isAuthenticated() && authManager.hasRole(ROLES.COCINA)) {
            loadKitchenQueue();
        } else {
            clearIntervals();
        }
    }, 60000); // 60 segundos = 1 minuto
    
    // Verificar autenticación cada minuto
    authCheckInterval = setInterval(() => {
        if (!authManager.isAuthenticated()) {
            clearIntervals();
            authManager.logout();
        }
    }, 60000);
}

function initializeKitchenDashboard() {
    const user = authManager.getUser();
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = `Usuario: ${user.name}`;
    }
    
    // Cargar la cola inicialmente
    loadKitchenQueue();
    
    // Iniciar actualización automática cada minuto
    startAutoUpdate();
}

async function loadKitchenQueue() {
    try {
        const queue = await api.get(API_CONFIG.ENDPOINTS.KITCHEN.QUEUE);
        displayKitchenQueue(queue);
        updateLastUpdateTime();
    } catch (error) {
        const container = document.getElementById('kitchenQueue');
        if (container) {
            container.innerHTML = `<p class="error-message">Error al cargar la cola: ${error.message}</p>`;
        }
        updateLastUpdateTime(true);
    }
}

function updateLastUpdateTime(isError = false) {
    const lastUpdateEl = document.getElementById('lastUpdateTime');
    if (lastUpdateEl) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        if (isError) {
            lastUpdateEl.textContent = `❌ Error: ${timeStr}`;
            lastUpdateEl.style.color = 'var(--error-color)';
        } else {
            lastUpdateEl.textContent = `✅ Actualizado: ${timeStr}`;
            lastUpdateEl.style.color = 'var(--success-color)';
            // Volver al color normal después de 2 segundos
            setTimeout(() => {
                if (lastUpdateEl) {
                    lastUpdateEl.style.color = 'var(--dark-light)';
                }
            }, 2000);
        }
    }
}

function displayKitchenQueue(queue) {
    const container = document.getElementById('kitchenQueue');
    
    if (!container) {
        console.error('Container kitchenQueue no encontrado');
        return;
    }
    
    if (!queue || queue.length === 0) {
        container.innerHTML = '<p class="info-message">No hay pedidos en la cola</p>';
        return;
    }
    
    // Separar pedidos por estado
    const pendingOrders = queue.filter(q => q.kitchen_status === 'Pendiente');
    const inProgressOrders = queue.filter(q => q.kitchen_status === 'En preparación');
    const readyOrders = queue.filter(q => q.kitchen_status === 'Listo');
    
    let html = '';
    
    // Mostrar pedidos en preparación primero
    if (inProgressOrders.length > 0) {
        html += '<h3 class="section-title">🔄 En Preparación</h3>';
        inProgressOrders.forEach(queueItem => {
            html += buildQueueItem(queueItem);
        });
    }
    
    // Luego pedidos pendientes
    if (pendingOrders.length > 0) {
        html += '<h3 class="section-title">⏳ Pendientes</h3>';
        pendingOrders.forEach(queueItem => {
            html += buildQueueItem(queueItem);
        });
    }
    
    // Finalmente pedidos listos (últimos 5)
    if (readyOrders.length > 0) {
        const recentReady = readyOrders
            .sort((a, b) => new Date(b.end_time) - new Date(a.end_time))
            .slice(0, 5);
        
        html += '<h3 class="section-title">✅ Recientemente Completados</h3>';
        recentReady.forEach(queueItem => {
            html += buildQueueItem(queueItem, true);
        });
    }
    
    if (html === '') {
        container.innerHTML = '<p class="info-message">No hay pedidos activos</p>';
        return;
    }
    
    container.innerHTML = html;
}

function buildQueueItem(queueItem, isReady = false) {
    const order = queueItem.order;
    if (!order) return '';
    
    const statusClass = getStatusBadgeClass(queueItem.kitchen_status);
    const timeInProgress = queueItem.start_time ? 
        Math.floor((new Date() - new Date(queueItem.start_time)) / 60000) : null;
    
    let html = `
        <div class="queue-item ${isReady ? 'ready' : ''} ${queueItem.kitchen_status === 'En preparación' ? 'in-progress' : ''}">
            <div class="queue-item-header">
                <div>
                    <strong>Pedido #${order.id}</strong>
                    <span class="badge ${statusClass}">${queueItem.kitchen_status}</span>
                    ${timeInProgress !== null ? `<span class="time-badge">${timeInProgress} min</span>` : ''}
                </div>
                <div>
                    <strong>Total: ${formatCurrency(order.total_amount || 0)}</strong>
                </div>
            </div>
            <div class="order-item-details">
                <p><strong>Hora de pedido:</strong> ${new Date(order.created_at).toLocaleString('es-ES')}</p>
                ${queueItem.start_time ? `<p><strong>Inicio de preparación:</strong> ${new Date(queueItem.start_time).toLocaleString('es-ES')}</p>` : ''}
                ${queueItem.end_time ? `<p><strong>Completado:</strong> ${new Date(queueItem.end_time).toLocaleString('es-ES')}</p>` : ''}
                <p><strong>Items (${order.items?.length || 0}):</strong></p>
                <ul>
    `;
    
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const productName = item.product?.name || 'Producto';
            const toppings = item.toppings?.map(t => t.topping?.name).filter(Boolean).join(', ') || '';
            html += `<li><strong>${item.quantity}x</strong> ${productName}`;
            if (toppings) {
                html += ` <em>(${toppings})</em>`;
            }
            html += `</li>`;
        });
    } else {
        html += '<li>No hay items disponibles</li>';
    }
    
    html += `
                </ul>
            </div>
            <div class="queue-item-actions">
    `;
    
    if (queueItem.kitchen_status === 'Pendiente') {
        html += `
            <button class="btn btn-primary" onclick="startPreparation(${queueItem.id})">
                ▶️ Iniciar Preparación
            </button>
        `;
    } else if (queueItem.kitchen_status === 'En preparación') {
        html += `
            <button class="btn btn-success" onclick="completePreparation(${queueItem.id})">
                ✅ Marcar como Listo
            </button>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

function getStatusBadgeClass(status) {
    switch(status) {
        case 'Pendiente':
            return 'badge-warning';
        case 'En preparación':
            return 'badge-info';
        case 'Listo':
            return 'badge-success';
        default:
            return 'badge-danger';
    }
}

async function startPreparation(queueId) {
    const confirmed = await confirmAction(
        '¿Iniciar la preparación de este pedido?',
        'Confirmar Inicio'
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        console.log('Iniciando preparación para queue:', queueId);
        const response = await api.patch(`${API_CONFIG.ENDPOINTS.KITCHEN.QUEUE}/${queueId}/start`, {});
        console.log('Preparación iniciada:', response);
        showNotification('Preparación iniciada', 'success');
        await loadKitchenQueue();
    } catch (error) {
        console.error('Error al iniciar preparación:', error);
        showNotification('Error al iniciar preparación: ' + (error.message || 'Error desconocido'), 'error');
    }
}

async function completePreparation(queueId) {
    const confirmed = await confirmAction(
        '¿Marcar este pedido como listo?',
        'Confirmar Finalización'
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        console.log('Completando preparación para queue:', queueId);
        const response = await api.patch(`${API_CONFIG.ENDPOINTS.KITCHEN.QUEUE}/${queueId}/complete`, {});
        console.log('Preparación completada:', response);
        showNotification('Pedido marcado como listo', 'success');
        await loadKitchenQueue();
    } catch (error) {
        console.error('Error al completar preparación:', error);
        showNotification('Error al completar preparación: ' + (error.message || 'Error desconocido'), 'error');
    }
}
