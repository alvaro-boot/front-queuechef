// Utilidades para llamadas a la API
class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL || (typeof API_CONFIG !== 'undefined' ? API_CONFIG.BASE_URL : 'http://localhost:3000');
    }

    getToken() {
        if (typeof STORAGE_KEYS === 'undefined') {
            return localStorage.getItem('auth_token');
        }
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(options.includeAuth !== false),
                ...options.headers
            }
        };

        console.log('API Request:', {
            url: url,
            method: options.method || 'GET',
            headers: config.headers,
            body: options.body
        });

        try {
            const response = await fetch(url, config);
            console.log('API Response:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });
            
            if (response.status === 401) {
                // Token expirado o inválido
                this.handleUnauthorized();
                throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
            }

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(text || `Error: ${response.status}`);
            }

            if (!response.ok) {
                const errorMessage = data.message || data.error || `Error: ${response.status}`;
                throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
            }

            return data;
        } catch (error) {
            console.error('API Error completo:', error);
            console.error('API Error name:', error.name);
            console.error('API Error message:', error.message);
            console.error('API Error stack:', error.stack);
            
            if (error.message) {
                throw error;
            }
            throw new Error('Error de conexión con el servidor: ' + (error.message || 'Error desconocido'));
        }
    }

    handleUnauthorized() {
        if (typeof STORAGE_KEYS !== 'undefined') {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
            localStorage.removeItem(STORAGE_KEYS.STORE_ID);
        } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('store_id');
        }
        window.location.href = '/';
    }

    // Métodos HTTP
    async get(endpoint, includeAuth = true) {
        return this.request(endpoint, {
            method: 'GET',
            includeAuth
        });
    }

    async post(endpoint, data, includeAuth = true) {
        console.log('API.post - endpoint:', endpoint);
        console.log('API.post - data:', data);
        console.log('API.post - includeAuth:', includeAuth);
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            includeAuth
        });
    }

    async patch(endpoint, data, includeAuth = true) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
            includeAuth
        });
    }

    async delete(endpoint, includeAuth = true) {
        return this.request(endpoint, {
            method: 'DELETE',
            includeAuth
        });
    }
}

// Instancia global del cliente API
const api = new ApiClient(
    typeof API_CONFIG !== 'undefined' ? API_CONFIG.BASE_URL : 'http://localhost:3000'
);
