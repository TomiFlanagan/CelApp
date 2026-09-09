// @ts-nocheck
/**
 * js/components/dock.js
 * Componente: Dock Inferior
 * Muestra métricas dinámicas y accesos rápidos según la vista activa (Unidades o Jornada).
 */

import { getFranjasOrdenadas, getFranjaActualId } from '../config/franjas.js';
import { storage } from '../services/storage.js';
import { appState } from '../state/appState.js';
import { openTareasExtraModal } from './modals/tareasExtraModal.js';

/* ==========================================================================
   FUNCIONES COMPARTIDAS DE ESTADÍSTICAS
   ========================================================================== */

/**
 * Calcula las estadísticas operativas de una lista de camas.
 * @param {Array<Object>} camas - Listado de objetos cama activos.
 * @returns {Object} Contadores de pacienteCelador y atributos clave.
 */
export function calcularEstadisticasUnidad(camas = []) {
  const stats = {
    pacientesCelador: 0,
    oxigeno: 0,
    sillaXL: 0,
    grua: 0,
    sillaGD: 0
  };

  camas.forEach(cama => {
    if (cama.esPacienteCelador) {
      stats.pacientesCelador++;
    }
    if (cama.atributos) {
      if (cama.atributos.oxigeno) stats.oxigeno++;
      if (cama.atributos.sillaXL) stats.sillaXL++;
      if (cama.atributos.grua) stats.grua++;
      if (cama.atributos.sillaGD) stats.sillaGD++;
    }
  });

  return stats;
}

/* ==========================================================================
   FUNCIONES ANTIGUAS (PUENTE) - PARA QUE LA APP NO SE ROMPA
   ========================================================================== */

/**
 * Renderiza el HTML del Dock Inferior para la Vista por Unidades.
 */
export function renderUnidadDock(container, handlers = {}) {
  console.log('🚀 [DOCK] renderUnidadDock() INICIADO (puente)');
  // Redirigimos a la nueva función unificada
  const state = appState.getState();
  renderDock(container, state, {
    onAlmacen: handlers.onAlmacen,
    onFiltros: handlers.onFiltros,
    onAjustes: handlers.onAjustes
  });
  console.log('✅ [DOCK] renderUnidadDock() FINALIZADO');
}

/**
 * Actualiza dinámicamente el texto del resumen métrico (Vista Unidades).
 */
export function updateUnidadDockStats(camasMostradas = []) {
  console.log('🔄 [DOCK] updateUnidadDockStats() INICIADO, camasMostradas.length:', camasMostradas.length);
  const state = appState.getState();
  updateDockStats(camasMostradas, state);
  console.log('✅ [DOCK] updateUnidadDockStats() FINALIZADO');
}

/**
 * Renderiza el HTML del Dock Inferior para la Vista por Jornada.
 */
export function renderPeriodoDock(container, handlers = {}) {
  console.log('🚀 [DOCK] renderPeriodoDock() INICIADO (puente)');
  // Redirigimos a la nueva función unificada
  const state = appState.getState();
  renderDock(container, state, {
    onExtraordinaria: handlers.onExtraordinaria,
    onAjustes: handlers.onAjustes
  });
  console.log('✅ [DOCK] renderPeriodoDock() FINALIZADO');
}

/**
 * Actualiza dinámicamente la métrica de tareas por franja (Vista Jornada).
 */
export function updatePeriodoDockStats(camasMostradas = [], periodoData = null) {
  console.log('🔄 [DOCK] updatePeriodoDockStats() INICIADO, camasMostradas.length:', camasMostradas.length);
  const state = appState.getState();
  updateDockStats(camasMostradas, state);
  console.log('✅ [DOCK] updatePeriodoDockStats() FINALIZADO');
}


/* ==========================================================================
   NUEVA FUNCIÓN UNIFICADA - LA QUE USAREMOS A PARTIR DE AHORA
   ========================================================================== */

/**
 * Calcula el resumen de tareas pendientes/completadas de una franja (Vista Jornada).
 */
function calcularEstadisticasPeriodo(camas, franjaId, checklist, activeUnits) {
  let total = 0;
  let completadas = 0;

  camas.forEach(cama => {
    const accion = cama.rutinas?.[franjaId];
    if (accion && accion !== 'nada') {
      total++;
      const taskKey = `${cama.id}_${franjaId}_${accion}`;
      if (checklist[taskKey]) completadas++;
    }
  });

  const tareasExtra = storage.getExtraTasks();
  tareasExtra.forEach(te => {
    const targetFranja = te.franjaId || te.franja;
    const targetUnidad = te.unidadId || te.unidad;
    if (targetFranja === franjaId && (activeUnits.length === 0 || !targetUnidad || activeUnits.includes(targetUnidad))) {
      total++;
      const taskKey = `extra_${te.id}`;
      if (checklist[taskKey]) completadas++;
    }
  });

  return { total, completadas };
}

/**
 * Renderizador Principal del Dock Inferior.
 */
export function renderDock(container, state, handlers = {}) {
  console.log('🚀 [DOCK] renderDock() INICIADO');
  console.log('📦 [DOCK] container:', container);
  console.log('📊 [DOCK] state.currentView:', state?.currentView);
  
  if (!container) {
    console.error('❌ [DOCK] container es null o undefined');
    return;
  }
  
  const isUnidades = state.currentView === 'unidades';
  const hasActiveFilters = appState.hasActiveFilters();
  console.log('📊 [DOCK] isUnidades:', isUnidades, 'hasActiveFilters:', hasActiveFilters);

  let centerHTML = '';
  let rightHTML = '';
  
  if (isUnidades) {
    centerHTML = `<div class="dock-center-placeholder"></div>`;
    rightHTML = `
      <button type="button" class="dock-btn" id="btn-dock-almacen" aria-label="Abrir Almacén">
        <img src="assets/icons/navigation/package.svg" alt="" width="24" height="24" />
      </button>
      <button type="button" class="dock-btn ${hasActiveFilters ? 'has-filter' : ''}" id="btn-dock-filtros" aria-label="Abrir Filtros">
        <img src="assets/icons/navigation/funnel.svg" alt="" width="24" height="24" />
      </button>
      <button type="button" class="dock-btn" id="btn-dock-ajustes" aria-label="Abrir Ajustes">
        <img src="assets/icons/navigation/settings.svg" alt="" width="24" height="24" />
      </button>
    `;
  } else {
    centerHTML = `
      <button type="button" class="dock-btn-extraordinaria" id="btn-dock-extraordinaria" aria-label="Crear Tarea Extraordinaria">
        <span class="btn-icon-plus">+</span>
      </button>
    `;
    rightHTML = `
      <button type="button" class="dock-btn" id="btn-dock-ajustes-periodo" aria-label="Abrir Ajustes">
        <img src="assets/icons/navigation/settings.svg" alt="" width="24" height="24" />
      </button>
    `;
  }

  console.log('📝 [DOCK] Generando HTML...');
  container.innerHTML = `
    <footer class="dock-bottom dock-dinamico">
      <div class="dock-stats-container" id="dock-stats-container" aria-live="polite">
      </div>
      <div class="dock-center-container">
        ${centerHTML}
      </div>
      <div class="dock-right-container">
        ${rightHTML}
      </div>
    </footer>
  `;
  console.log('✅ [DOCK] HTML generado, container.innerHTML.length:', container.innerHTML.length);

  const btnAlmacen = container.querySelector('#btn-dock-almacen');
  const btnFiltros = container.querySelector('#btn-dock-filtros');
  const btnAjustes = container.querySelector('#btn-dock-ajustes');
  const btnAjustesPeriodo = container.querySelector('#btn-dock-ajustes-periodo');
  const btnExtraordinaria = container.querySelector('#btn-dock-extraordinaria');

  console.log('📎 [DOCK] Asignando event listeners...');
  if (btnAlmacen && handlers.onAlmacen) btnAlmacen.addEventListener('click', handlers.onAlmacen);
  if (btnFiltros && handlers.onFiltros) btnFiltros.addEventListener('click', handlers.onFiltros);
  if (btnAjustes && handlers.onAjustes) btnAjustes.addEventListener('click', handlers.onAjustes);
  if (btnAjustesPeriodo && handlers.onAjustes) btnAjustesPeriodo.addEventListener('click', handlers.onAjustes);
  if (btnExtraordinaria) {
    btnExtraordinaria.addEventListener('click', () => {
      console.log('🔄 [DOCK] Click en botón + (Tarea Extraordinaria)');
      if (handlers.onExtraordinaria) handlers.onExtraordinaria();
      else openTareasExtraModal();
    });
  }
  
  console.log('✅ [DOCK] renderDock() FINALIZADO');
}

/**
 * Actualiza dinámicamente las estadísticas del Dock Inferior (Unificado).
 */
export function updateDockStats(camasMostradas = [], state = {}) {
  console.log('🔄 [DOCK] updateDockStats() INICIADO');
  console.log('📊 [DOCK] camasMostradas.length:', camasMostradas.length);
  console.log('📊 [DOCK] state.currentView:', state?.currentView);
  
  const statsContainer = document.getElementById('dock-stats-container');
  if (!statsContainer) {
    console.warn('⚠️ [DOCK] dock-stats-container no encontrado en el DOM');
    return;
  }

  const isUnidades = state.currentView === 'unidades';

  if (isUnidades) {
    const stats = calcularEstadisticasUnidad(camasMostradas);
    const detalles = [];
    if (stats.oxigeno > 0) detalles.push(`${stats.oxigeno} O₂`);
    if (stats.sillaXL > 0) detalles.push(`${stats.sillaXL} XL`);
    if (stats.grua > 0) detalles.push(`${stats.grua} Grúa`);
    if (stats.sillaGD > 0) detalles.push(`${stats.sillaGD} S.GD`);

    const textoDetalles = detalles.length > 0 ? ` · ${detalles.join(' · ')}` : '';
    statsContainer.innerHTML = `
      <span class="stat-main"><strong>${stats.pacientesCelador}</strong> Pac.</span>
      <span class="stat-details">${textoDetalles}</span>
    `;
    console.log('📊 [DOCK] Estadísticas actualizadas (Unidades):', stats);
  } else {
    const franjas = getFranjasOrdenadas();
    const targetFranjaId = appState.getFranjaEfectivaId();
    const targetFranja = franjas.find(f => f.id === targetFranjaId) || franjas[0];
    const franjaNombre = targetFranja ? (targetFranja.nombre || targetFranja.label || 'Franja') : 'Franja';

    const checklist = storage.getChecklist(state.unidadActual || 'global', 'periodo_view');
    const activeUnits = state.activeUnits || [];
    const camasParaStats = appState.getFilteredCamas();
    const stats = calcularEstadisticasPeriodo(camasParaStats, targetFranjaId, checklist, activeUnits);

    statsContainer.innerHTML = `
      <div class="stat-franja-group">
        <span class="stat-franja-label">${franjaNombre}:</span>
        <span class="stat-franja-count">${stats.completadas}/${stats.total}</span>
      </div>
    `;
    console.log('📊 [DOCK] Estadísticas actualizadas (Períodos):', { franjaNombre, completadas: stats.completadas, total: stats.total });
  }
  
  console.log('✅ [DOCK] updateDockStats() FINALIZADO');
}