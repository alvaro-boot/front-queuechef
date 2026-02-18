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
    
    // Actualizar cada 10 segundos para detectar cambios rápidamente
    // Además de las actualizaciones inmediatas por eventos
    queueUpdateInterval = setInterval(() => {
        if (authManager.isAuthenticated() && authManager.hasRole(ROLES.COCINA)) {
            loadKitchenQueue();
        } else {
            clearIntervals();
        }
    }, 10000); // 10 segundos para detectar cambios más rápido
    
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
    
    // Escuchar eventos de nuevos pedidos creados
    setupOrderNotifications();
}

/**
 * Configura los listeners para detectar cuando se crea un nuevo pedido
 * Funciona tanto en la misma pestaña como entre diferentes pestañas
 */
function setupOrderNotifications() {
    console.log('Configurando listeners de notificaciones de pedidos...');
    
    // Escuchar eventos personalizados (misma pestaña)
    window.addEventListener('newOrderCreated', (event) => {
        console.log('🆕 Nuevo pedido detectado (misma pestaña):', event.detail);
        loadKitchenQueue();
        showNotification('🆕 Nuevo pedido recibido', 'info', 3000);
    });
    
    // Escuchar cambios en localStorage (otras pestañas)
    window.addEventListener('storage', (event) => {
        if (event.key === 'kitchen_queue_update' && event.newValue) {
            try {
                const data = JSON.parse(event.newValue);
                if (data.action === 'new_order_created') {
                    console.log('🆕 Nuevo pedido detectado (otra pestaña):', data);
                    loadKitchenQueue();
                    showNotification('🆕 Nuevo pedido recibido', 'info', 3000);
                }
            } catch (error) {
                console.error('Error al procesar notificación de pedido:', error);
            }
        }
    });
    
    // También verificar periódicamente si hay cambios en localStorage
    // Esto es un respaldo en caso de que los eventos no funcionen
    // Usar un intervalo más corto para detectar cambios más rápido
    setInterval(() => {
        const lastNotification = localStorage.getItem('kitchen_queue_update');
        if (lastNotification) {
            try {
                const data = JSON.parse(lastNotification);
                if (data.action === 'new_order_created') {
                    // Verificar si la notificación es reciente (últimos 5 segundos)
                    const notificationAge = Date.now() - data.timestamp;
                    if (notificationAge < 5000) {
                        console.log('🆕 Nuevo pedido detectado (verificación periódica):', data);
                        loadKitchenQueue(true); // Actualizar sin mostrar logs adicionales
                        showNotification('🆕 Nuevo pedido recibido', 'info', 3000);
                        // Limpiar la notificación después de procesarla
                        localStorage.removeItem('kitchen_queue_update');
                    }
                }
            } catch (error) {
                console.error('Error al procesar notificación periódica:', error);
            }
        }
    }, 2000); // Verificar cada 2 segundos
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
    const requestedContent = document.getElementById('requestedContent');
    const inProgressContent = document.getElementById('inProgressContent');
    const completedContent = document.getElementById('completedContent');
    const requestedCount = document.getElementById('requestedCount');
    const inProgressCount = document.getElementById('inProgressCount');
    const completedCount = document.getElementById('completedCount');
    
    if (!requestedContent || !inProgressContent || !completedContent) {
        console.error('Contenedores de columnas no encontrados');
        return;
    }
    
    if (!queue || queue.length === 0) {
        requestedContent.innerHTML = '<p class="info-message">No hay pedidos solicitados</p>';
        inProgressContent.innerHTML = '<p class="info-message">No hay pedidos en preparación</p>';
        completedContent.innerHTML = '<p class="info-message">No hay pedidos completados</p>';
        if (requestedCount) requestedCount.textContent = '0';
        if (inProgressCount) inProgressCount.textContent = '0';
        if (completedCount) completedCount.textContent = '0';
        return;
    }
    
    // Separar pedidos por estado
    // Solicitados: Pendientes (sin start_time)
    const requestedOrders = queue.filter(q => q.kitchen_status === 'Pendiente' || (!q.start_time && !q.end_time));
    
    // En preparación: Con start_time pero sin end_time
    const inProgressOrders = queue.filter(q => q.kitchen_status === 'En preparación' || (q.start_time && !q.end_time));
    
    // Completados: Con end_time (todos los del día)
    const completedOrders = queue.filter(q => q.kitchen_status === 'Listo' || q.end_time)
        .sort((a, b) => new Date(b.end_time || b.order?.created_at) - new Date(a.end_time || a.order?.created_at));
    
    // Mostrar pedidos solicitados
    if (requestedOrders.length > 0) {
        let html = '';
        requestedOrders.forEach(queueItem => {
            html += buildQueueItem(queueItem);
        });
        requestedContent.innerHTML = html;
        if (requestedCount) requestedCount.textContent = requestedOrders.length;
    } else {
        requestedContent.innerHTML = '<p class="info-message">No hay pedidos solicitados</p>';
        if (requestedCount) requestedCount.textContent = '0';
    }
    
    // Mostrar pedidos en preparación
    if (inProgressOrders.length > 0) {
        let html = '';
        inProgressOrders.forEach(queueItem => {
            html += buildQueueItem(queueItem);
        });
        inProgressContent.innerHTML = html;
        if (inProgressCount) inProgressCount.textContent = inProgressOrders.length;
    } else {
        inProgressContent.innerHTML = '<p class="info-message">No hay pedidos en preparación</p>';
        if (inProgressCount) inProgressCount.textContent = '0';
    }
    
    // Mostrar pedidos completados (todos los del día)
    if (completedOrders.length > 0) {
        let html = '';
        completedOrders.forEach(queueItem => {
            html += buildQueueItem(queueItem, true);
        });
        completedContent.innerHTML = html;
        if (completedCount) completedCount.textContent = completedOrders.length;
    } else {
        completedContent.innerHTML = '<p class="info-message">No hay pedidos completados</p>';
        if (completedCount) completedCount.textContent = '0';
    }
}

function buildQueueItem(queueItem, isReady = false) {
    const order = queueItem.order;
    if (!order) return '';
    
    const statusClass = getStatusBadgeClass(queueItem.kitchen_status);
    const timeInProgress = queueItem.start_time ? 
        Math.floor((new Date() - new Date(queueItem.start_time)) / 60000) : null;
    
    // Construir el botón de acción
    let actionButton = '';
    if (queueItem.kitchen_status === 'Pendiente') {
        actionButton = `
            <button class="btn btn-primary" onclick="startPreparation(${queueItem.id})">
                ▶️ Iniciar Preparación
            </button>
        `;
    } else if (queueItem.kitchen_status === 'En preparación') {
        actionButton = `
            <button class="btn btn-success" onclick="completePreparation(${queueItem.id})">
                ✅ Marcar como Listo
            </button>
        `;
    }
    
    let html = `
        <div class="queue-item ${isReady ? 'ready' : ''} ${queueItem.kitchen_status === 'En preparación' ? 'in-progress' : ''}">
            <div class="queue-item-header">
                <div class="queue-item-title-section">
                    <strong>Pedido #${order.daily_order_number || order.id}${order.name ? ` - ${sanitizeString(order.name)}` : ''}</strong>
                    <div class="queue-item-badges">
                        <span class="badge ${statusClass}">${queueItem.kitchen_status}</span>
                        ${timeInProgress !== null ? `<span class="time-badge">${timeInProgress} min</span>` : ''}
                    </div>
                </div>
                <div class="queue-item-right-section">
                    <div class="queue-item-total">
                        <strong>Total: ${formatCurrency(order.total_amount || 0)}</strong>
                    </div>
                    ${actionButton ? `<div class="queue-item-action-button">${actionButton}</div>` : ''}
                </div>
            </div>
            <div class="order-item-details">
                ${order.name ? `<p><strong>Nombre:</strong> ${sanitizeString(order.name)}</p>` : ''}
                ${order.comments ? `<p><strong>📝 Comentarios:</strong> <em style="color: var(--primary-color);">${sanitizeString(order.comments)}</em></p>` : ''}
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

/**
 * Notifica que se inició la preparación de un pedido
 * Esto actualiza la lista de pedidos del mesero automáticamente
 */
function notifyOrderPreparationStarted(orderId) {
    const notificationKey = 'order_preparation_started';
    const timestamp = Date.now();
    
    const notification = {
        timestamp: timestamp,
        action: 'preparation_started',
        orderId: orderId
    };
    
    // Actualizar localStorage para notificar a otras pestañas
    localStorage.setItem(notificationKey, JSON.stringify(notification));
    
    // Disparar evento personalizado para la misma ventana
    const event = new CustomEvent('orderPreparationStarted', {
        detail: notification,
        bubbles: true
    });
    window.dispatchEvent(event);
    
    console.log('Notificación de preparación iniciada enviada:', notification);
}

async function startPreparation(queueId) {
    try {
        console.log('Iniciando preparación para queue:', queueId);
        const response = await api.patch(`${API_CONFIG.ENDPOINTS.KITCHEN.QUEUE}/${queueId}/start`, {});
        console.log('Preparación iniciada:', response);
        showNotification('Preparación iniciada', 'success');
        await loadKitchenQueue();
        
        // Notificar que se inició la preparación de un pedido
        if (response && response.order && response.order.id) {
            notifyOrderPreparationStarted(response.order.id);
        }
    } catch (error) {
        console.error('Error al iniciar preparación:', error);
        showNotification('Error al iniciar preparación: ' + (error.message || 'Error desconocido'), 'error');
    }
}

async function completePreparation(queueId) {
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
