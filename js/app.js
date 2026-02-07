// Aplicación principal
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si el usuario ya está autenticado
    if (authManager.isAuthenticated()) {
        loadDashboard();
    } else {
        showLogin();
    }

    // Event listeners para login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Event listeners para registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('loginError');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        errorDiv.classList.remove('active');
    }

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // Validaciones básicas
    if (!username || username.length === 0) {
        if (errorDiv) {
            errorDiv.textContent = 'El nombre de usuario es requerido';
            errorDiv.style.display = 'block';
            errorDiv.classList.add('active');
        }
        return;
    }

    if (!password || password.length === 0) {
        if (errorDiv) {
            errorDiv.textContent = 'La contraseña es requerida';
            errorDiv.style.display = 'block';
            errorDiv.classList.add('active');
        }
        return;
    }

    // Mostrar loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Iniciando sesión...';
    }

    try {
        const result = await authManager.login(username, password);

        if (result.success) {
            showNotification('Inicio de sesión exitoso', 'success');
            setTimeout(() => {
                loadDashboard();
            }, 500);
        } else {
            if (errorDiv) {
                errorDiv.textContent = result.error || 'Error al iniciar sesión';
                errorDiv.style.display = 'block';
                errorDiv.classList.add('active');
            }
            showNotification(result.error || 'Error al iniciar sesión', 'error');
        }
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Error al iniciar sesión';
            errorDiv.style.display = 'block';
            errorDiv.classList.add('active');
        }
        showNotification(error.message || 'Error al iniciar sesión', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Iniciar Sesión';
        }
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        errorDiv.classList.remove('active');
    }
    if (successDiv) {
        successDiv.style.display = 'none';
        successDiv.textContent = '';
        successDiv.classList.remove('active');
    }

    const storeName = document.getElementById('storeName').value.trim();
    const storeAddress = document.getElementById('storeAddress').value.trim();
    const storePhone = document.getElementById('storePhone').value.trim();
    const adminName = document.getElementById('adminName').value.trim();
    const adminPassword = document.getElementById('adminPassword').value;
    const adminPasswordConfirm = document.getElementById('adminPasswordConfirm').value;

    // Validaciones
    if (!storeName || storeName.length === 0) {
        if (errorDiv) {
            errorDiv.textContent = 'El nombre de la tienda es requerido';
            errorDiv.style.display = 'block';
            errorDiv.classList.add('active');
        }
        return;
    }

    if (!storeAddress || storeAddress.length === 0) {
        if (errorDiv) {
            errorDiv.textContent = 'La dirección es requerida';
            errorDiv.style.display = 'block';
            errorDiv.classList.add('active');
        }
        return;
    }

    if (!storePhone || storePhone.length === 0) {
        if (errorDiv) {
            errorDiv.textContent = 'El teléfono es requerido';
            errorDiv.style.display = 'block';
            errorDiv.classList.add('active');
        }
        return;
    }

    if (!adminName || adminName.length === 0) {
        if (errorDiv) {
            errorDiv.textContent = 'El nombre del administrador es requerido';
            errorDiv.style.display = 'block';
            errorDiv.classList.add('active');
        }
        return;
    }

    if (!adminPassword || adminPassword.length < 4) {
        if (errorDiv) {
            errorDiv.textContent = 'La contraseña debe tener al menos 4 caracteres';
            errorDiv.style.display = 'block';
            errorDiv.classList.add('active');
        }
        return;
    }

    if (adminPassword !== adminPasswordConfirm) {
        if (errorDiv) {
            errorDiv.textContent = 'Las contraseñas no coinciden';
            errorDiv.style.display = 'block';
            errorDiv.classList.add('active');
        }
        return;
    }

    // Mostrar loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Registrando...';
    }

    try {
        const result = await authManager.registerStoreAndAdmin(
            {
                name: storeName,
                address: storeAddress,
                phone: storePhone,
                status: 'activa'
            },
            {
                name: adminName,
                password: adminPassword
            }
        );

        if (result.success) {
            if (successDiv) {
                successDiv.textContent = 'Tienda registrada exitosamente. Redirigiendo...';
                successDiv.style.display = 'block';
                successDiv.classList.add('active');
            }
            showNotification('Tienda registrada exitosamente', 'success');
            setTimeout(() => {
                loadDashboard();
            }, 1500);
        } else {
            if (errorDiv) {
                errorDiv.textContent = result.error || 'Error al registrar';
                errorDiv.style.display = 'block';
                errorDiv.classList.add('active');
            }
            showNotification(result.error || 'Error al registrar', 'error');
        }
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Error al registrar';
            errorDiv.style.display = 'block';
            errorDiv.classList.add('active');
        }
        showNotification(error.message || 'Error al registrar', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrar Tienda';
        }
    }
}

function showLogin() {
    document.querySelector('.login-box').style.display = 'block';
    document.getElementById('registerBox').style.display = 'none';
}

function showRegister() {
    document.querySelector('.login-box').style.display = 'none';
    document.getElementById('registerBox').style.display = 'block';
}

function loadDashboard() {
    // Ocultar login
    document.querySelector('.login-container').style.display = 'none';
    
    // Cargar dashboard según el rol
    const role = authManager.getUserRole();
    
    if (role === ROLES.ADMINISTRADOR) {
        loadAdminDashboard();
    } else if (role === ROLES.MESERO) {
        loadWaiterDashboard();
    } else if (role === ROLES.COCINA) {
        loadKitchenDashboard();
    } else {
        alert('Rol no reconocido');
        authManager.logout();
    }
}

function loadAdminDashboard() {
    // Redirigir al dashboard principal del admin
    window.location.href = 'admin/dashboard.html';
}

function loadWaiterDashboard() {
    // Redirigir al dashboard del mesero
    window.location.href = 'waiter/dashboard.html';
}

function loadKitchenDashboard() {
    // Redirigir al dashboard de cocina
    window.location.href = 'kitchen/dashboard.html';
}

function loadScript(src) {
    const script = document.createElement('script');
    script.src = src;
    document.body.appendChild(script);
}
