/**
 * js/services/adminService.js - Servicio de Administración Global (Rol Admin)
 * Gestiona usuarios autorizados, cuentas pendientes e inactivos a través de Supabase.
 */

import { auth } from './auth.js';

const SUPABASE_URL = 'https://tctzcyhlxdcpnzkxwndm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdHpjeWhseGRjcG56a3h3bmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2ODcwOTgsImV4cCI6MjEwMTI2MzA5OH0.gWezSq0GhY_QJdjOkSVQkrrRzA35mftfgZsIoU0Cj58';

const DOMINIO_CORPORATIVO = '@bsa.cat';

async function _fetchAdmin(endpoint, options = {}) {
  const currentUser = auth.getCurrentUser();
  const token = currentUser?.token || SUPABASE_ANON_KEY;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase ${response.status}: ${err}`);
  }

  return response.json();
}

function getFechaActual() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export const adminService = {

  completarDominio(inputUsuario) {
    if (!inputUsuario) return '';
    const limpio = inputUsuario.trim();
    return limpio.includes('@') ? limpio : `${limpio}${DOMINIO_CORPORATIVO}`;
  },

  // ==========================================
  // LISTA BLANCA (Usuarios Autorizados)
  // ==========================================

  async getUsuariosAutorizados() {
    const data = await _fetchAdmin('usuarios_autorizados?select=*');
    return (data || []).map(item => ({
      identificador: item.identificador,
      rol: item.rol || 'celador'
    }));
  },

  /**
   * Añade un usuario a la lista de autorizados.
   * @param {string} inputIdentificador - Identificador del usuario (sin @bsa.cat)
   * @param {string} [rol='celador'] - Rol del usuario ('admin' o 'celador')
   */
  async agregarUsuarioAutorizado(inputIdentificador, rol = 'celador') {
    const identificador = (inputIdentificador || '').trim().toLowerCase().replace(DOMINIO_CORPORATIVO, '');
    if (!identificador) return;

    // Verificar si ya existe
    const autorizados = await this.getUsuariosAutorizados();
    const existe = autorizados.some(u => u.identificador === identificador);
    if (existe) return;

    await _fetchAdmin('usuarios_autorizados', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ identificador, rol })
    });
  },

  async estaAutorizado(identificador) {
    const autorizados = await this.getUsuariosAutorizados();
    return autorizados.some(u => u.identificador === identificador);
  },

  // ==========================================
  // CUENTAS PENDIENTES
  // ==========================================

  async getCuentasPendientes() {
    const data = await _fetchAdmin('cuentas_pendientes?select=*&order=created_at.asc');
    return (data || []).map(item => ({
      id: item.id,
      tipo: item.tipo,
      email: item.email,
      detalle: item.detalle
    }));
  },

  async resolverRestablecimiento(email) {
    await _fetchAdmin(`cuentas_pendientes?email=eq.${email}&tipo=eq.password`, {
      method: 'DELETE'
    });
  },

  async registrarSolicitudRestablecimiento(identificador, nombre) {
    const pendientes = await this.getCuentasPendientes();
    const email = `${identificador}${DOMINIO_CORPORATIVO}`;
    const yaExiste = pendientes.some(p => p.tipo === 'password' && p.email === email);
    if (yaExiste) return;

    await _fetchAdmin('cuentas_pendientes', {
      method: 'POST',
      body: JSON.stringify({
        id: `req_${Date.now()}`,
        tipo: 'password',
        email: email,
        detalle: 'Solicitud de restablecimiento de contraseña'
      })
    });
  },

  async autorizarRegistro(email) {
    await _fetchAdmin(`cuentas_pendientes?email=eq.${email}&tipo=eq.registro`, {
      method: 'DELETE'
    });

    await this.agregarUsuarioAutorizado(email);
  },

  async descartarRegistro(email) {
    await _fetchAdmin(`cuentas_pendientes?email=eq.${email}&tipo=eq.registro`, {
      method: 'DELETE'
    });
  },

  async registrarSolicitudAltaNoAutorizada(identificador) {
    const pendientes = await this.getCuentasPendientes();
    const email = `${identificador}${DOMINIO_CORPORATIVO}`;
    const yaExiste = pendientes.some(p => p.tipo === 'registro' && p.email === email);
    if (yaExiste) return;

    await _fetchAdmin('cuentas_pendientes', {
      method: 'POST',
      body: JSON.stringify({
        id: `req_${Date.now()}`,
        tipo: 'registro',
        email: email,
        detalle: `Intento de registro no autorizado (${email})`
      })
    });
  },

  // ==========================================
  // USUARIOS ACTIVOS E INACTIVOS
  // ==========================================

  async getUsuariosActivos() {
    const data = await _fetchAdmin('usuarios?select=id,email,rol&activo=eq.true');
    return (data || []).map(item => ({
      id: item.id,
      email: item.email,
      rol: item.rol
    }));
  },

  async getUsuariosInactivos() {
    const data = await _fetchAdmin('usuarios_inactivos?select=*');
    return (data || []).map(item => ({
      id: item.id,
      email: item.email,
      fechaBaja: item.fecha_baja
    }));
  },

  async crearCuentaDesdeAutorizado(identificador) {
    const email = `${identificador}${DOMINIO_CORPORATIVO}`;
    const activos = await this.getUsuariosActivos();
    const existente = activos.find(u => u.email === email);
    if (existente) return existente;

    // Buscar el rol en la tabla de usuarios autorizados
    const autorizados = await this.getUsuariosAutorizados();
    const autorizado = autorizados.find(u => u.identificador === identificador);
    const rol = autorizado?.rol || 'celador';

    // Si el usuario actual es admin y el nuevo usuario no tiene rol asignado, por defecto celador
    const currentUser = auth.getCurrentUser();
    let rolFinal = rol;
    if (currentUser && currentUser.rol === 'admin' && !rolFinal) {
      rolFinal = 'celador';
    }

    return {
      id: `cel_${Date.now()}`,
      rol: rolFinal,
      email
    };
  },

  async suspenderUsuario(userId) {
    const activos = await this.getUsuariosActivos();
    const usr = activos.find(u => u.id === userId);
    if (!usr) return;

    await _fetchAdmin(`usuarios?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ activo: false })
    });

    await _fetchAdmin('cuentas_pendientes', {
      method: 'POST',
      body: JSON.stringify({
        id: `req_${Date.now()}`,
        tipo: 'suspendida',
        email: usr.email,
        detalle: 'Cuenta suspendida'
      })
    });
  },

  async reactivarUsuario(email) {
    await _fetchAdmin(`cuentas_pendientes?email=eq.${email}&tipo=eq.suspendida`, {
      method: 'DELETE'
    });

    const usuarios = await _fetchAdmin(`usuarios?select=id&email=eq.${email}`);
    if (usuarios && usuarios.length > 0) {
      await _fetchAdmin(`usuarios?id=eq.${usuarios[0].id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: true })
      });
    }
  },

  async moverInactivo(email) {
    await _fetchAdmin(`cuentas_pendientes?email=eq.${email}&tipo=eq.suspendida`, {
      method: 'DELETE'
    });

    await _fetchAdmin('usuarios_inactivos', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: `cel_${Date.now()}`,
        email,
        fecha_baja: getFechaActual()
      })
    });
  },

  async eliminarUsuarioInactivo(userId) {
    await _fetchAdmin(`usuarios_inactivos?id=eq.${userId}`, {
      method: 'DELETE'
    });
  }
};