/**
 * js/components/unidadView.js
 * Vista Nivel 1: Retícula y organización de camas por Unidades Asistenciales.
 * Cumple estricto límite de <150 líneas y reglas Vanilla JS / ES6.
 */

import { UNIDADES } from '../config/unidades.js';
import { appState } from '../state/appState.js';
import { createCamaCard } from './camaCard.js';

/**
 * Renderiza la Vista por Unidades en el contenedor principal.
 * @param {HTMLElement|null} container - Elemento <main id="app">
 * @param {Object} [state={}] - Estado global { activeUnits, camas, expandedUnitId, ... }
 * @param {Object} [actions={}] - Handlers para los botones de las tarjetas
 */
export function renderUnidadView(container, state = {}, actions = {}) {
  console.log('🚀 [UNIDADVIEW] renderUnidadView() INICIADO');
  console.log('📦 [UNIDADVIEW] container:', container);
  console.log('📊 [UNIDADVIEW] container?.id:', container?.id);
  console.log('📊 [UNIDADVIEW] state.camas?.length:', state.camas?.length);
  console.log('📊 [UNIDADVIEW] state.activeUnits:', state.activeUnits);
  
  if (!container) {
    console.error('❌ [UNIDADVIEW] container es null o undefined');
    return;
  }

  console.log('🧹 [UNIDADVIEW] Limpiando container.innerHTML...');
  container.innerHTML = '';
  console.log('✅ [UNIDADVIEW] container.innerHTML limpiado');

  /** @type {Array<string>} */
  const activeUnits = state.activeUnits || [];

  const unitsToRender = activeUnits.length > 0
    ? UNIDADES.filter((/** @type {Object} */ u) => activeUnits.includes(u.id))
    : UNIDADES;
  
  console.log('📊 [UNIDADVIEW] unitsToRender:', unitsToRender.map(u => u.id).join(', '));

  const viewContainer = document.createElement('div');
  viewContainer.className = 'unidades-view-container';

  /** @type {Array<Object>} */
  const camasData = Array.isArray(state.camas)
    ? state.camas
    : Object.values(state.camas || {});

  console.log('📊 [UNIDADVIEW] camasData.length:', camasData.length);

  // Comprobar si hay filtros activos
  const hasActiveFilters = appState.hasActiveFilters();
  console.log('📊 [UNIDADVIEW] hasActiveFilters:', hasActiveFilters);

  // Si hay filtros activos: todas las unidades expandidas y se permite múltiples
  // Si no hay filtros: comportamiento normal (acordeón)
  const shouldCollapseAll = hasActiveFilters ? false : (activeUnits.length !== 1);
  console.log('📊 [UNIDADVIEW] shouldCollapseAll:', shouldCollapseAll);

  // La unidad actualmente desplegada del acordeón (solo se usa sin filtros)
  const expandedUnitId = state.expandedUnitId || null;
  console.log('📊 [UNIDADVIEW] expandedUnitId:', expandedUnitId);

  unitsToRender.forEach((/** @type {Object} */ unidad) => {
    // Con filtros: todas expandidas. Sin filtros: solo la que coincide con expandedUnitId
    const isExpanded = hasActiveFilters ? true : (shouldCollapseAll ? (expandedUnitId === unidad.id) : true);
    console.log(`📌 [UNIDADVIEW] Unidad ${unidad.id}: isExpanded = ${isExpanded}`);
    const unitSection = createUnitSection(unidad, camasData, actions, shouldCollapseAll, isExpanded, hasActiveFilters);
    viewContainer.appendChild(unitSection);
  });

  console.log('📎 [UNIDADVIEW] Añadiendo viewContainer a container...');
  container.appendChild(viewContainer);
  console.log('✅ [UNIDADVIEW] renderUnidadView() FINALIZADO');
  console.log('📏 [UNIDADVIEW] container.innerHTML.length:', container.innerHTML.length);
}

/**
 * Fabrica el contenedor y encabezado de una unidad junto con sus camas.
 * @param {Object} unidad - Datos de la unidad
 * @param {Array<Object>} allCamas - Lista global de camas
 * @param {Object} actions - Handlers de eventos
 * @param {boolean} shouldCollapseAll - Si el acordeón está activo
 * @param {boolean} isExpanded - Si esta unidad debe nacer desplegada
 * @param {boolean} hasActiveFilters - Si hay filtros activos
 * @returns {HTMLElement} Elemento de la sección de unidad
 */
function createUnitSection(unidad, allCamas, actions, shouldCollapseAll, isExpanded, hasActiveFilters) {
  console.log(`🔧 [UNIDADVIEW] createUnitSection() para ${unidad.id}, isExpanded=${isExpanded}`);
  
  const isCollapsed = !isExpanded;

  const section = document.createElement('section');
  section.className = `unit-section unit-${unidad.id}${isCollapsed ? ' unit-collapsed' : ''}`;
  section.dataset.unitId = unidad.id;

  const camasUnidad = allCamas.filter((/** @type {Object} */ cama) => cama.unidadId === unidad.id);
  console.log(`📊 [UNIDADVIEW] ${unidad.id}: ${camasUnidad.length} camas encontradas`);

  const header = document.createElement('div');
  header.className = `unit-header ${isCollapsed ? 'collapsed' : ''}`;
  // Eliminar resalte azul al pulsar/tocar
  header.style.outline = 'none';
  header.style.webkitTapHighlightColor = 'transparent';

  // Chevron según estado (usando SVGs)
  const chevronIcon = isExpanded 
    ? 'assets/icons/navigation/chevron-up.svg' 
    : 'assets/icons/navigation/chevron-down.svg';

  header.innerHTML = `
    <div class="unit-title-group">
      <h3 class="unit-name">${unidad.nombre}</h3>
    </div>
    ${shouldCollapseAll ? `<img src="${chevronIcon}" alt="Desplegar" class="unit-chevron" />` : ''}
  `;

  const cardsGrid = document.createElement('div');
  cardsGrid.className = `unit-cards-grid ${isCollapsed ? 'hidden' : ''}`;

  if (camasUnidad.length === 0) {
    cardsGrid.innerHTML = `
      <div class="empty-unit-message">
        <span>Sin camas en esta unidad</span>
      </div>
    `;
  } else {
    camasUnidad.forEach((/** @type {Object} */ cama) => {
      const camaData = {
        ...cama,
        bgClass: cama.bgClass || `unit-${unidad.id}`
        // Ya no forzamos isExpanded aquí, respetamos el estado de la cama
      };
      // Pasamos allowMultiple = hasActiveFilters para que las camas permitan múltiples expansiones
      const cardElement = createCamaCard(camaData, actions, hasActiveFilters);
      cardsGrid.appendChild(cardElement);
    });
  }

  // El acordeón de unidades sólo aplica cuando no hay filtros activos
  if (shouldCollapseAll && !hasActiveFilters) {
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const yaExpandida = appState.getState().expandedUnitId === unidad.id;
      appState.setExpandedUnit(yaExpandida ? null : unidad.id);
    });
  } else if (hasActiveFilters) {
    // Con filtros: toggle individual (abre/cierra solo esta unidad)
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCurrentlyCollapsed = section.classList.contains('unit-collapsed');
      if (isCurrentlyCollapsed) {
        section.classList.remove('unit-collapsed');
        section.querySelector('.unit-cards-grid').classList.remove('hidden');
        const chevron = section.querySelector('.unit-chevron');
        if (chevron) chevron.src = 'assets/icons/navigation/chevron-up.svg';
        section.querySelector('.unit-header').classList.remove('collapsed');
      } else {
        section.classList.add('unit-collapsed');
        section.querySelector('.unit-cards-grid').classList.add('hidden');
        const chevron = section.querySelector('.unit-chevron');
        if (chevron) chevron.src = 'assets/icons/navigation/chevron-down.svg';
        section.querySelector('.unit-header').classList.add('collapsed');
      }
    });
  }

  section.appendChild(header);
  section.appendChild(cardsGrid);
  
  console.log(`✅ [UNIDADVIEW] createUnitSection() para ${unidad.id} FINALIZADO`);

  return section;
}