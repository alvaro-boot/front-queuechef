// ============================================
// MÓDULO DE UTILIDADES COMUNES
// ============================================

/**
 * Carga el nombre de la tienda y lo muestra en el elemento especificado
 * @param {string} elementId - ID del elemento donde mostrar el nombre
 */
async function loadStoreName(elementId = 'storeName') {
    try {
        const storeId = authManager.getStoreId();
        if (!storeId) {
            console.error('No se pudo obtener el storeId');
            return;
        }
        
        const store = await api.get(`${API_CONFIG.ENDPOINTS.STORES.GET}/${storeId}`);
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `Tienda: ${store.name}`;
        }
        return store;
    } catch (error) {
        console.error('Error al cargar nombre de tienda:', error);
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = 'Tienda: No disponible';
        }
        return null;
    }
}

/**
 * Formatea el tiempo de preparación en minutos a un formato legible (ej: "5 min")
 * @param {number} minutes - Tiempo en minutos
 * @returns {string} - Tiempo formateado (ej: "5 min")
 */
function formatPreparationTime(minutes) {
    if (!minutes || minutes === null || minutes === undefined || isNaN(minutes)) {
        return 'N/A';
    }
    
    const totalMinutes = Math.round(Number(minutes));
    
    if (totalMinutes === 0) {
        return '0 min';
    }
    
    return `${totalMinutes} min`;
}

/**
 * Formatea un número como moneda colombiana (COP)
 * @param {number} amount - Cantidad a formatear
 * @param {string} currency - Código de moneda (default: 'COP')
 * @returns {string} - Cantidad formateada con formato colombiano (ej: $3.000)
 */
function formatCurrency(amount, currency = 'COP') {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '$0';
    }
    
    // Convertir a número
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    
    if (isNaN(numAmount)) {
        return '$0';
    }
    
    // Formatear sin decimales y con puntos para miles
    const formatted = Math.round(numAmount).toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    
    return `$${formatted}`;
}

/**
 * Formatea una fecha a formato legible
 * @param {string|Date} date - Fecha a formatear
 * @param {object} options - Opciones de formato
 * @returns {string} - Fecha formateada
 */
function formatDate(date, options = {}) {
    if (!date) return '';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        return '';
    }
    
    return dateObj.toLocaleDateString('es-ES', defaultOptions);
}

/**
 * Formatea una fecha a formato corto (DD/MM/YYYY)
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
function formatDateShort(date) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        return '';
    }
    
    return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Calcula el tiempo transcurrido desde una fecha
 * @param {string|Date} date - Fecha de referencia
 * @returns {string} - Tiempo transcurrido formateado
 */
function getTimeAgo(date) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        return '';
    }
    
    const now = new Date();
    const diffMs = now - dateObj;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
        return 'Hace menos de un minuto';
    } else if (diffMins < 60) {
        return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
        return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
        return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    } else {
        return formatDateShort(dateObj);
    }
}

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} - true si es válido
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valida un teléfono
 * @param {string} phone - Teléfono a validar
 * @returns {boolean} - true si es válido
 */
function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Sanitiza un string para prevenir XSS
 * @param {string} str - String a sanitizar
 * @returns {string} - String sanitizado
 */
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Debounce function para limitar llamadas a funciones
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} - Función con debounce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function para limitar llamadas a funciones
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Tiempo límite en ms
 * @returns {Function} - Función con throttle
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} - true si se copió exitosamente
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copiado al portapapeles', 'success');
        return true;
    } catch (err) {
        console.error('Error al copiar:', err);
        showNotification('Error al copiar', 'error');
        return false;
    }
}

/**
 * Descarga un archivo
 * @param {string} content - Contenido del archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} mimeType - Tipo MIME
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Obtiene parámetros de la URL
 * @param {string} name - Nombre del parámetro
 * @returns {string|null} - Valor del parámetro
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * Establece un parámetro en la URL sin recargar
 * @param {string} name - Nombre del parámetro
 * @param {string} value - Valor del parámetro
 */
function setUrlParameter(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.pushState({}, '', url);
}

/**
 * Muestra un spinner de carga
 * @param {HTMLElement|string} element - Elemento o ID donde mostrar el spinner
 */
function showLoading(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (!el) return;
    
    el.innerHTML = '<div class="loading"></div>';
    el.style.textAlign = 'center';
    el.style.padding = '40px';
}

/**
 * Oculta el spinner de carga
 * @param {HTMLElement|string} element - Elemento o ID donde ocultar el spinner
 */
function hideLoading(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (!el) return;
    
    el.innerHTML = '';
    el.style.textAlign = '';
    el.style.padding = '';
}

/**
 * Verifica si un elemento está visible en el viewport
 * @param {HTMLElement} element - Elemento a verificar
 * @returns {boolean} - true si está visible
 */
function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Scroll suave a un elemento
 * @param {HTMLElement|string} element - Elemento o ID al que hacer scroll
 * @param {number} offset - Offset adicional en píxeles
 */
function scrollToElement(element, offset = 0) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (!el) return;
    
    const elementPosition = el.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    
    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

/**
 * Maneja errores de forma consistente
 * @param {Error|string} error - Error a manejar
 * @param {string} context - Contexto del error
 */
function handleError(error, context = '') {
    const message = error instanceof Error ? error.message : error;
    const fullMessage = context ? `${context}: ${message}` : message;
    
    console.error(fullMessage, error);
    showNotification(fullMessage, 'error');
}

/**
 * Confirma una acción con el usuario
 * @param {string} message - Mensaje de confirmación
 * @param {string} title - Título del diálogo
 * @returns {Promise<boolean>} - true si el usuario confirma
 */
function confirmAction(message, title = 'Confirmar') {
    return new Promise((resolve) => {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        resolve(confirmed);
    });
}

/**
 * Obtiene el valor de un input y lo valida
 * @param {string} inputId - ID del input
 * @param {Function} validator - Función de validación opcional
 * @returns {any} - Valor del input o null si es inválido
 */
function getInputValue(inputId, validator = null) {
    const input = document.getElementById(inputId);
    if (!input) return null;
    
    const value = input.value.trim();
    
    if (validator && !validator(value)) {
        input.focus();
        return null;
    }
    
    return value;
}

/**
 * Establece el valor de un input
 * @param {string} inputId - ID del input
 * @param {any} value - Valor a establecer
 */
function setInputValue(inputId, value) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = value || '';
    }
}

/**
 * Limpia un formulario
 * @param {string|HTMLFormElement} formId - ID del formulario o elemento form
 */
function clearForm(formId) {
    const form = typeof formId === 'string' ? document.getElementById(formId) : formId;
    if (form && form.reset) {
        form.reset();
    }
}

/**
 * Inicializa tooltips (si se implementan)
 * @param {HTMLElement} element - Elemento donde inicializar tooltips
 */
function initTooltips(element = document) {
    // Implementación básica de tooltips
    const tooltipElements = element.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(el => {
        el.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('data-tooltip');
            tooltip.style.cssText = `
                position: absolute;
                background: var(--dark-color);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
            tooltip.style.left = (rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)) + 'px';
            
            this._tooltip = tooltip;
        });
        
        el.addEventListener('mouseleave', function() {
            if (this._tooltip) {
                this._tooltip.remove();
                this._tooltip = null;
            }
        });
    });
}

// Exportar funciones globalmente
window.utils = {
    loadStoreName,
    formatCurrency,
    formatDate,
    formatDateShort,
    getTimeAgo,
    isValidEmail,
    isValidPhone,
    sanitizeString,
    debounce,
    throttle,
    copyToClipboard,
    downloadFile,
    getUrlParameter,
    setUrlParameter,
    showLoading,
    hideLoading,
    isElementInViewport,
    scrollToElement,
    handleError,
    confirmAction,
    getInputValue,
    setInputValue,
    clearForm,
    initTooltips
};
