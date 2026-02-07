// ============================================
// SISTEMA DE NOTIFICACIONES TOAST
// ============================================

class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.init();
    }
    
    init() {
        // Crear contenedor de notificaciones si no existe
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }
    
    /**
     * Muestra una notificación toast
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duración en ms (0 = permanente)
     */
    show(message, type = 'info', duration = 4000) {
        if (!this.container) {
            this.init();
        }
        
        const notification = document.createElement('div');
        notification.className = `toast ${type}`;
        
        const icon = this.getIcon(type);
        const iconElement = document.createElement('span');
        iconElement.className = 'toast-icon';
        iconElement.textContent = icon;
        
        const messageElement = document.createElement('span');
        messageElement.className = 'toast-message';
        messageElement.textContent = message;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'toast-close';
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', 'Cerrar notificación');
        closeButton.onclick = () => this.remove(notification);
        
        notification.appendChild(iconElement);
        notification.appendChild(messageElement);
        notification.appendChild(closeButton);
        
        this.container.appendChild(notification);
        this.notifications.push(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease';
        }, 10);
        
        // Auto-remover si tiene duración
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }
        
        return notification;
    }
    
    /**
     * Obtiene el ícono según el tipo
     * @param {string} type - Tipo de notificación
     * @returns {string} - Ícono
     */
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
    
    /**
     * Remueve una notificación
     * @param {HTMLElement} notification - Elemento de notificación
     */
    remove(notification) {
        if (!notification || !notification.parentNode) return;
        
        notification.style.animation = 'slideOut 0.3s ease';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }
    
    /**
     * Limpia todas las notificaciones
     */
    clear() {
        this.notifications.forEach(notification => {
            this.remove(notification);
        });
    }
    
    /**
     * Muestra notificación de éxito
     * @param {string} message - Mensaje
     * @param {number} duration - Duración
     */
    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }
    
    /**
     * Muestra notificación de error
     * @param {string} message - Mensaje
     * @param {number} duration - Duración
     */
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }
    
    /**
     * Muestra notificación de advertencia
     * @param {string} message - Mensaje
     * @param {number} duration - Duración
     */
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }
    
    /**
     * Muestra notificación informativa
     * @param {string} message - Mensaje
     * @param {number} duration - Duración
     */
    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }
}

// Instancia global
const notificationManager = new NotificationManager();

/**
 * Función global para mostrar notificaciones (reemplaza alert)
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duración en ms
 */
function showNotification(message, type = 'info', duration = null) {
    const defaultDurations = {
        success: 4000,
        error: 5000,
        warning: 4000,
        info: 4000
    };
    
    const finalDuration = duration !== null ? duration : defaultDurations[type] || 4000;
    return notificationManager.show(message, type, finalDuration);
}

// Exportar globalmente
window.showNotification = showNotification;
window.notificationManager = notificationManager;
