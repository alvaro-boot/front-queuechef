// Manejo de autenticación
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.loadUserFromStorage();
    }

    loadUserFromStorage() {
        const storageKeys = typeof STORAGE_KEYS !== 'undefined' ? STORAGE_KEYS : {
            TOKEN: 'auth_token',
            USER: 'user_data',
            STORE_ID: 'store_id'
        };
        const userData = localStorage.getItem(storageKeys.USER);
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    async login(username, password) {
        try {
            if (typeof api === 'undefined' || typeof API_CONFIG === 'undefined') {
                throw new Error('Error de configuración: API no está disponible');
            }

            const response = await api.post(
                API_CONFIG.ENDPOINTS.AUTH.LOGIN,
                { name: username, credentials: password },
                false
            );

            if (response.access_token) {
                const storageKeys = typeof STORAGE_KEYS !== 'undefined' ? STORAGE_KEYS : {
                    TOKEN: 'auth_token',
                    USER: 'user_data',
                    STORE_ID: 'store_id'
                };
                
                localStorage.setItem(storageKeys.TOKEN, response.access_token);
                localStorage.setItem(storageKeys.USER, JSON.stringify(response.user));
                localStorage.setItem(storageKeys.STORE_ID, response.user.storeId);
                this.currentUser = response.user;
                return { success: true, user: response.user };
            }

            throw new Error('Error en la autenticación');
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, error: error.message || 'Error desconocido' };
        }
    }

    async registerStoreAndAdmin(storeData, adminData) {
        try {
            if (typeof api === 'undefined') {
                throw new Error('Error de configuración: API no está disponible');
            }

            if (typeof API_CONFIG === 'undefined') {
                throw new Error('Error de configuración: API_CONFIG no está disponible');
            }

            // Primero crear la tienda usando el endpoint público
            const storeResponse = await api.post(
                `${API_CONFIG.ENDPOINTS.STORES.LIST}/register`,
                storeData,
                false // Sin autenticación para registro inicial
            );

            // Asegurar que store_id sea un número
            const storeId = parseInt(storeResponse.id || storeResponse.store?.id);
            
            if (!storeId || isNaN(storeId)) {
                throw new Error('Error: No se pudo obtener el ID de la tienda creada');
            }

            // Luego crear el usuario administrador
            // El backend buscará automáticamente el rol "Administrador" si no se proporciona role_id
            const response = await api.post(
                API_CONFIG.ENDPOINTS.AUTH.REGISTER,
                {
                    store_id: storeId,
                    // role_id se buscará automáticamente en el backend (rol "Administrador")
                    name: adminData.name,
                    credentials: adminData.password,
                    status: 'activo'
                },
                false // Sin autenticación para registro inicial
            );

            if (response.access_token) {
                const storageKeys = typeof STORAGE_KEYS !== 'undefined' ? STORAGE_KEYS : {
                    TOKEN: 'auth_token',
                    USER: 'user_data',
                    STORE_ID: 'store_id'
                };
                
                localStorage.setItem(storageKeys.TOKEN, response.access_token);
                localStorage.setItem(storageKeys.USER, JSON.stringify(response.user));
                localStorage.setItem(storageKeys.STORE_ID, response.user.storeId);
                this.currentUser = response.user;
                return { success: true, user: response.user };
            }

            throw new Error('Error en el registro');
        } catch (error) {
            console.error('Error en registerStoreAndAdmin:', error);
            return { success: false, error: error.message || 'Error desconocido' };
        }
    }

    async getProfile() {
        try {
            if (typeof api === 'undefined' || typeof API_CONFIG === 'undefined') {
                return null;
            }

            const response = await api.get(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
            this.currentUser = response;
            
            const storageKeys = typeof STORAGE_KEYS !== 'undefined' ? STORAGE_KEYS : {
                TOKEN: 'auth_token',
                USER: 'user_data',
                STORE_ID: 'store_id'
            };
            localStorage.setItem(storageKeys.USER, JSON.stringify(response));
            return response;
        } catch (error) {
            console.error('Error obteniendo perfil:', error);
            return null;
        }
    }

    isAuthenticated() {
        return !!this.getToken();
    }

    getToken() {
        const storageKeys = typeof STORAGE_KEYS !== 'undefined' ? STORAGE_KEYS : {
            TOKEN: 'auth_token',
            USER: 'user_data',
            STORE_ID: 'store_id'
        };
        return localStorage.getItem(storageKeys.TOKEN);
    }

    getUser() {
        return this.currentUser;
    }

    getUserRole() {
        return this.currentUser?.roleName;
    }

    getStoreId() {
        const storageKeys = typeof STORAGE_KEYS !== 'undefined' ? STORAGE_KEYS : {
            TOKEN: 'auth_token',
            USER: 'user_data',
            STORE_ID: 'store_id'
        };
        return this.currentUser?.storeId || localStorage.getItem(storageKeys.STORE_ID);
    }

    hasRole(role) {
        return this.getUserRole() === role;
    }

    canAccess(requiredRoles) {
        if (!Array.isArray(requiredRoles)) {
            requiredRoles = [requiredRoles];
        }
        return requiredRoles.includes(this.getUserRole());
    }

    async logout() {
        const storageKeys = typeof STORAGE_KEYS !== 'undefined' ? STORAGE_KEYS : {
            TOKEN: 'auth_token',
            USER: 'user_data',
            STORE_ID: 'store_id'
        };
        
        // Intentar cerrar sesión en el servidor
        try {
            const token = localStorage.getItem(storageKeys.TOKEN);
            if (token && typeof api !== 'undefined' && typeof API_CONFIG !== 'undefined') {
                await api.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT || '/auth/logout', {}, true);
            }
        } catch (error) {
            console.warn('Error al cerrar sesión en el servidor:', error);
            // Continuar con el logout local aunque falle el servidor
        }
        
        // Limpiar datos locales
        localStorage.removeItem(storageKeys.TOKEN);
        localStorage.removeItem(storageKeys.USER);
        localStorage.removeItem(storageKeys.STORE_ID);
        this.currentUser = null;
        
        // Redirigir al login (index.html)
        // Determinar la ruta correcta según la ubicación actual
        const currentPath = window.location.pathname;
        let loginPath = 'index.html';
        
        // Si estamos en un subdirectorio (admin, waiter, kitchen), subir un nivel
        if (currentPath.includes('/admin/') || currentPath.includes('/waiter/') || currentPath.includes('/kitchen/')) {
            loginPath = '../index.html';
        } else if (currentPath !== '/index.html' && currentPath.endsWith('.html')) {
            // Si estamos en otro HTML en la raíz, usar ruta relativa
            loginPath = './index.html';
        }
        
        window.location.href = loginPath;
    }
}

// Instancia global del gestor de autenticación
const authManager = new AuthManager();
