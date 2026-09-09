/**
 * storage.js - Persistencia Local Privada (LocalState)
 * Gestiona el checklist, tareas extraordinarias y preferencias del dispositivo.
 * Cumplimiento GDPR/LOPD: Solo almacena booleanos, arrays de claves y metadatos limpios.
 */

import { sync } from './sync.js';
import { auth } from './auth.js';

const PREFIX = 'celador_app_v1_';

export const storage = {
  /**
   * Obtiene el ID del usuario actual para crear claves privadas.
   * @returns {string}
   */
  getUserId() {
    const currentUser = auth.getCurrentUser();
    return currentUser?.id || 'anonimo';
  },

  /**
   * Guarda el estado del checklist para la unidad y franja activa.
   * 🔥 AHORA SE GUARDA POR USUARIO (Privado)
   * @param {string} unidadId
   * @param {string} franjaId
   * @param {any} data
   */
  saveChecklist(unidadId, franjaId, data) {
    // 🔥 FIX: Usar SIEMPRE las claves 'global' y 'periodo_view' (para que coincidan)
    const key = `${PREFIX}chk_${this.getUserId()}_global_periodo_view`;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error guardando checklist en localStorage:', error);
    }
  },

  getChecklist(unidadId, franjaId) {
    // 🔥 FIX: Usar SIEMPRE las claves 'global' y 'periodo_view' (para que coincidan)
    const key = `${PREFIX}chk_${this.getUserId()}_global_periodo_view`;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error leyendo checklist de localStorage:', error);
      return {};
    }
  },

  /**
   * Obtiene las tareas extraordinarias locales guardadas.
   * 🔥 AHORA SE GUARDAN POR USUARIO (Privado)
   * @returns {Array<Object>}
   */
  getExtraTasks() {
    const userId = this.getUserId();
    const key = `${PREFIX}tareas_extra_${userId}`;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error leyendo tareas extraordinarias de localStorage:', error);
      return [];
    }
  },

  /**
   * Alias de compatibilidad para obtener tareas extraordinarias.
   * @returns {Array<Object>}
   */
  getTareasExtra() {
    return this.getExtraTasks();
  },

  /**
   * Guarda el listado completo de tareas extraordinarias.
   * 🔥 AHORA SE GUARDAN POR USUARIO (Privado)
   * @param {Array<Object>} tareas
   */
  saveTareasExtra(tareas) {
    const userId = this.getUserId();
    const key = `${PREFIX}tareas_extra_${userId}`;
    try {
      localStorage.setItem(key, JSON.stringify(tareas));
    } catch (error) {
      console.error('Error guardando tareas extraordinarias en localStorage:', error);
    }
  },

  /**
   * Añade una nueva tarea extraordinaria
   */
  addExtraTask(tarea) {
    const tareas = this.getExtraTasks();
    const currentUser = auth.getCurrentUser();
    const nuevaTarea = {
      id: tarea.id || Date.now().toString(),
      tipo: tarea.tipo || tarea.accion || '',
      unidadId: tarea.unidadId || tarea.unidad || '',
      habitacionCama: tarea.habitacionCama || '',
      franjaId: tarea.franjaId || tarea.franja || '',
      completada: Boolean(tarea.completada),
      createdAt: tarea.createdAt || Date.now(),
      usuario_id: currentUser?.id || null
    };
    tareas.push(nuevaTarea);
    this.saveTareasExtra(tareas);

    if (sync && sync.syncTareaExtra) {
      sync.syncTareaExtra(nuevaTarea);
    }

    return nuevaTarea;
  },

  /**
   * Elimina una tarea extraordinaria por su ID.
   * @param {string} id
   * @returns {Array<Object>} Lista de tareas actualizada
   */
  deleteExtraTask(id) {
    const tareas = this.getExtraTasks();
    const tareaEliminada = tareas.find(t => t.id === id);
    const tareasFiltradas = tareas.filter(t => t.id !== id);
    this.saveTareasExtra(tareasFiltradas);

    // Eliminar de Supabase
    if (tareaEliminada && sync && sync.deleteTareaExtra) {
      sync.deleteTareaExtra(id);
    }

    return tareasFiltradas;
  },

  /**
   * Actualiza el estado de completado de una tarea extraordinaria por su ID.
   * @param {string} id
   * @param {boolean} completada
   * @returns {Array<Object>} Lista de tareas actualizada
   */
  toggleExtraTask(id, completada) {
    const tareas = this.getExtraTasks();
    const target = tareas.find(t => t.id === id);
    if (target) {
      target.completada = Boolean(completada);
      this.saveTareasExtra(tareas);

      // Sincronizar con Supabase
      if (sync && sync.syncTareaExtra) {
        sync.syncTareaExtra(target);
      }
    }
    return tareas;
  },

  /**
   * Guarda las preferencias generales del usuario en localStorage.
   * 🔥 AHORA SE GUARDAN POR USUARIO (Privado)
   * @param {Object} preferencias
   */
  savePreferencias(preferencias) {
    const userId = this.getUserId();
    const key = `${PREFIX}preferencias_${userId}`;
    try {
      localStorage.setItem(key, JSON.stringify(preferencias));
    } catch (error) {
      console.error('Error guardando preferencias en localStorage:', error);
    }
  },

  /**
   * Recupera las preferencias guardadas del usuario.
   * 🔥 AHORA SE RECUPERAN POR USUARIO (Privado)
   * @returns {Object}
   */
  getPreferencias() {
    const userId = this.getUserId();
    const key = `${PREFIX}preferencias_${userId}`;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error leyendo preferencias de localStorage:', error);
      return {};
    }
  },

  /**
   * Elimina registros de turnos pasados para mantener limpio el dispositivo.
   * @param {string} unidadId
   * @param {string} franjaId
   */
  clearSession(unidadId, franjaId) {
    const userId = this.getUserId();
    const key = `${PREFIX}chk_${userId}_${unidadId}_${franjaId}`;
    localStorage.removeItem(key);
  },

  /**
   * Purga del checklist local únicamente las claves de rutinas obsoletas/modificadas de una cama.
   * Preserva el historial de tareas completadas cuyos esquemas de rutina no han cambiado.
   * @param {string} unidadId
   * @param {string} franjaId
   * @param {string} camaId
   * @param {Object} [rutinas] - Rutinas vigentes de la cama ({ franjaId: accion })
   */
  removeObsoleteKeys(unidadId, franjaId, camaId, rutinas = {}) {
    if (!unidadId || !franjaId || !camaId) return;
    const checklist = this.getChecklist(unidadId, franjaId);
    let modificado = false;

    const clavesValidas = new Set();
    if (rutinas && typeof rutinas === 'object') {
      Object.entries(rutinas).forEach(([fId, accion]) => {
        if (accion && accion !== 'nada') {
          clavesValidas.add(`${camaId}_${fId}_${accion}`);
        }
      });
    }

    Object.keys(checklist).forEach(key => {
      if (key.startsWith(`${camaId}_`)) {
        if (!clavesValidas.has(key)) {
          delete checklist[key];
          modificado = true;
        }
      }
    });

    if (modificado) {
      this.saveChecklist(unidadId, franjaId, checklist);
    }
  },

  /**
   * Marca una cama como vista localmente guardando el timestamp de consulta.
   * @param {string} camaId
   * @param {number} [timestamp]
   */
  markCamaAsViewed(camaId, timestamp = Date.now()) {
    if (!camaId) return;
    const key = `${PREFIX}viewed_${camaId}`;
    try {
      localStorage.setItem(key, String(timestamp));
    } catch (error) {
      console.error('Error guardando timestamp de consulta en localStorage:', error);
    }
  },

  /**
   * Obtiene el timestamp de la última vez que el usuario consultó la cama localmente.
   * @param {string} camaId
   * @returns {number}
   */
  getCamaLastViewed(camaId) {
    if (!camaId) return 0;
    const key = `${PREFIX}viewed_${camaId}`;
    try {
      const stored = localStorage.getItem(key);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch (error) {
      console.error('Error leyendo timestamp de consulta de localStorage:', error);
      return 0;
    }
  },

  /**
   * Comprueba si la cama tiene cambios no leídos localmente.
   * El indicador caduca automáticamente pasados 5 días desde la modificación,
   * independientemente de si el usuario la ha consultado o no.
   * @param {string} camaId
   * @param {number} [updatedAt] - Timestamp de la última modificación global
   * @returns {boolean}
   */
  hasUnreadChanges(camaId, updatedAt) {
    if (!camaId || !updatedAt) return false;

    const CINCO_DIAS_MS = 5 * 24 * 60 * 60 * 1000;
    if (Date.now() - updatedAt > CINCO_DIAS_MS) return false;

    const lastViewed = this.getCamaLastViewed(camaId);
    return updatedAt > lastViewed;
  },

  /**
   * Purga los datos persistentes del día anterior (checklist y tareas extraordinarias).
   * IMPORTANTE: Esta función NO borra la sesión ni la clave de la última fecha,
   * garantizando que el usuario no tenga que volver a loguearse y que las tareas
   * solo se borren cuando realmente ha pasado un día.
   */
  async purgeDailyData() {
    try {
      // Vaciar todas las tareas extraordinarias locales del usuario actual
      this.saveTareasExtra([]);

      // Limpiar los checklists del día anterior SOLO del usuario actual,
      // EXCLUYENDO la clave global unificada del checklist de la vista por períodos.
      const userId = this.getUserId();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`${PREFIX}chk_${userId}_`) && !key.endsWith('_global_periodo_view')) {
          localStorage.removeItem(key);
        }
      });

      // Purgar también en Supabase, o reaparecerán en el próximo login
      if (sync && sync.deleteAllTareasExtraUsuario) {
        await sync.deleteAllTareasExtraUsuario();
      }

      // NOTA: NO eliminamos la clave 'celador_app_v1_session' ni 'celador_app_v1_last_reset_date'
      // para mantener la sesión iniciada y que resetService no se repita.

    } catch (error) {
      console.error('Error durante la purga diaria local:', error);
    }
  },

  /**
   * Borra por completo todos los datos locales de la aplicación asociados al prefijo.
   */
  clearAllData() {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error borrando datos locales de la cuenta:', error);
    }
  }
};