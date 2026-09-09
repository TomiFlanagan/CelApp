/**
 * js/services/auth.js
 * Servicio de Autenticación con Supabase.
 * Gestiona el inicio de sesión con dominio corporativo (@bsa.cat).
 */

const DOMINIO_CORPORATIVO = '@bsa.cat';
const SESSION_KEY = 'celador_app_v1_session';

// Configuración de Supabase
const SUPABASE_URL = 'https://tctzcyhlxdcpnzkxwndm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdHpjeWhseGRjcG56a3h3bmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2ODcwOTgsImV4cCI6MjEwMTI2MzA5OH0.gWezSq0GhY_QJdjOkSVQkrrRzA35mftfgZsIoU0Cj58';

/**
 * Normaliza un identificador de usuario.
 */
function normalizarIdentificador(input) {
  if (!input) return '';
  const limpio = input.trim().toLowerCase();
  return limpio.endsWith(DOMINIO_CORPORATIVO)
    ? limpio.slice(0, -DOMINIO_CORPORATIVO.length)
    : limpio;
}

/**
 * Realiza una petición a la API REST de Supabase con token de autenticación
 */
async function _fetchSupabaseWithAuth(endpoint, token, options = {}) {
  console.log(`📡 [AUTH] _fetchSupabaseWithAuth() INICIADO: ${endpoint}`);
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [AUTH] Error en petición Supabase (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    console.log(`✅ [AUTH] _fetchSupabaseWithAuth() EXITOSO`);
    return data;
  } catch (error) {
    console.error('❌ [AUTH] Error en fetch Supabase:', error);
    return null;
  }
}

/**
 * Persiste la sesión activa.
 */
function persistirSesion(user, mantenerSesion) {
  console.log('💾 [AUTH] persistirSesion() INICIADO, mantenerSesion:', mantenerSesion);
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    const target = mantenerSesion ? localStorage : sessionStorage;
    target.setItem(SESSION_KEY, JSON.stringify(user));
    console.log(`✅ [AUTH] Sesión guardada en ${mantenerSesion ? 'localStorage' : 'sessionStorage'}`);
  } catch (e) {
    console.error('❌ [AUTH] Error guardando sesión de usuario:', e);
  }
}

export const auth = {
  getCurrentUser() {
    console.log('🔍 [AUTH] getCurrentUser() llamado');
    try {
      const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      console.log('🔍 [AUTH] stored raw:', stored ? stored.substring(0, 50) + '...' : 'null');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('🔍 [AUTH] Usuario parseado:', { id: parsed.id, email: parsed.email, rol: parsed.rol });
        return parsed;
      }
      console.log('🔍 [AUTH] No hay sesión guardada');
    } catch (e) {
      console.error('❌ [AUTH] Error leyendo sesión de usuario:', e);
    }
    return null;
  },

  isAuthenticated() {
    const result = this.getCurrentUser() !== null;
    console.log('🔍 [AUTH] isAuthenticated():', result);
    return result;
  },

  // 🔥 NUEVO: Renueva el token automáticamente antes de que caduque
  async refreshSession() {
    console.log('🔄 [AUTH] refreshSession() INICIADO');
    const current = this.getCurrentUser();
    if (!current || !current.refresh_token) {
      console.warn('⚠️ [AUTH] refreshSession: no hay usuario o refresh_token');
      return false;
    }
    console.log('🔍 [AUTH] refresh_token existe, renovando...');

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: current.refresh_token
        })
      });

      if (!response.ok) {
        console.warn('⚠️ [AUTH] refreshSession: respuesta no OK, cerrando sesión');
        this.logout();
        return false;
      }

      const data = await response.json();
      const nuevoToken = data.access_token;
      const nuevoRefreshToken = data.refresh_token;
      console.log('✅ [AUTH] Nuevos tokens obtenidos');

      // 🔥 Actualizar la sesión con el nuevo token
      const updatedUser = {
        ...current,
        token: nuevoToken,
        refresh_token: nuevoRefreshToken,
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hora
      };

      // Mantener el mismo destino (localStorage o sessionStorage)
      const enLocal = localStorage.getItem(SESSION_KEY) !== null;
      const target = enLocal ? localStorage : sessionStorage;
      target.setItem(SESSION_KEY, JSON.stringify(updatedUser));

      console.log('🔄 [AUTH] Token renovado automáticamente');
      return true;
    } catch (error) {
      console.error('❌ [AUTH] Error renovando token:', error);
      return false;
    }
  },

  // 🔥 NUEVO: Comprueba si el token ha caducado
  isTokenExpired() {
    console.log('🔍 [AUTH] isTokenExpired() llamado');
    const user = this.getCurrentUser();
    if (!user || !user.token) {
      console.log('🔍 [AUTH] isTokenExpired: no hay usuario o token -> true');
      return true;
    }

    try {
      const payload = JSON.parse(atob(user.token.split('.')[1]));
      const expiracion = payload.exp * 1000;
      const expired = Date.now() > expiracion;
      console.log(`🔍 [AUTH] isTokenExpired: expira en ${Math.round((expiracion - Date.now()) / 1000)}s -> ${expired}`);
      return expired;
    } catch (e) {
      console.warn('⚠️ [AUTH] isTokenExpired: error parseando token -> true', e);
      return true;
    }
  },

  updateUser(userData) {
    console.log('🔄 [AUTH] updateUser() INICIADO');
    const current = this.getCurrentUser();
    const updated = { ...current, ...userData };
    try {
      const enLocal = localStorage.getItem(SESSION_KEY) !== null;
      const target = enLocal ? localStorage : sessionStorage;
      target.setItem(SESSION_KEY, JSON.stringify(updated));
      console.log('✅ [AUTH] Usuario actualizado');
    } catch (e) {
      console.error('❌ [AUTH] Error guardando sesión de usuario:', e);
    }
    return updated;
  },

  setMantenerSesion(mantenerSesion) {
    console.log('🔄 [AUTH] setMantenerSesion() INICIADO:', mantenerSesion);
    const current = this.getCurrentUser();
    if (current) {
      persistirSesion(current, mantenerSesion);
    } else {
      console.warn('⚠️ [AUTH] setMantenerSesion: no hay usuario actual');
    }
  },

  getMantenerSesion() {
    try {
      const result = localStorage.getItem(SESSION_KEY) !== null;
      console.log('🔍 [AUTH] getMantenerSesion():', result);
      return result;
    } catch (e) {
      console.warn('⚠️ [AUTH] getMantenerSesion: error -> true por defecto');
      return true;
    }
  },

  logout() {
    console.log('🚪 [AUTH] logout() INICIADO');
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      console.log('✅ [AUTH] Sesión cerrada correctamente');
    } catch (e) {
      console.error('❌ [AUTH] Error al cerrar sesión:', e);
    }
  },

  async login(identificadorInput, password, mantenerSesion = true) {
    console.log('🔐 [AUTH] login() INICIADO, identificador:', identificadorInput, 'mantenerSesion:', mantenerSesion);
    
    const identificador = normalizarIdentificador(identificadorInput);
    console.log('🔍 [AUTH] identificador normalizado:', identificador);

    if (!identificador || !password) {
      console.warn('⚠️ [AUTH] login: campos incompletos');
      return { success: false, reason: 'campos_incompletos' };
    }

    const email = `${identificador}${DOMINIO_CORPORATIVO}`;
    console.log('🔍 [AUTH] email:', email);
    
    if (!email.endsWith(DOMINIO_CORPORATIVO)) {
      console.warn('⚠️ [AUTH] login: dominio inválido');
      return { success: false, reason: 'dominio_invalido' };
    }

    try {
      // Intentar login con Supabase Auth
      console.log('📡 [AUTH] Enviando petición a Supabase Auth...');
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [AUTH] Error en login Supabase:', errorData);
        if (errorData.error?.message?.includes('Invalid login credentials')) {
          return { success: false, reason: 'password_incorrecta' };
        }
        return { success: false, reason: 'password_incorrecta' };
      }

      const data = await response.json();
      const token = data.access_token;
      const refresh_token = data.refresh_token;
      console.log('✅ [AUTH] Autenticación exitosa, token obtenido');

      // Obtener el usuario autenticado para obtener su ID (UUID de Supabase Auth)
      console.log('📡 [AUTH] Obteniendo datos del usuario autenticado...');
      const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!userResponse.ok) {
        console.error('❌ [AUTH] Error obteniendo usuario autenticado');
        return { success: false, reason: 'error_servidor' };
      }
      
      const userAuthData = await userResponse.json();
      const userId = userAuthData.id;
      console.log('🔍 [AUTH] userId:', userId);

      // Obtener perfil del usuario desde la tabla `usuarios` por ID
      console.log('📡 [AUTH] Obteniendo perfil del usuario...');
      const perfil = await _fetchSupabaseWithAuth(`usuarios?id=eq.${userId}`, token);

      if (perfil && perfil.length > 0) {
        const userData = perfil[0];
        console.log('🔍 [AUTH] Perfil encontrado:', { email: userData.email, rol: userData.rol, activo: userData.activo });
        
        const user = {
          id: userAuthData.id, 
          email: userData.email,
          rol: userData.rol || 'user',
          activo: userData.activo !== false,
          token: token,
          refresh_token: refresh_token,
          expiresAt: Date.now() + (60 * 60 * 1000) // 1 hora
        };

        if (!user.activo) {
          console.warn('⚠️ [AUTH] Usuario inactivo');
          return { success: false, reason: 'usuario_inactivo' };
        }

        persistirSesion(user, mantenerSesion);
        console.log('✅ [AUTH] login() EXITOSO, usuario:', user.email);
        return { success: true, user };
      } else {
        console.warn('⚠️ [AUTH] Usuario no autorizado (no encontrado en tabla usuarios)');
        return { success: false, reason: 'no_autorizado' };
      }
    } catch (error) {
      console.error('❌ [AUTH] Error en login:', error);
      return { success: false, reason: 'error_servidor' };
    }
  },

  /**
   * Cambia la contraseña del usuario con sesión activa.
   * Primero verifica la contraseña actual reautenticando contra Supabase
   * (evita que alguien con el móvil desbloqueado y la sesión ya abierta
   * pueda cambiar la contraseña sin conocer la actual). Si la verificación
   * es correcta, actualiza la contraseña usando el token de la sesión activa.
   * @param {string} passwordActual
   * @param {string} passwordNueva
   */
  async changePassword(passwordActual, passwordNueva) {
    console.log('🔄 [AUTH] changePassword() INICIADO');
    const current = this.getCurrentUser();
    if (!current || !current.email || !current.token) {
      console.warn('⚠️ [AUTH] changePassword: sin sesión activa');
      return { success: false, reason: 'sin_sesion' };
    }
    console.log('🔍 [AUTH] changePassword: usuario actual:', current.email);

    // 1. Verificar la contraseña actual reautenticando contra Supabase
    try {
      console.log('📡 [AUTH] Verificando contraseña actual...');
      const verifyResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: current.email,
          password: passwordActual
        })
      });

      if (!verifyResponse.ok) {
        console.warn('⚠️ [AUTH] Contraseña actual incorrecta');
        return { success: false, reason: 'password_actual_incorrecta' };
      }
      console.log('✅ [AUTH] Contraseña actual verificada');
    } catch (error) {
      console.error('❌ [AUTH] Error verificando contraseña actual:', error);
      return { success: false, reason: 'error_servidor' };
    }

    // 2. Renovar el token si está a punto de caducar, para evitar un 401 en el siguiente paso
    if (this.isTokenExpired()) {
      console.log('🔄 [AUTH] Token expirado, renovando antes de cambiar contraseña...');
      const renovado = await this.refreshSession();
      if (!renovado) {
        console.error('❌ [AUTH] No se pudo renovar token para cambiar contraseña');
        return { success: false, reason: 'error_servidor' };
      }
    }

    // 3. Cambiar la contraseña usando el token de la sesión activa
    try {
      const tokenActualizado = this.getCurrentUser()?.token || current.token;
      console.log('📡 [AUTH] Enviando petición de cambio de contraseña...');
      const updateResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${tokenActualizado}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: passwordNueva })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        console.error('❌ [AUTH] Error cambiando contraseña:', errorData);
        return { success: false, reason: 'error_servidor' };
      }

      console.log('✅ [AUTH] Contraseña cambiada correctamente');
      return { success: true };
    } catch (error) {
      console.error('❌ [AUTH] Error cambiando contraseña:', error);
      return { success: false, reason: 'error_servidor' };
    }
  }
};

export function getCurrentUser() {
  return auth.getCurrentUser();
}