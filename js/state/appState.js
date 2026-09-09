// @ts-nocheck
/**
 * js/state/appState.js - Gestor de Estado Central (Reactivo)
 * Mantiene el estado en memoria y coordina la persistencia dual.
 */

import { ESTRUCTURA_CAMAS } from '../config/estructuraCamas.js';
import { getFranjasOrdenadas, getFranjaActualId, TIMEOUT_SELECCION_FRANJA_MS } from '../config/franjas.js';
import { getCurrentUser } from '../services/auth.js';
import { storage } from '../services/storage.js';
import { sync } from '../services/sync.js';

class AppState {
  constructor() {
  console.log('🚀 [APPSTATE] Constructor INICIADO');
  
  // 🔥 NUEVO: Flags para controlar la sincronización inicial
  this._initialSyncDone = false;
  this._pendingState = null;
  
  const prefs = storage.getPreferencias() || {};
  const defaultView = prefs.defaultView || 'unidades';
  console.log('📊 [APPSTATE] prefs cargadas:', { defaultView });
  
  let initialActiveUnits = ['amarilla'];
  if (defaultView === 'periodos' && Array.isArray(prefs.defaultUnitsPeriodos)) {
    initialActiveUnits = prefs.defaultUnitsPeriodos;
  } else if (defaultView === 'unidades' && Array.isArray(prefs.defaultUnitsUnidades)) {
    initialActiveUnits = prefs.defaultUnitsUnidades;
  }
  console.log('📊 [APPSTATE] initialActiveUnits:', initialActiveUnits);

  this.state = {
    currentUser: getCurrentUser(),
    currentView: defaultView,
    activeUnits: initialActiveUnits,
    unidadActual: null,
    franjaActual: null,
    franjaSeleccionadaId: null,
    franjaSeleccionadaTimestamp: null,
    expandedUnitId: null,
    camas: this.cargarCamasIniciales(),
    tareasExtra: storage.getExtraTasks(),
    // 🔧 FIX: antes era `checklist: {}`. Como appState.initSession() nunca se invoca
    // desde app.js, el checklist jamás se rehidrataba desde localStorage tras un
    // reinicio de página (p.ej. al cambiar de sesión), y las tareas marcadas como
    // realizadas volvían a aparecer como pendientes. Cargamos aquí, en el arranque,
    // el mismo blob que toggleChecklist() ya usa para guardar (claves 'global'/'periodo_view').
    checklist: storage.getChecklist('global', 'periodo_view'),
    almacen: {},
    filtros: {
      esPacienteCelador: false,
      atributos: {},
      operador: 'O',
      rutinas: {
        levantar: null,
        acostar: null
      }
    },
    expandedTareas: {}
  };
  console.log('📊 [APPSTATE] state inicializado, camas.length:', this.state.camas.length);
  console.log('📊 [APPSTATE] checklist keys:', Object.keys(this.state.checklist || {}).length);
  
  /** @type {Set<Function>} */
  this.subscribers = new Set();
  console.log('📊 [APPSTATE] subscribers inicializado');

  if (sync && typeof sync.subscribe === 'function') {
    console.log('📎 [APPSTATE] Suscribiendo a sync...');
    sync.subscribe(() => {
      console.log('🔄 [APPSTATE] Notificación recibida de sync');
      this.syncRemoteState();
    });
    console.log('✅ [APPSTATE] Suscripción a sync completada');
  } else {
    console.warn('⚠️ [APPSTATE] sync no disponible en el constructor');
    setTimeout(() => {
      if (sync && typeof sync.subscribe === 'function') {
        sync.subscribe(() => {
          this.syncRemoteState();
        });
        console.log('✅ [APPSTATE] sync suscrito después del retraso');
      }
    }, 100);
  }
  
  console.log('✅ [APPSTATE] Constructor FINALIZADO');
  }

  cargarCamasIniciales() {
    console.log('🔧 [APPSTATE] cargarCamasIniciales() INICIADO');
    const listaCamas = [];

    Object.entries(ESTRUCTURA_CAMAS).forEach(([unidadId, habitaciones]) => {
      habitaciones.forEach((/** @type {any} */ hab) => {
        hab.camas.forEach((/** @type {string} */ camaId) => {
          listaCamas.push({
            id: camaId,
            unidadId: unidadId,
            esPacienteCelador: false,
            tieneCambiosRecientes: false,
            isExpanded: false,
            atributos: {},
            rutinas: {},
            ultimaModificacion: null
          });
        });
      });
    });
    
    console.log('✅ [APPSTATE] cargarCamasIniciales() FINALIZADO, total:', listaCamas.length);
    return listaCamas;
  }

  syncRemoteState() {
    console.log('🔄 [APPSTATE] syncRemoteState() INICIADO');
    const remoteCamas = sync.remoteState ? sync.remoteState.camas : {};
    console.log('📊 [APPSTATE] remoteCamas keys:', Object.keys(remoteCamas));

    this.state.camas = this.state.camas.map(cama => {
      const remoteUnit = remoteCamas[cama.unidadId] || {};
      const remoteCamaData = remoteUnit[cama.id];

      if (remoteCamaData) {
        const { updatedAt, ultimaModificacion, ...datosRemotos } = remoteCamaData;
        
        const rutinasRemotas = datosRemotos.rutinas ? { ...datosRemotos.rutinas } : {};
        Object.keys(rutinasRemotas).forEach(key => {
          if (rutinasRemotas[key] === 'nada') delete rutinasRemotas[key];
        });

        return {
          id: cama.id,
          unidadId: cama.unidadId,
          esPacienteCelador: datosRemotos.esPacienteCelador ?? false,
          tieneCambiosRecientes: datosRemotos.tieneCambiosRecientes ?? false,
          isExpanded: false,
          atributos: datosRemotos.atributos || {},
          rutinas: rutinasRemotas,
          ultimaModificacion: ultimaModificacion || cama.ultimaModificacion
        };
      }
      return cama;
    });
    console.log('📊 [APPSTATE] syncRemoteState: camas actualizadas, total:', this.state.camas.length);

    if (sync.remoteState && sync.remoteState.tareasExtra) {
      console.log('📊 [APPSTATE] syncRemoteState: actualizando tareasExtra desde sync');
      this.actualizarTareasExtra(sync.remoteState.tareasExtra);
    } else {
      console.log('📊 [APPSTATE] syncRemoteState: cargando tareasExtra desde storage');
      this.state.tareasExtra = storage.getExtraTasks();
    }

    if (sync.remoteState && sync.remoteState.almacen) {
      console.log('📊 [APPSTATE] syncRemoteState: actualizando almacen desde sync');
      this.state.almacen = sync.getAlmacenMatriz();
    }

    // 🔥 NUEVO: Guardar el estado y marcar que ya hay datos
    this._initialSyncDone = true;
    this._pendingState = { ...this.state };
    console.log('✅ [APPSTATE] syncRemoteState() FINALIZADO, _initialSyncDone = true');
    this.notify('SYNC_UPDATED', this.state);
  }

  // 🔧 FIX: recarga el checklist de tareas rutinarias desde localStorage usando
  // el usuario ACTUALMENTE autenticado. Es necesario porque appState es un
  // singleton que se construye una única vez al cargar los módulos JS (incluso
  // antes de hacer login tras un logout+reload), así que el checklist cargado
  // en el constructor puede corresponder a un usuario distinto (o "anonimo").
  // Debe llamarse explícitamente justo después de que la sesión quede confirmada.
  reloadChecklist() {
    console.log('🔄 [APPSTATE] reloadChecklist() INICIADO');
    this.state.checklist = storage.getChecklist('global', 'periodo_view');
    console.log('📊 [APPSTATE] checklist recargado, keys:', Object.keys(this.state.checklist || {}).length);
    this.notify('CHECKLIST_UPDATED', this.state.checklist);
    console.log('✅ [APPSTATE] reloadChecklist() FINALIZADO');
  }

  reloadPreferences() {
  console.log('🔄 [APPSTATE] reloadPreferences() INICIADO');
  const prefs = storage.getPreferencias() || {};
  console.log('📊 [APPSTATE] Preferencias recargadas:', prefs);
  // No hacemos nada más, solo recargar
  console.log('✅ [APPSTATE] reloadPreferences() FINALIZADO');
  }
  
  actualizarTareasExtra(tareas) {
    console.log('🔄 [APPSTATE] actualizarTareasExtra() INICIADO, tareas.length:', tareas?.length || 0);
    this.state.tareasExtra = tareas || [];
    this.notify('TAREAS_EXTRA_UPDATED', this.state.tareasExtra);
    console.log('✅ [APPSTATE] actualizarTareasExtra() FINALIZADO');
  }

  actualizarAlmacen(matrizAlmacen) {
    console.log('🔄 [APPSTATE] actualizarAlmacen() INICIADO');
    this.state.almacen = matrizAlmacen || {};
    this.notify('ALMACEN_UPDATED', this.state.almacen);
    console.log('✅ [APPSTATE] actualizarAlmacen() FINALIZADO');
  }

    getState() {
    return this.state;
  }

  getCurrentUser() {
    const user = this.state.currentUser || getCurrentUser();
    console.log('🔍 [APPSTATE] getCurrentUser():', user ? user.id : 'null');
    return user;
  }

  getCurrentUserId() {
    const id = this.getCurrentUser().id;
    console.log('🔍 [APPSTATE] getCurrentUserId():', id);
    return id;
  }

  setCurrentView(newView) {
    console.log('🔄 [APPSTATE] setCurrentView() INICIADO, newView:', newView);
    if (this.state.currentView !== newView) {
      this.state.currentView = newView;
      const prefs = storage.getPreferencias() || {};
      if (newView === 'periodos' && Array.isArray(prefs.defaultUnitsPeriodos)) {
        this.state.activeUnits = [...prefs.defaultUnitsPeriodos];
      } else if (newView === 'unidades' && Array.isArray(prefs.defaultUnitsUnidades)) {
        this.state.activeUnits = [...prefs.defaultUnitsUnidades];
      }
      console.log('📊 [APPSTATE] activeUnits actualizados:', this.state.activeUnits);
      this.notify('VIEW_CHANGED', this.state.currentView);
    }
    console.log('✅ [APPSTATE] setCurrentView() FINALIZADO');
  }

updatePreferencias(nuevasPreferencias) {
  console.log('🔄 [APPSTATE] updatePreferencias() INICIADO');
  storage.savePreferencias(nuevasPreferencias);
  const prefs = nuevasPreferencias;
  if (this.state.currentView === 'periodos' && Array.isArray(prefs.defaultUnitsPeriodos)) {
    this.state.activeUnits = [...prefs.defaultUnitsPeriodos];
  } else if (this.state.currentView === 'unidades' && Array.isArray(prefs.defaultUnitsUnidades)) {
    this.state.activeUnits = [...prefs.defaultUnitsUnidades];
  }
  console.log('📊 [APPSTATE] Preferencias actualizadas, activeUnits:', this.state.activeUnits);
  this.notify('PREFERENCES_UPDATED', this.state);
  console.log('✅ [APPSTATE] updatePreferencias() FINALIZADO');
}

setFranjaSeleccionada(franjaId) {
  console.log('🔄 [APPSTATE] setFranjaSeleccionada() INICIADO, franjaId:', franjaId);
  this.state.franjaSeleccionadaId = franjaId;
  this.state.franjaSeleccionadaTimestamp = Date.now();
  console.log('✅ [APPSTATE] setFranjaSeleccionada() FINALIZADO');
}

getFranjaEfectivaId() {
  const now = Date.now();
  const { franjaSeleccionadaId, franjaSeleccionadaTimestamp } = this.state;

  if (
    franjaSeleccionadaId &&
    franjaSeleccionadaTimestamp &&
    (now - franjaSeleccionadaTimestamp < TIMEOUT_SELECCION_FRANJA_MS)
  ) {
    console.log('🔍 [APPSTATE] getFranjaEfectivaId() -> seleccionada:', franjaSeleccionadaId);
    return franjaSeleccionadaId;
  }

  // No se graba el resultado en this.state: solo se devuelve. Grabarlo aquí
  // desincronizaría el estado central de lo que realmente hay en pantalla
  // cuando el repintado que sigue a esta llamada es acotado a una sola franja
  // (en vez de a las 7), como ocurre desde la optimización de rendimiento de
  // la Vista por Jornada. No devolver un valor distinto en ningún caso: si el
  // timeout ya expiró, la siguiente llamada volverá a calcular lo mismo.
  const actualId = getFranjaActualId();
  console.log('🔍 [APPSTATE] getFranjaEfectivaId() -> actual:', actualId);
  return actualId;
}

toggleActiveUnit(unitId) {
  console.log('🔄 [APPSTATE] toggleActiveUnit() INICIADO, unitId:', unitId);
  if (this.state.activeUnits.includes(unitId)) {
    this.state.activeUnits = this.state.activeUnits.filter(u => u !== unitId);
  } else {
    this.state.activeUnits.push(unitId);
  }
  console.log('📊 [APPSTATE] activeUnits ahora:', this.state.activeUnits);
  this.notify('UNITS_CHANGED', this.state.activeUnits);
  console.log('✅ [APPSTATE] toggleActiveUnit() FINALIZADO');
}

setFiltros(nuevosFiltros) {
  console.log('🔄 [APPSTATE] setFiltros() INICIADO');
  this.state.filtros = {
    ...this.state.filtros,
    ...nuevosFiltros
  };
  console.log('📊 [APPSTATE] filtros actualizados:', this.state.filtros);
  if (this.hasActiveFilters()) {
    console.log('📊 [APPSTATE] Hay filtros activos, reseteando camas expandidas');
    this.resetCamasExpanded();
  }
  this.notify('FILTROS_CHANGED', this.state.filtros);
  console.log('✅ [APPSTATE] setFiltros() FINALIZADO');
}

limpiarFiltros() {
  console.log('🔄 [APPSTATE] limpiarFiltros() INICIADO');
  this.state.filtros = {
    esPacienteCelador: false,
    atributos: {},
    operador: 'O',
    rutinas: {
      levantar: null,
      acostar: null
    }
  };
  this.notify('FILTROS_CHANGED', this.state.filtros);
  console.log('✅ [APPSTATE] limpiarFiltros() FINALIZADO');
}

hasActiveFilters() {
  const { filtros } = this.state;
  if (!filtros) return false;
  
  if (filtros.esPacienteCelador) return true;
  
  const hasActiveAttrs = Object.values(filtros.atributos || {}).some(v => v === true);
  if (hasActiveAttrs) return true;
  
  if (filtros.rutinas?.levantar || filtros.rutinas?.acostar) return true;
  
  return false;
}

resetCamasExpanded() {
  console.log('🔄 [APPSTATE] resetCamasExpanded() INICIADO');
  this.state.camas.forEach(cama => {
    cama.isExpanded = false;
  });
  this.notify('CAMAS_RESET', this.state.camas);
  console.log('✅ [APPSTATE] resetCamasExpanded() FINALIZADO');
}

setTareaExpanded(key, isExpanded) {
  console.log('🔄 [APPSTATE] setTareaExpanded() INICIADO, key:', key, 'isExpanded:', isExpanded);
  this.state.expandedTareas[key] = isExpanded;
  this.notify('TAREA_EXPANDED', { key, isExpanded });
  console.log('✅ [APPSTATE] setTareaExpanded() FINALIZADO');
}

getTareaExpanded(key) {
  const expanded = this.state.expandedTareas[key] || false;
  console.log('🔍 [APPSTATE] getTareaExpanded() key:', key, '->', expanded);
  return expanded;
}

getFilteredCamas() {
  console.log('🔄 [APPSTATE] getFilteredCamas() INICIADO');
  const { camas, activeUnits, filtros } = this.state;

  let result = activeUnits.length > 0
    ? camas.filter(cama => activeUnits.includes(cama.unidadId))
    : camas;
  console.log('📊 [APPSTATE] getFilteredCamas: after activeUnits filter, result.length:', result.length);

  if (!filtros) {
    console.log('📊 [APPSTATE] getFilteredCamas: sin filtros, devolviendo', result.length);
    return result;
  }

  const activeAttrs = Object.keys(filtros.atributos || {}).filter(k => Boolean(filtros.atributos[k]));
  const hasPacienteCelador = Boolean(filtros.esPacienteCelador);
  const activeRutinaLevantar = filtros.rutinas?.levantar || null;
  const activeRutinaAcostar = filtros.rutinas?.acostar || null;

  console.log('📊 [APPSTATE] getFilteredCamas: activeAttrs:', activeAttrs, 'hasPacienteCelador:', hasPacienteCelador);

  if (!hasPacienteCelador && activeAttrs.length === 0 && !activeRutinaLevantar && !activeRutinaAcostar) {
    console.log('📊 [APPSTATE] getFilteredCamas: sin filtros activos, devolviendo', result.length);
    return result;
  }

  const filtered = result.filter(cama => {
    const matchesCelador = hasPacienteCelador && Boolean(cama.esPacienteCelador);
    const matchesAttrs = activeAttrs.map(attr => Boolean(cama.atributos && cama.atributos[attr]));
    const matchesLevantar = Boolean(activeRutinaLevantar && cama.rutinas && cama.rutinas[activeRutinaLevantar] === 'levantar');
    const matchesAcostar = Boolean(activeRutinaAcostar && cama.rutinas && cama.rutinas[activeRutinaAcostar] === 'acostar');

    if (filtros.operador === 'Y') {
      if (hasPacienteCelador && !matchesCelador) return false;
      if (activeRutinaLevantar && !matchesLevantar) return false;
      if (activeRutinaAcostar && !matchesAcostar) return false;
      return matchesAttrs.every(match => match === true);
    } else {
      if (hasPacienteCelador && matchesCelador) return true;
      if (activeRutinaLevantar && matchesLevantar) return true;
      if (activeRutinaAcostar && matchesAcostar) return true;
      return matchesAttrs.some(match => match === true);
    }
  });
  
  console.log('📊 [APPSTATE] getFilteredCamas: filtrado final, filtered.length:', filtered.length);
  console.log('✅ [APPSTATE] getFilteredCamas() FINALIZADO');
  return filtered;
}

addTareaExtra(tarea) {
  console.log('🔄 [APPSTATE] addTareaExtra() INICIADO');
  const nuevaTarea = storage.addExtraTask(tarea);
  // 🔥 ACTUALIZACIÓN INMEDIATA: Añadimos la tarea al estado para que se pinte al instante
  if (!this.state.tareasExtra) this.state.tareasExtra = [];
  this.state.tareasExtra = [...this.state.tareasExtra, nuevaTarea];
  console.log('📊 [APPSTATE] Tarea extra añadida, total:', this.state.tareasExtra.length);
  this.notify('TAREA_EXTRA_ADDED', nuevaTarea);
  console.log('✅ [APPSTATE] addTareaExtra() FINALIZADO');
  return nuevaTarea;
}

deleteTareaExtra(id) {
  console.log('🔄 [APPSTATE] deleteTareaExtra() INICIADO, id:', id);
  this.state.tareasExtra = storage.deleteExtraTask(id);
  console.log('📊 [APPSTATE] Tarea extra eliminada, total:', this.state.tareasExtra.length);
  this.notify('TAREA_EXTRA_DELETED', id);
  console.log('✅ [APPSTATE] deleteTareaExtra() FINALIZADO');
}

// 🔧 FIX: método nuevo. tareasExtraModal.js editaba una tarea escribiendo
// directamente en storage.js (storage.getExtraTasks() + storage.saveTareasExtra()),
// sin pasar nunca por appState. Esto dejaba this.state.tareasExtra desactualizado
// en memoria, igual que ocurría con la creación de tareas. Este método centraliza
// la edición aquí, actualiza el estado reactivo y notifica a los suscriptores
// (periodoView.js ya escucha 'TAREAS_EXTRA_UPDATED').
editarTareaExtra(id, datosActualizados) {
  console.log('🔄 [APPSTATE] editarTareaExtra() INICIADO, id:', id);
  const tareas = storage.getExtraTasks();
  const index = tareas.findIndex(t => t.id === id);
  if (index === -1) {
    console.warn('⚠️ [APPSTATE] editarTareaExtra: tarea no encontrada:', id);
    return null;
  }

  const tareaActualizada = { ...tareas[index], ...datosActualizados };
  tareas[index] = tareaActualizada;
  storage.saveTareasExtra(tareas);

  if (sync && sync.syncTareaExtra) {
    sync.syncTareaExtra(tareaActualizada);
  }

  // Actualización inmediata del estado reactivo en memoria
  this.state.tareasExtra = this.state.tareasExtra.map(t => (t.id === id ? tareaActualizada : t));
  console.log('📊 [APPSTATE] Tarea extra editada, total:', this.state.tareasExtra.length);
  this.notify('TAREAS_EXTRA_UPDATED', this.state.tareasExtra);
  console.log('✅ [APPSTATE] editarTareaExtra() FINALIZADO');
  return tareaActualizada;
}

toggleChecklist(key, completada) {
console.log('🔄 [APPSTATE] toggleChecklist() INICIADO, key:', key, 'completada:', completada);
if (!this.state.checklist) this.state.checklist = {};
this.state.checklist[key] = completada;

if (key.startsWith('extra_')) {
  const extraId = key.replace('extra_', '');
  this.state.tareasExtra = storage.toggleExtraTask(extraId, completada);
}

// 🔥 FIX DEFINITIVO: Guardar SIEMPRE con las claves 'global' y 'periodo_view'
storage.saveChecklist('global', 'periodo_view', this.state.checklist);
this.notify('CHECKLIST_UPDATED', { key, completada });
console.log('✅ [APPSTATE] toggleChecklist() FINALIZADO');
}

getTareasExtra = () => {
  console.log('🔍 [APPSTATE] getTareasExtra() llamado');
  this.state.tareasExtra = storage.getExtraTasks();
  console.log('📊 [APPSTATE] getTareasExtra: devolviendo', this.state.tareasExtra.length);
  return this.state.tareasExtra;
}

subscribe(listener) {
  console.log('📎 [APPSTATE] subscribe() INICIADO');
  this.subscribers.add(listener);
  console.log('📊 [APPSTATE] subscribers ahora:', this.subscribers.size);
  
  // 🔥 NUEVO: Si ya hay datos iniciales, notificar inmediatamente al nuevo listener
  if (this._initialSyncDone && this._pendingState) {
    console.log('🔄 [APPSTATE] Datos ya disponibles, notificando al nuevo listener...');
    try {
      listener('SYNC_UPDATED', null, this._pendingState);
    } catch (e) {
      console.error('❌ [APPSTATE] Error notificando al nuevo listener:', e);
    }
  }
  
  return () => {
    console.log('📎 [APPSTATE] unsubscribe() llamado');
    this.subscribers.delete(listener);
  };
}

notify(event, payload) {
  console.log('📢 [APPSTATE] notify() INICIADO, event:', event);
  console.log('📊 [APPSTATE] subscribers:', this.subscribers.size);
  this.subscribers.forEach(listener => {
    try {
      listener(event, payload, this.state);
    } catch (e) {
      console.error('❌ [APPSTATE] Error en listener:', e);
    }
  });
  console.log('✅ [APPSTATE] notify() FINALIZADO');
}

  initSession(unidadId, franjaId) {
    console.log('🔄 [APPSTATE] initSession() INICIADO, unidadId:', unidadId, 'franjaId:', franjaId);
    this.state.unidadActual = unidadId;
    this.state.franjaActual = franjaId;
    this.state.franjaSeleccionadaId = franjaId;
    this.state.franjaSeleccionadaTimestamp = Date.now();

    // 🔥 CORRECCIÓN: Cargar usando las claves de la sesión actual
    this.state.checklist = storage.getChecklist(unidadId, franjaId);
    this.state.almacen = sync.getAlmacen(unidadId);

    this.notify('SESSION_INIT', this.state);
    console.log('✅ [APPSTATE] initSession() FINALIZADO');
  }

      updateCama(camaId, atributo, valor) {
    console.log('🔄 [APPSTATE] updateCama() INICIADO, camaId:', camaId, 'atributo:', atributo, 'valor:', valor);
    const camaTarget = this.state.camas.find(c => c.id === camaId);
    if (camaTarget) {
      if (!camaTarget.atributos) camaTarget.atributos = {};
      const valorAnterior = camaTarget.atributos[atributo];
      camaTarget.atributos[atributo] = valor;

      const now = new Date();
      const userObj = this.getCurrentUser();
      const usuario = typeof userObj === 'object' ? (userObj.nombre || userObj.id || 'Celador') : (userObj || 'Celador');

      const ultimaModificacion = {
        usuario,
        fecha: now.toLocaleDateString('es-ES'),
        hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        campo: `atributos.${atributo}`,
        valorAnterior: valorAnterior !== undefined ? valorAnterior : null,
        valorNuevo: valor,
        timestamp: now.getTime()
      };

      camaTarget.ultimaModificacion = ultimaModificacion;

      sync.updateCamaAttribute(camaTarget.unidadId, camaId, atributo, valor, ultimaModificacion);
      this.notify('CAMA_UPDATED', { camaId, atributo, valor });
      console.log('✅ [APPSTATE] updateCama() FINALIZADO');
    } else {
      console.warn('⚠️ [APPSTATE] updateCama: cama no encontrada:', camaId);
    }
  }

  setExpandedUnit(unitId) {
    console.log('🔄 [APPSTATE] setExpandedUnit() INICIADO, unitId:', unitId);
    this.state.expandedUnitId = unitId;
    this.notify('EXPANDED_UNIT_CHANGED', unitId);
    console.log('✅ [APPSTATE] setExpandedUnit() FINALIZADO');
  }

  saveCamaCompleta(camaActualizada) {
    console.log('🔄 [APPSTATE] saveCamaCompleta() INICIADO, camaId:', camaActualizada.id);
    const index = this.state.camas.findIndex(c => c.id === camaActualizada.id);
    if (index !== -1) {
      const camaPrevia = this.state.camas[index];
      const rutinasLimpias = {};
      if (camaActualizada.rutinas) {
        Object.entries(camaActualizada.rutinas).forEach(([fId, acc]) => {
          if (acc && acc !== 'nada') {
            rutinasLimpias[fId] = acc;
          }
        });
      }

      let cambios = [];

      if (camaPrevia.esPacienteCelador !== camaActualizada.esPacienteCelador) {
        const accion = camaActualizada.esPacienteCelador ? 'se añadió' : 'se eliminó';
        cambios.push(`${accion} el paciente de celador`);
      }

      const attrsPrev = camaPrevia.atributos || {};
      const attrsNew = camaActualizada.atributos || {};
      
      for (const [key, val] of Object.entries(attrsNew)) {
        if (val && !attrsPrev[key]) {
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          cambios.push(`se añadió el atributo ${label}`);
        }
      }
      for (const [key, val] of Object.entries(attrsPrev)) {
        if (val && !attrsNew[key]) {
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          cambios.push(`se eliminó el atributo ${label}`);
        }
      }

      const rutPrev = camaPrevia.rutinas || {};
      const rutNew = rutinasLimpias;
      const franjasConfig = getFranjasOrdenadas();
      const nombreFranja = (id) => {
        const f = franjasConfig.find(fr => fr.id === id);
        return f ? f.nombre : id;
      };

      for (const [fId, acc] of Object.entries(rutNew)) {
        if (acc && !rutPrev[fId]) {
          const franja = nombreFranja(fId);
          cambios.push(`se añadió la rutina de ${acc} en ${franja}`);
        }
      }
      for (const [fId, acc] of Object.entries(rutPrev)) {
        if (acc && !rutNew[fId]) {
          const franja = nombreFranja(fId);
          cambios.push(`se eliminó la rutina de ${acc} en ${franja}`);
        }
      }

      if (cambios.length === 0) {
        console.log('⚠️ [APPSTATE] saveCamaCompleta: sin cambios, finalizando');
        return;
      }

      let textoCambios = '';
      if (cambios.length === 1) {
        textoCambios = cambios[0];
      } else if (cambios.length === 2) {
        textoCambios = cambios.join(' y ');
      } else {
        const ultimo = cambios.pop();
        textoCambios = cambios.join(', ') + ' y ' + ultimo;
      }
      console.log('📊 [APPSTATE] saveCamaCompleta: cambios:', textoCambios);

      const camaNueva = {
        ...camaPrevia,
        esPacienteCelador: camaActualizada.esPacienteCelador,
        atributos: camaActualizada.atributos || {},
        rutinas: rutinasLimpias,
        isExpanded: false
      };

      this.state.camas[index] = camaNueva;

      const now = new Date();
      const userObj = this.getCurrentUser();
      const usuario = typeof userObj === 'object' ? (userObj.nombre || userObj.id || 'Celador') : (userObj || 'Celador');

      const ultimaModificacion = {
        usuario,
        fecha: now.toLocaleDateString('es-ES'),
        hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        campo: textoCambios,
        valorAnterior: null,
        valorNuevo: null,
        timestamp: now.getTime()
      };

      camaNueva.ultimaModificacion = ultimaModificacion;
      sync.updateCamaCompleta(camaNueva.unidadId, camaNueva.id, camaNueva, ultimaModificacion);

      this.notify('CAMA_UPDATED', camaNueva);
      this.notify('TAREAS_RECALCULATE', { camaId: camaNueva.id });
      console.log('✅ [APPSTATE] saveCamaCompleta() FINALIZADO');
    } else {
      console.warn('⚠️ [APPSTATE] saveCamaCompleta: cama no encontrada:', camaActualizada.id);
    }
  }

  vaciarCama(unidadId, camaId) {
    console.log('🔄 [APPSTATE] vaciarCama() INICIADO, unidadId:', unidadId, 'camaId:', camaId);
    const index = this.state.camas.findIndex(c => c.id === camaId && c.unidadId === unidadId);
    if (index !== -1) {
      const now = new Date();
      const userObj = this.getCurrentUser();
      const usuario = typeof userObj === 'object' ? (userObj.nombre || userObj.id || 'Celador') : (userObj || 'Celador');

      const ultimaModificacion = {
        usuario,
        fecha: now.toLocaleDateString('es-ES'),
        hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        campo: 'vaciar',
        valorAnterior: null,
        valorNuevo: null,
        timestamp: now.getTime()
      };

      this.state.camas[index] = {
        id: camaId,
        unidadId: unidadId,
        esPacienteCelador: false,
        tieneCambiosRecientes: false,
        isExpanded: false,
        atributos: {},
        rutinas: {},
        ultimaModificacion: ultimaModificacion
      };

      sync.vaciarCama(unidadId, camaId, ultimaModificacion);
      this.notify('CAMA_UPDATED', this.state.camas[index]);
      this.notify('TAREAS_RECALCULATE', { camaId });
      console.log('✅ [APPSTATE] vaciarCama() FINALIZADO');
    } else {
      console.warn('⚠️ [APPSTATE] vaciarCama: cama no encontrada:', camaId);
    }
  }

  estaCamaVacia(cama) {
    const sinAtributos = !cama.atributos || Object.values(cama.atributos).every(v => !v);
    const sinRutinas = !cama.rutinas || Object.keys(cama.rutinas).length === 0;
    const vacia = !cama.esPacienteCelador && sinAtributos && sinRutinas;
    console.log('🔍 [APPSTATE] estaCamaVacia() cama:', cama.id, '->', vacia);
    return vacia;
  }

  trasladarCama(unidadOrigen, camaOrigenId, unidadDestino, camaDestinoId) {
    console.log('🔄 [APPSTATE] trasladarCama() INICIADO,', { unidadOrigen, camaOrigenId, unidadDestino, camaDestinoId });
    const indexOrigen = this.state.camas.findIndex(c => c.id === camaOrigenId && c.unidadId === unidadOrigen);
    const indexDestino = this.state.camas.findIndex(c => c.id === camaDestinoId && c.unidadId === unidadDestino);
    if (indexOrigen === -1 || indexDestino === -1) {
      console.warn('⚠️ [APPSTATE] trasladarCama: una de las camas no fue encontrada');
      return;
    }

    const camaOrigen = this.state.camas[indexOrigen];
    const camaDestino = this.state.camas[indexDestino];
    const destinoVacio = this.estaCamaVacia(camaDestino);

    const now = new Date();
    const userObj = this.getCurrentUser();
    const usuario = typeof userObj === 'object' ? (userObj.nombre || userObj.id || 'Celador') : (userObj || 'Celador');
    const fecha = now.toLocaleDateString('es-ES');
    const hora = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const timestamp = now.getTime();

    const crearRegistro = (/** @type {any} */ valorNuevo) => ({
      usuario, fecha, hora, campo: 'traslado', valorAnterior: null, valorNuevo, timestamp
    });

    if (destinoVacio) {
      console.log('📊 [APPSTATE] trasladarCama: destino vacío, moviendo datos');
      const nuevaCamaDestino = {
        ...camaDestino,
        esPacienteCelador: camaOrigen.esPacienteCelador,
        atributos: { ...(camaOrigen.atributos || {}) },
        rutinas: { ...(camaOrigen.rutinas || {}) },
        isExpanded: false,
        ultimaModificacion: crearRegistro({ trasladoDesde: camaOrigenId })
      };

      const nuevaCamaOrigen = {
        id: camaOrigenId,
        unidadId: unidadOrigen,
        esPacienteCelador: false,
        tieneCambiosRecientes: false,
        isExpanded: false,
        atributos: {},
        rutinas: {},
        ultimaModificacion: crearRegistro({ trasladoHacia: camaDestinoId })
      };

      this.state.camas[indexDestino] = nuevaCamaDestino;
      this.state.camas[indexOrigen] = nuevaCamaOrigen;

      sync.updateCamaCompleta(unidadDestino, camaDestinoId, nuevaCamaDestino);
      sync.updateCamaCompleta(unidadOrigen, camaOrigenId, nuevaCamaOrigen);
      
      this.notify('CAMA_UPDATED', { camaOrigenId, camaDestinoId });
      this.notify('TAREAS_RECALCULATE', { camaOrigenId, camaDestinoId });
    } else {
      console.log('📊 [APPSTATE] trasladarCama: destino ocupado, intercambiando datos');
      const datosOrigen = {
        esPacienteCelador: camaOrigen.esPacienteCelador,
        atributos: { ...(camaOrigen.atributos || {}) },
        rutinas: { ...(camaOrigen.rutinas || {}) }
      };
      const datosDestino = {
        esPacienteCelador: camaDestino.esPacienteCelador,
        atributos: { ...(camaDestino.atributos || {}) },
        rutinas: { ...(camaDestino.rutinas || {}) }
      };

      const nuevaCamaOrigen = {
        ...camaOrigen,
        ...datosDestino,
        isExpanded: false,
        ultimaModificacion: crearRegistro({ intercambioCon: camaDestinoId })
      };
      const nuevaCamaDestino = {
        ...camaDestino,
        ...datosOrigen,
        isExpanded: false,
        ultimaModificacion: crearRegistro({ intercambioCon: camaOrigenId })
      };

      this.state.camas[indexOrigen] = nuevaCamaOrigen;
      this.state.camas[indexDestino] = nuevaCamaDestino;

      sync.updateCamaCompleta(unidadOrigen, camaOrigenId, nuevaCamaOrigen);
      sync.updateCamaCompleta(unidadDestino, camaDestinoId, nuevaCamaDestino);

      this.notify('CAMA_UPDATED', { camaOrigenId, camaDestinoId });
      this.notify('TAREAS_RECALCULATE', { camaOrigenId, camaDestinoId });
    }
    console.log('✅ [APPSTATE] trasladarCama() FINALIZADO');
  }

  evaluarCaducidadIndicadores() {
    console.log('🔄 [APPSTATE] evaluarCaducidadIndicadores() INICIADO');
    let actualizado = false;

    this.state.camas = this.state.camas.map(cama => {
      if (cama.ultimaModificacion && cama.ultimaModificacion.timestamp) {
        const esReciente = storage.hasUnreadChanges(cama.id, cama.ultimaModificacion.timestamp);
        if (cama.tieneCambiosRecientes !== esReciente) {
          actualizado = true;
          return { ...cama, tieneCambiosRecientes: esReciente };
        }
      } else if (cama.tieneCambiosRecientes) {
        actualizado = true;
        return { ...cama, tieneCambiosRecientes: false };
      }
      return cama;
    });

    if (actualizado) {
      console.log('📊 [APPSTATE] evaluarCaducidadIndicadores: indicadores actualizados');
      this.notify('INDICADORES_UPDATED', this.state.camas);
    }
    console.log('✅ [APPSTATE] evaluarCaducidadIndicadores() FINALIZADO');
  }

  ejecutarReinicioDiario() {
    console.log('🔄 [APPSTATE] ejecutarReinicioDiario() INICIADO');
    storage.purgeDailyData();
    this.state.tareasExtra = [];
    this.state.checklist = {};
    this.state.expandedTareas = {};
    this.notify('REINICIO_DIARIO', this.state);
    console.log('✅ [APPSTATE] ejecutarReinicioDiario() FINALIZADO');
  }
}

export const appState = new AppState();