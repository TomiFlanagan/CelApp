/**
 * sync.js - Sincronización de Estado Global (Compartido)
 * Gestiona el estado reactivo compartido (camas y almacén) entre dispositivos.
 * Conectado a Supabase para sincronización en tiempo real.
 */

import { MATERIALES } from '../config/materiales.js';
import { storage } from './storage.js';
import { auth } from './auth.js';

// Configuración de Supabase
const SUPABASE_URL = 'https://tctzcyhlxdcpnzkxwndm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdHpjeWhseGRjcG56a3h3bmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2ODcwOTgsImV4cCI6MjEwMTI2MzA5OH0.gWezSq0GhY_QJdjOkSVQkrrRzA35mftfgZsIoU0Cj58';

class SyncService {
  constructor() {
    console.log('🚀 [SYNC] Constructor INICIADO');
    
    const initialStockMap = {
      grua: { amarilla: 2, naranja: 1, teja: 0, verde: 3, azul: 1 },
      grua_bipedestacion: { amarilla: 1, naranja: 0, teja: 1, verde: 0, azul: 2 },
      colchon_aire: { amarilla: 4, naranja: 2, teja: 3, verde: 1, azul: 0 },
      silla_oxigeno: { amarilla: 1, naranja: 1, teja: 0, verde: 2, azul: 1 },
      silla_gd: { amarilla: 0, naranja: 2, teja: 1, verde: 1, azul: 0 },
      silla_xl: { amarilla: 2, naranja: 0, teja: 1, verde: 0, azul: 3 },
      cojin_antiescaras: { amarilla: 5, naranja: 3, teja: 4, verde: 2, azul: 6 }
    };

    /** @type {Record<string, any>} */
    const initialAlmacen = {};
    MATERIALES.forEach((/** @type {any} */ mat) => {
      initialAlmacen[mat.id] = initialStockMap[mat.id] || { amarilla: 0, naranja: 0, teja: 0, verde: 0, azul: 0 };
    });

    this.remoteState = {
      camas: {},
      almacen: initialAlmacen
    };
    console.log('📊 [SYNC] remoteState inicializado');

    /** @type {Array<Function>} */
    this.listeners = [];
    
    this._supabaseClient = {
      url: SUPABASE_URL,
      key: SUPABASE_ANON_KEY,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    this._isConnected = true;
    console.log('✅ [SYNC] SyncService conectado a Supabase');
    console.log('✅ [SYNC] Constructor FINALIZADO');
  }

  /**
   * 🔥 Obtiene el nombre del usuario actual (parte antes del @)
   * @returns {string} - Nombre del usuario o 'Usuario desconocido'
   */
  _getNombreUsuarioActual() {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || !currentUser.email) return 'Usuario desconocido';
    return currentUser.email.split('@')[0] || 'Usuario desconocido';
  }

  /**
   * Realiza una petición a la API REST de Supabase con autenticación.
   * 🔥 AHORA RENUEVA EL TOKEN AUTOMÁTICAMENTE ANTES DE HACER LA PETICIÓN.
   */
  async _fetchSupabase(endpoint, options = {}) {
    console.log(`📡 [SYNC] _fetchSupabase() INICIADO: ${options.method || 'GET'} ${endpoint}`);
    
    // 🔥 COMPROBACIÓN Y RENOVACIÓN DE TOKEN: Si está a punto de caducar, lo renovamos
    const currentUser = auth.getCurrentUser();
    console.log('🔍 [SYNC] _fetchSupabase: currentUser existe?', !!currentUser);
    
    if (currentUser && auth.isTokenExpired()) {
      console.log('🔄 [SYNC] _fetchSupabase: token expirado, renovando...');
      const renovado = await auth.refreshSession();
      if (!renovado) {
        console.error('❌ [SYNC] _fetchSupabase: no se pudo renovar token');
        return null;
      }
      console.log('✅ [SYNC] _fetchSupabase: token renovado correctamente');
    }

    if (!this._supabaseClient) {
      console.error('❌ [SYNC] _fetchSupabase: _supabaseClient es null');
      return null;
    }

    const url = `${this._supabaseClient.url}/rest/v1/${endpoint}`;

    // Obtener el token actualizado
    const userActualizado = auth.getCurrentUser();
    const token = userActualizado?.token || this._supabaseClient.key;
    console.log('🔍 [SYNC] _fetchSupabase: token usado (primeros 20 chars):', token ? token.substring(0, 20) + '...' : 'null');

    const headers = {
      ...this._supabaseClient.headers,
      'Authorization': `Bearer ${token}`
    };

    console.log(`📡 [SYNC] Petición a Supabase: ${options.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        },
        credentials: 'omit'
      });

      console.log(`📨 [SYNC] Respuesta HTTP: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error en petición Supabase (${response.status}) [${endpoint}]:`, errorText);
        throw new Error(`Supabase ${response.status} en "${endpoint}": ${errorText}`);
      }

      try {
        const data = await response.json();
        console.log(`✅ [SYNC] _fetchSupabase() EXITOSO, data length:`, Array.isArray(data) ? data.length : 'object');
        return data;
      } catch (parseError) {
        console.warn('⚠️ [SYNC] La respuesta no es JSON, se ignora.');
        return null;
      }
    } catch (error) {
      console.error('❌ [SYNC] Error en fetch Supabase:', error.message || error);
      throw error;
    }
  }

  /**
   * Carga los datos iniciales desde Supabase.
   * ⚠️ Este método debe llamarse DESPUÉS de que el usuario haya iniciado sesión.
   * Cada sección tiene su propio try/catch, así un fallo en una no impide cargar las demás.
   */
  async cargarDatosIniciales() {
    console.log('🚀 [SYNC] cargarDatosIniciales() INICIADO');
    console.log('🔍 [SYNC] auth.getCurrentUser() =', auth.getCurrentUser());
    
    // --- Camas ---
    try {
      console.log('🔍 [SYNC] Cargando camas...');
      const camasData = await this._fetchSupabase('camas');
      console.log('📊 [SYNC] camasData recibido:', camasData ? 'array de ' + camasData.length + ' elementos' : 'null');
      if (camasData && Array.isArray(camasData)) {
        this.remoteState.camas = {};
        camasData.forEach(cama => {
          if (!this.remoteState.camas[cama.unidad_id]) this.remoteState.camas[cama.unidad_id] = {};
          this.remoteState.camas[cama.unidad_id][cama.id] = {
            esPacienteCelador: cama.es_paciente_celador || false,
            atributos: cama.atributos || {},
            rutinas: cama.rutinas || {},
            ultimaModificacion: cama.ultima_modificacion || null
          };
        });
        console.log('✅ Datos de camas cargados desde Supabase');
      } else {
        console.warn('⚠️ No se encontraron camas en Supabase');
      }
    } catch (e) {
      console.error('❌ Fallo cargando camas:', e.message || e);
    }

    // --- Tareas extra ---
    try {
      console.log('🔍 [SYNC] Cargando tareas extra...');
      const tareasData = await this._fetchSupabase('tareas_extra?select=*');
      console.log('📊 [SYNC] tareasData recibido:', tareasData ? 'array de ' + tareasData.length + ' elementos' : 'null');
      if (tareasData && Array.isArray(tareasData)) {
        const tareasNormalizadas = tareasData.map(t => ({
          id: t.id,
          tipo: t.tipo,
          unidadId: t.unidad_id || null,
          habitacionCama: t.habitacion_cama || '',
          franjaId: t.franja_id || null,
          completada: Boolean(t.completada),
          createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
          usuario_id: t.usuario_id || null
        }));

        storage.saveTareasExtra(tareasNormalizadas);

        try {
          const { appState } = await import('../state/appState.js');
          if (appState && typeof appState.actualizarTareasExtra === 'function') {
            appState.actualizarTareasExtra(tareasNormalizadas);
            console.log('✅ appState actualizado con tareas extra');
          }
        } catch (e) {
          console.warn('⚠️ No se pudo actualizar appState con tareas extra:', e.message);
        }

        console.log(`✅ Tareas extra cargadas desde Supabase (${tareasNormalizadas.length} tareas)`);
        window.dispatchEvent(new CustomEvent('tareasExtraUpdated'));
      } else {
        console.warn('⚠️ No se encontraron tareas extra en Supabase');
      }
    } catch (e) {
      console.error('❌ Fallo cargando tareas extra:', e.message || e);
    }

    // --- Almacén ---
    try {
      console.log('🔍 [SYNC] Cargando almacén...');
      const almacenData = await this._fetchSupabase('almacen?select=*');
      console.log('📊 [SYNC] almacenData recibido:', almacenData ? 'array de ' + almacenData.length + ' elementos' : 'null');
      if (almacenData && Array.isArray(almacenData)) {
        const nuevoAlmacen = {};
        almacenData.forEach(item => {
          if (!nuevoAlmacen[item.recurso]) nuevoAlmacen[item.recurso] = {};
          nuevoAlmacen[item.recurso][item.unidad_id] = item.cantidad;
        });
        // Rellenar los huecos con 0 si no hay datos para alguna unidad/material
        MATERIALES.forEach(mat => {
          if (!nuevoAlmacen[mat.id]) nuevoAlmacen[mat.id] = {};
          ['amarilla', 'naranja', 'teja', 'verde', 'azul'].forEach(unidad => {
            if (nuevoAlmacen[mat.id][unidad] === undefined) {
              nuevoAlmacen[mat.id][unidad] = 0;
            }
          });
        });
        this.remoteState.almacen = nuevoAlmacen;
        console.log(`✅ Almacén cargado desde Supabase (${almacenData.length} registros)`);
      } else {
        console.warn('⚠️ No se encontraron registros en el almacén de Supabase');
      }
    } catch (e) {
      console.error('❌ Fallo cargando almacén:', e.message || e);
    }

    console.log('✅ [SYNC] cargarDatosIniciales() FINALIZADO (todas las secciones procesadas)');
    this.notifyListeners();
    console.log('📢 [SYNC] notifyListeners() llamado después de cargar datos');
  }

  /**
   * Obtiene la foto actual del estado global de camas para una unidad.
   */
  getCamas(unidadId) {
    return this.remoteState.camas[unidadId] || {};
  }

  /**
   * Sincroniza la modificación de un atributo de cama.
   */
  async updateCamaAttribute(unidadId, camaId, atributo, valor, ultimaModificacion) {
    console.log('🔄 [SYNC] updateCamaAttribute() INICIADO:', { unidadId, camaId, atributo, valor });
    
    if (atributo === 'tieneCambiosRecientes') {
      if (!valor) {
        storage.markCamaAsViewed(camaId);
        console.log('✅ [SYNC] Cama marcada como vista (tieneCambiosRecientes=false)');
      }
      return;
    }

    if (!this.remoteState.camas[unidadId]) {
      this.remoteState.camas[unidadId] = {};
    }
    if (!this.remoteState.camas[unidadId][camaId]) {
      this.remoteState.camas[unidadId][camaId] = {};
    }

    const timestamp = ultimaModificacion?.timestamp || Date.now();
    
    // 🔥 Si se proporciona ultimaModificacion, asegurar que tenga el nombre del usuario
    if (ultimaModificacion) {
      if (!ultimaModificacion.usuario || ultimaModificacion.usuario.length > 30) {
        ultimaModificacion.usuario = this._getNombreUsuarioActual();
      }
      this.remoteState.camas[unidadId][camaId].ultimaModificacion = ultimaModificacion;
    }

    this.remoteState.camas[unidadId][camaId][atributo] = valor;

    const mapAttrToSnakeCase = (attr) => {
      const map = {
        esPacienteCelador: 'es_paciente_celador',
        tieneCambiosRecientes: 'tiene_cambios_recientes'
      };
      return map[attr] || attr;
    };

    try {
      const updateData = {
        id: camaId,
        unidad_id: unidadId,
        [mapAttrToSnakeCase(atributo)]: valor,
        updated_at: new Date().toISOString()
      };
      if (ultimaModificacion) {
        updateData.ultima_modificacion = ultimaModificacion;
      }

      await this._fetchSupabase('camas?on_conflict=id', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(updateData)
      });
      console.log(`✅ Cama ${camaId} actualizada en Supabase (${atributo})`);
    } catch (error) {
      console.error('❌ Error actualizando cama en Supabase:', error.message || error);
    }

    storage.markCamaAsViewed(camaId, timestamp);
    this.notifyListeners();
    console.log('✅ [SYNC] updateCamaAttribute() FINALIZADO');
  }

  /**
   * Sincroniza la actualización completa de una ficha de cama.
   */
  async updateCamaCompleta(unidadId, camaId, datosCama) {
    console.log('🔄 [SYNC] updateCamaCompleta() INICIADO:', { unidadId, camaId });
    
    if (!this.remoteState.camas[unidadId]) {
      this.remoteState.camas[unidadId] = {};
    }
    const { tieneCambiosRecientes, ...restoDatos } = datosCama || {};
    const timestamp = datosCama?.ultimaModificacion?.timestamp || Date.now();
    
    // 🔥 Si se proporciona ultimaModificacion, asegurar que tenga el nombre del usuario
    if (datosCama?.ultimaModificacion) {
      if (!datosCama.ultimaModificacion.usuario || datosCama.ultimaModificacion.usuario.length > 30) {
        datosCama.ultimaModificacion.usuario = this._getNombreUsuarioActual();
      }
    }
    
    this.remoteState.camas[unidadId][camaId] = {
      ...this.remoteState.camas[unidadId][camaId],
      ...restoDatos
    };

    try {
      const updateData = {
        id: camaId,
        unidad_id: unidadId,
        es_paciente_celador: datosCama.esPacienteCelador || false,
        atributos: datosCama.atributos || {},
        rutinas: datosCama.rutinas || {},
        updated_at: new Date().toISOString()
      };
      if (datosCama.ultimaModificacion) {
        updateData.ultima_modificacion = datosCama.ultimaModificacion;
      }

      await this._fetchSupabase('camas?on_conflict=id', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(updateData)
      });
      console.log(`✅ Cama ${camaId} guardada en Supabase (UPSERT)`);
    } catch (error) {
      console.error('❌ Error guardando cama en Supabase:', error.message || error);
    }

    storage.markCamaAsViewed(camaId, timestamp);
    this.notifyListeners();
    console.log('✅ [SYNC] updateCamaCompleta() FINALIZADO');
  }

  /**
   * Sincroniza el vaciado completo de una ficha de cama.
   */
  async vaciarCama(unidadId, camaId, ultimaModificacion) {
    console.log('🔄 [SYNC] vaciarCama() INICIADO:', { unidadId, camaId });
    
    if (!this.remoteState.camas[unidadId]) {
      this.remoteState.camas[unidadId] = {};
    }

    const timestamp = ultimaModificacion?.timestamp || Date.now();
    
    // 🔥 Si se proporciona ultimaModificacion, asegurar que tenga el nombre del usuario
    if (ultimaModificacion) {
      if (!ultimaModificacion.usuario || ultimaModificacion.usuario.length > 30) {
        ultimaModificacion.usuario = this._getNombreUsuarioActual();
      }
    }

    this.remoteState.camas[unidadId][camaId] = {
      esPacienteCelador: false,
      atributos: {},
      rutinas: {},
      ...(ultimaModificacion ? { ultimaModificacion } : {})
    };

    try {
      const updateData = {
        id: camaId,
        unidad_id: unidadId,
        es_paciente_celador: false,
        atributos: {},
        rutinas: {},
        ultima_modificacion: ultimaModificacion || null,
        updated_at: new Date().toISOString()
      };

      await this._fetchSupabase('camas?on_conflict=id', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(updateData)
      });
      console.log(`✅ Cama ${camaId} vaciada en Supabase`);
    } catch (error) {
      console.error('❌ Error vaciando cama en Supabase:', error.message || error);
    }

    storage.markCamaAsViewed(camaId, timestamp);
    this.notifyListeners();
    console.log('✅ [SYNC] vaciarCama() FINALIZADO');
  }

  /**
   * Sincroniza una tarea extra con Supabase
   */
  async syncTareaExtra(tarea) {
    console.log('🔄 [SYNC] syncTareaExtra() INICIADO, id:', tarea.id);
    try {
      const data = {
        id: tarea.id,
        tipo: tarea.tipo,
        unidad_id: tarea.unidadId || tarea.unidad || null,
        habitacion_cama: tarea.habitacionCama || tarea.habitacion_cama || null,
        franja_id: tarea.franjaId || tarea.franja || null,
        completada: tarea.completada || false,
        created_at: tarea.createdAt ? new Date(tarea.createdAt).toISOString() : new Date().toISOString(),
        usuario_id: tarea.usuario_id || null
      };

      await this._fetchSupabase('tareas_extra?on_conflict=id', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(data)
      });

      console.log(`✅ Tarea extra ${tarea.id} sincronizada en Supabase`);
    } catch (error) {
      console.error('❌ Error sincronizando tarea extra:', error.message || error);
    }
    console.log('✅ [SYNC] syncTareaExtra() FINALIZADO');
  }

  /**
   * Elimina una tarea extra de Supabase
   */
  async deleteTareaExtra(id) {
    console.log('🔄 [SYNC] deleteTareaExtra() INICIADO, id:', id);
    try {
      await this._fetchSupabase(`tareas_extra?id=eq.${id}`, {
        method: 'DELETE'
      });
      console.log(`✅ Tarea extra ${id} eliminada de Supabase`);
    } catch (error) {
      console.error('❌ Error eliminando tarea extra:', error.message || error);
    }
    console.log('✅ [SYNC] deleteTareaExtra() FINALIZADO');
  }

  /**
   * Elimina TODAS las tareas extra del usuario actual en Supabase.
   */
  async deleteAllTareasExtraUsuario() {
    console.log('🔄 [SYNC] deleteAllTareasExtraUsuario() INICIADO');
    const currentUser = auth.getCurrentUser();
    const usuarioId = currentUser?.id;
    if (!usuarioId) {
      console.warn('⚠️ [SYNC] deleteAllTareasExtraUsuario: no hay usuario autenticado');
      return;
    }
    console.log('🔍 [SYNC] usuarioId:', usuarioId);

    try {
      await this._fetchSupabase(`tareas_extra?usuario_id=eq.${usuarioId}`, {
        method: 'DELETE'
      });
      console.log('✅ Tareas extra del usuario purgadas en Supabase (reinicio diario)');
    } catch (error) {
      console.error('❌ Error purgando tareas extra en Supabase:', error.message || error);
    }
    console.log('✅ [SYNC] deleteAllTareasExtraUsuario() FINALIZADO');
  }

  /**
   * Sincroniza todas las tareas extra con Supabase
   */
  async syncAllTareasExtra() {
    console.log('🔄 [SYNC] syncAllTareasExtra() INICIADO');
    const tareas = storage.getExtraTasks();
    console.log('📊 [SYNC] sincronizando', tareas.length, 'tareas extra');
    for (const tarea of tareas) {
      await this.syncTareaExtra(tarea);
    }
    console.log(`✅ ${tareas.length} tareas extra sincronizadas con Supabase`);
    console.log('✅ [SYNC] syncAllTareasExtra() FINALIZADO');
  }

  /**
   * Obtiene el estado compartido del almacén de material de una unidad concreta.
   */
  getAlmacen(unidadId) {
    const res = {};
    Object.keys(this.remoteState.almacen).forEach(matId => {
      res[matId] = this.remoteState.almacen[matId][unidadId] || 0;
    });
    return res;
  }

  /**
   * Obtiene la matriz completa global del almacén.
   */
  getAlmacenMatriz() {
    return this.remoteState.almacen;
  }

  /**
   * Actualiza el stock de un material específico en una unidad y lo guarda en Supabase.
   */
  async updateAlmacenCantidad(materialId, unidadId, nuevaCantidad) {
    console.log('🔄 [SYNC] updateAlmacenCantidad() INICIADO:', { materialId, unidadId, nuevaCantidad });
    
    if (!this.remoteState.almacen[materialId]) {
      this.remoteState.almacen[materialId] = {};
    }
    const cantidadNum = typeof nuevaCantidad === 'number' ? nuevaCantidad : parseInt(nuevaCantidad, 10);
    this.remoteState.almacen[materialId][unidadId] = Math.max(0, cantidadNum || 0);

    try {
      const { appState } = await import('../state/appState.js');
      if (appState && typeof appState.actualizarAlmacen === 'function') {
        appState.actualizarAlmacen(this.remoteState.almacen);
        console.log('✅ appState actualizado con almacén');
      }
    } catch (e) {
      console.warn('⚠️ No se pudo actualizar appState con el almacén:', e.message);
    }

    this.notifyListeners();

    try {
      const data = {
        recurso: materialId,
        unidad_id: unidadId,
        cantidad: this.remoteState.almacen[materialId][unidadId],
        updated_at: new Date().toISOString()
      };

      await this._fetchSupabase('almacen?on_conflict=recurso,unidad_id', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(data)
      });

      console.log(`✅ Almacén actualizado en Supabase (${materialId} - ${unidadId}: ${cantidadNum})`);
    } catch (error) {
      console.error('❌ Error guardando almacén en Supabase:', error.message || error);
    }
    console.log('✅ [SYNC] updateAlmacenCantidad() FINALIZADO');
  }

  /**
   * Suscribe un callback a los cambios del almacén y camas.
   */
  subscribe(callback) {
    console.log('📎 [SYNC] subscribe() INICIADO');
    this.listeners.push(callback);
    console.log('📊 [SYNC] listeners ahora:', this.listeners.length);
    callback(this.remoteState);
    console.log('✅ [SYNC] subscribe() FINALIZADO');
  }

  notifyListeners() {
    console.log('📢 [SYNC] notifyListeners() INICIADO, listeners:', this.listeners.length);
    this.listeners.forEach(cb => {
      try {
        cb(this.remoteState);
      } catch (e) {
        console.error('❌ [SYNC] Error en listener:', e);
      }
    });
    console.log('✅ [SYNC] notifyListeners() FINALIZADO');
  }
}

export const sync = new SyncService();