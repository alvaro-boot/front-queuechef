// Configuración de la API
const API_CONFIG = {
    BASE_URL: 'https://back-queuechef.onrender.com',
    //BASE_URL: 'http://localhost:3000',
    ENDPOINTS: {
            AUTH: {
                LOGIN: '/auth/login',
                REGISTER: '/auth/register',
                PROFILE: '/auth/profile',
                LOGOUT: '/auth/logout'
            },
        STORES: {
            LIST: '/stores',
            CREATE: '/stores',
            UPDATE: '/stores',
            GET: '/stores'
        },
        USERS: {
            LIST: '/users',
            CREATE: '/users',
            UPDATE: '/users',
            GET: '/users'
        },
        PRODUCTS: {
            LIST: '/products',
            CREATE: '/products',
            UPDATE: '/products',
            GET: '/products'
        },
        TOPPINGS: {
            LIST: '/toppings',
            CREATE: '/toppings',
            UPDATE: '/toppings',
            GET: '/toppings'
        },
            ORDERS: {
                LIST: '/orders',
                CREATE: '/orders',
                UPDATE: '/orders',
                GET: '/orders',
                DELETE: '/orders'
            },
            KITCHEN: {
                QUEUE: '/kitchen/queue',
                START: '/kitchen/queue',
                COMPLETE: '/kitchen/queue',
                GET: '/kitchen/queue'
            },
        PAYMENTS: {
            LIST: '/payments',
            CREATE: '/payments',
            BY_ORDER: '/payments/order'
        },
        REPORTS: {
            DAILY: '/reports/daily',
            RANGE: '/reports/range',
            PRODUCTS: '/reports/products',
            SUMMARY: '/reports/summary'
        },
        ROLES: {
            LIST: '/roles'
        }
    }
};

// Roles del sistema
const ROLES = {
    ADMINISTRADOR: 'Administrador',
    MESERO: 'Mesero',
    COCINA: 'Cocina'
};

// Estados de pedidos
const ORDER_STATUS = {
    EN_PROCESO: 'En proceso',
    ENTREGADO: 'Entregado'
};

// Almacenamiento local
const STORAGE_KEYS = {
    TOKEN: 'auth_token',
    USER: 'user_data',
    STORE_ID: 'store_id'
};
