// js/components/header.js
import { UNIDADES } from '../config/unidades.js';

/**
 * @param {HTMLElement | any} container
 * @param {Object | any} state
 * @param {Function} [onViewStateChange]
 * @param {Function} [onUnitToggle]
 */
export function renderHeader(container, state, onViewStateChange, onUnitToggle) {
  console.log('🚀 [HEADER] renderHeader() INICIADO');
  console.log('📦 [HEADER] container:', container);
  console.log('📊 [HEADER] container?.id:', container?.id);
  console.log('📊 [HEADER] state.currentView:', state?.currentView);
  console.log('📊 [HEADER] state.activeUnits:', state?.activeUnits);
  
  if (!container) {
    console.error('❌ [HEADER] container es null o undefined');
    return;
  }

  // Cancelar escuchadores globales fijados en el document durante el renderizado anterior
  if (container._headerAbortController) {
    console.log('🧹 [HEADER] Cancelando abortController anterior');
    container._headerAbortController.abort();
  }
  const controller = new AbortController();
  container._headerAbortController = controller;

  const isUnidades = state.currentView === 'unidades';
  const isPeriodos = state.currentView === 'periodos';
  
  console.log('📊 [HEADER] isUnidades:', isUnidades, 'isPeriodos:', isPeriodos);

  console.log('📝 [HEADER] Generando HTML...');
  container.innerHTML = `
    <!-- Pestañas de Navegación -->
    <div class="header-tabs">
      <button class="header-tab ${isUnidades ? 'active' : ''}" data-view="unidades" style="outline: none; -webkit-tap-highlight-color: transparent;">
        Unidades
      </button>
      <button class="header-tab ${isPeriodos ? 'active' : ''}" data-view="periodos" style="outline: none; -webkit-tap-highlight-color: transparent;">
        Jornada
      </button>
    </div>

    <!-- Botones de Unidad (Hilera de cuadrados) -->
    <div class="unit-filters-group">
      ${UNIDADES.map((/** @type {any} */ u) => {
        const isActive = (state.activeUnits || []).includes(u.id);
        return `
          <button 
            class="unit-filter-btn unit-${u.id} ${isActive ? 'active' : ''}" 
            data-unit="${u.id}"
            title="Unidad ${u.nombre}"
            aria-label="Filtro Unidad ${u.nombre}"
            style="outline: none; -webkit-tap-highlight-color: transparent;">
          </button>
        `;
      }).join('')}
    </div>
  `;
  console.log('✅ [HEADER] HTML generado, container.innerHTML.length:', container.innerHTML.length);

  // 1. Eventos de las Pestañas (Cambio de Vista)
  console.log('📎 [HEADER] Añadiendo eventos a .header-tab...');
  container.querySelectorAll('.header-tab').forEach((/** @type {Element} */ btn) => {
    btn.addEventListener('click', (/** @type {Event} */ e) => {
      const selectedView = (/** @type {HTMLElement} */ (e.currentTarget)).dataset.view;
      console.log('🔄 [HEADER] Click en pestaña:', selectedView);
      if (onViewStateChange) onViewStateChange(selectedView);
    });
  });

  // 2. Eventos de los Botones de Unidad (Filtro)
  console.log('📎 [HEADER] Añadiendo eventos a .unit-filter-btn...');
  container.querySelectorAll('.unit-filter-btn').forEach((/** @type {Element} */ btn) => {
    btn.addEventListener('click', (/** @type {Event} */ e) => {
      const unit = (/** @type {HTMLElement} */ (e.currentTarget)).dataset.unit;
      console.log('🔄 [HEADER] Click en unidad:', unit);
      if (onUnitToggle) onUnitToggle(unit);
    });
  });
  
  console.log('✅ [HEADER] renderHeader() FINALIZADO');
}