# Frontend - Sistema de Gestión de Pedidos

Frontend desarrollado con HTML, CSS y JavaScript vanilla para el sistema multi-tienda de gestión de pedidos.

## Características

- Autenticación JWT con manejo de sesiones
- Registro de nuevas tiendas con administrador
- Paneles diferenciados por rol:
  - **Administrador**: Gestión completa (productos, toppings, usuarios, reportes)
  - **Mesero**: Crear y gestionar pedidos
  - **Cocina**: Cola de pedidos en tiempo real
- Diseño responsive y moderno
- Seguridad: Validación de tokens, protección de rutas por rol

## Estructura

```
front/
├── index.html              # Página de login/registro
├── dashboard-admin.html    # Panel de administrador
├── dashboard-waiter.html   # Panel de mesero
├── dashboard-kitchen.html  # Panel de cocina
├── css/
│   └── styles.css         # Estilos globales
└── js/
    ├── config.js           # Configuración de API y constantes
    ├── api.js              # Cliente HTTP para llamadas a la API
    ├── auth.js             # Gestión de autenticación
    ├── app.js              # Aplicación principal
    ├── admin.js            # Módulo de administrador
    ├── waiter.js           # Módulo de mesero
    └── kitchen.js          # Módulo de cocina
```

## Configuración

1. Asegúrate de que el backend esté corriendo en `http://localhost:3000`
2. Si el backend está en otro puerto, actualiza `API_CONFIG.BASE_URL` en `js/config.js`

## Uso

1. Abre `index.html` en tu navegador
2. Para primera vez:
   - Haz clic en "Registrar Tienda"
   - Completa el formulario con los datos de tu tienda y administrador
3. Para usuarios existentes:
   - Ingresa tu usuario y contraseña
   - Serás redirigido al panel correspondiente según tu rol

## Notas Importantes

- El registro de tiendas requiere que el backend permita crear tiendas sin autenticación inicial, o necesitarás un usuario super administrador
- Los tokens JWT se almacenan en localStorage
- La sesión se verifica periódicamente
- Si el token expira, serás redirigido automáticamente al login

## Roles y Permisos

- **Administrador**: Acceso completo a todos los módulos
- **Mesero**: Solo puede crear y ver pedidos
- **Cocina**: Solo puede ver y gestionar la cola de pedidos
# front-queuechef
