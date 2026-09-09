/**
 * js/components/camaCard.js
 * Componente: Tarjeta Individual de Cama (Nivel 1 - Vista por Unidades)
 * Diseño Flat UI 2013 adaptado - Sin bordes, sin sombras, colores planos
 * Diseño responsivo: medidas en porcentajes
 */

import { UNIDADES as UNIDADES_CONFIG } from '../config/unidades.js';
import { FRANJAS as FRANJAS_CONFIG } from '../config/franjas.js';
import { ATRIBUTOS_MAP } from '../config/atributos.js';
import { storage } from '../services/storage.js';
import { appState } from '../state/appState.js';

/**
 * Fabrica y devuelve el elemento DOM de la tarjeta de cama.
 * @param {Object} cama - Objeto con datos de la cama.
 * @param {Object} actions - Handlers de eventos ({ onEdit, onTransfer, onVacate, onHistory, onMarkAsViewed, onToggleExpand })
 * @param {boolean} allowMultiple - Si se permiten múltiples camas expandidas a la vez
 * @returns {HTMLElement} Elemento <article> de la cama.
 */
export function createCamaCard(cama, actions = {}, allowMultiple = false) {
  const card = document.createElement('article');
  // Respetamos el estado de la cama (isExpanded) venga de donde venga
  const isExpanded = Boolean(cama.isExpanded);
  
  const unidadData = Array.isArray(UNIDADES_CONFIG) 
    ? UNIDADES_CONFIG.find(u => u.id === cama.unidadId)
    : UNIDADES_CONFIG[cama.unidadId];
  
  const colorSaturado = unidadData?.accentColor || '#737373';
  const colorPastel = unidadData?.bgPastel || '#ffffff';
  
  // La tarjeta no tiene fondo propio (es transparente)
  card.className = `cama-card ${isExpanded ? 'expanded' : ''}`;
  card.dataset.camaId = cama.id;

  const hasAttributes = Object.values(cama.atributos || {}).some(Boolean);
  const timestampModificacion = cama.ultimaModificacion?.timestamp || cama.updatedAt;
  const hasRecentChanges = storage.hasUnreadChanges(cama.id, timestampModificacion);

  // Generar HTML de iconos de atributos (sin texto ni recuadro)
  const atributosIconosHTML = renderAtributosIconos(cama.atributos);
  // Generar HTML de rutinas (sin recuadros)
  const rutinasIconosHTML = renderRutinasIconos(cama.rutinas);

  // Icono de paciente de celador en blanco (solo si aplica)
  // Posicionado absolutamente en el centro del padding-left del contenedor
  const pacienteIconHTML = cama.esPacienteCelador 
    ? `<span style="position: absolute; left: 3%; top: 50%; transform: translate(-50%, -50%); width: 22px; height: 22px; background-color: #ffffff; -webkit-mask: url('assets/icons/attributes/user-check.svg') no-repeat center / contain; mask: url('assets/icons/attributes/user-check.svg') no-repeat center / contain;"></span>`
    : '';

  // Chevron según estado (usando SVGs)
  const chevronIcon = isExpanded 
    ? 'assets/icons/navigation/chevron-up.svg' 
    : 'assets/icons/navigation/chevron-down.svg';

  // Mostrar chevron solo si hay contenido
  const showChevron = hasAttributes || Object.keys(cama.rutinas || {}).length > 0;

  card.innerHTML = `
    <!-- CABECERA (fondo saturado) -->
    <div class="cama-header" style="background-color: ${colorSaturado}; padding: 0.75rem 1rem;">
      <div class="cama-header-row">
        <div class="cama-id-group" style="position: relative; padding-left: 6%; display: flex; align-items: center; width: 100%;">
          ${pacienteIconHTML}
          <span class="cama-id">${cama.id}</span>
          ${hasRecentChanges 
            ? `<span class="dot-reciente" title="Modificación reciente"></span>` 
            : ''}
        </div>
        
        <div class="cama-header-actions">
          ${showChevron ? `<img src="${chevronIcon}" alt="Desplegar" class="icon-chevron" />` : ''}
        </div>
      </div>
    </div>

    <!-- CUERPO DESPLEGABLE (fondo pastel) -->
    <div class="cama-body ${isExpanded ? '' : 'hidden'}" style="background-color: ${colorPastel}; padding: 0.75rem 1rem;">
      
      <!-- Botones de acción (solo visibles en desplegado) -->
      <div class="cama-actions-row ${isExpanded ? '' : 'hidden'}">
        <button class="btn-icon-plain btn-edit" title="Editar atributos">
          <img src="assets/icons/navigation/pencil.svg" alt="Editar" />
        </button>
        <button class="btn-icon-plain btn-transfer" title="Trasladar paciente">
          <img src="assets/icons/navigation/repeat.svg" alt="Trasladar" />
        </button>
        <button class="btn-icon-plain btn-history" title="Última modificación">
          <img src="assets/icons/navigation/rotate-ccw-clock.svg" alt="Historial" />
        </button>
        <button class="btn-icon-plain btn-vacate" title="Vaciar cama">
          <img src="assets/icons/navigation/trash-2.svg" alt="Vaciar" />
        </button>
      </div>
      
      <!-- Atributos -->
      <div class="cama-attributes-row">
        ${atributosIconosHTML}
        ${!atributosIconosHTML ? `<span class="text-empty">Sin atributos</span>` : ''}
      </div>

      <!-- Rutinas -->
      <div class="cama-rutinas-row">
        ${rutinasIconosHTML || `<span class="text-empty">Sin rutinas</span>`}
      </div>
      
    </div>
  `;

  setupEventListeners(card, cama, actions, allowMultiple);
  return card;
}

/** 
 * Renderiza solo los iconos de atributos activos, sin texto ni recuadro.
 * @param {Object} [atributos]
 * @returns {string}
 */
function renderAtributosIconos(atributos = {}) {
  const activos = Object.entries(atributos).filter(([_, val]) => Boolean(val));
  if (activos.length === 0) return '';

  return activos.map(([key]) => {
    const item = ATRIBUTOS_MAP[key];
    if (!item) return '';
    return `
      <img src="${item.icon}" alt="${item.label}" class="icon-attr-plain" title="${item.label}" />
    `;
  }).join('');
}

/** 
 * Renderiza las rutinas de movilización sin recuadros.
 * @param {Object} [rutinas]
 * @returns {string}
 */
function renderRutinasIconos(rutinas = {}) {
  if (!rutinas || Object.keys(rutinas).length === 0) return '';

  const franjasArray = Array.isArray(FRANJAS_CONFIG) ? FRANJAS_CONFIG : Object.values(FRANJAS_CONFIG);
  const activas = franjasArray.filter(f => rutinas[f.id] && rutinas[f.id] !== 'nada');

  if (activas.length === 0) return '';

  return activas.map(franja => {
    const accion = rutinas[franja.id];
    const icon = accion === 'levantar' 
      ? 'assets/icons/navigation/levantar.svg' 
      : 'assets/icons/navigation/acostar.svg';
    
    return `
      <div class="rutina-item-plain">
        <span class="rutina-franja-plain">${franja.nombre}</span>
        <img src="${icon}" alt="${accion}" class="icon-rutina-plain" />
      </div>
    `;
  }).join('');
}

/** 
 * Asigna los listeners de interacción
 * @param {HTMLElement} card
 * @param {Object} cama
 * @param {Object} actions
 * @param {boolean} allowMultiple - Si se permiten múltiples camas expandidas
 */
function setupEventListeners(card, cama, actions, allowMultiple) {
  const body = card.querySelector('.cama-body');
  const dot = card.querySelector('.dot-reciente');
  const actionsRow = card.querySelector('.cama-actions-row');

  card.addEventListener('click', (e) => {
    e.stopPropagation();

    const target = /** @type {HTMLElement} */ (e.target);
    // Ignorar clics en botones de acción
    if (target.closest('.btn-icon-plain')) return;

    const isExpanded = !card.classList.contains('expanded');
    
    card.classList.toggle('expanded', isExpanded);
    cama.isExpanded = isExpanded;
    
    // Mostrar/ocultar cuerpo
    if (body) body.classList.toggle('hidden', !isExpanded);
    // Mostrar/ocultar fila de acciones
    if (actionsRow) actionsRow.classList.toggle('hidden', !isExpanded);

    // Actualizar chevron
    const chevron = card.querySelector('.icon-chevron');
    if (chevron) {
      chevron.src = isExpanded 
        ? 'assets/icons/navigation/chevron-up.svg' 
        : 'assets/icons/navigation/chevron-down.svg';
    }

    // Si NO se permiten múltiples, cerrar todas las demás camas
    if (!allowMultiple && isExpanded) {
      const allCards = document.querySelectorAll('.cama-card');
      allCards.forEach((otherCard) => {
        if (otherCard !== card && otherCard.classList.contains('expanded')) {
          // Cerrar la otra cama
          otherCard.classList.remove('expanded');
          const otherBody = otherCard.querySelector('.cama-body');
          const otherActions = otherCard.querySelector('.cama-actions-row');
          const otherChevron = otherCard.querySelector('.icon-chevron');
          if (otherBody) otherBody.classList.add('hidden');
          if (otherActions) otherActions.classList.add('hidden');
          if (otherChevron) otherChevron.src = 'assets/icons/navigation/chevron-down.svg';
          // Actualizar el estado de la otra cama en el objeto
          const otherCamaId = otherCard.dataset.camaId;
          // Buscar la cama en appState y actualizar su isExpanded a false
          // Usamos el appState importado para actualizar el estado
          const state = appState.getState();
          const otherCama = state.camas.find(c => c.id === otherCamaId);
          if (otherCama) otherCama.isExpanded = false;
        }
      });
    }

    actions.onToggleExpand?.(cama.id, isExpanded);

    const timestampModificacion = cama.ultimaModificacion?.timestamp || cama.updatedAt;
    const hasUnread = storage.hasUnreadChanges(cama.id, timestampModificacion);

    if (isExpanded && hasUnread) {
      if (dot) dot.style.display = 'none';
      storage.markCamaAsViewed(cama.id, timestampModificacion);
      actions.onMarkAsViewed?.(cama.id);
    }
  });

  // Listeners de los botones de acción (ahora en el cuerpo)
  const container = card.querySelector('.cama-actions-row');
  container?.querySelector('.btn-edit')?.addEventListener('click', (e) => {
    e.stopPropagation();
    actions.onEdit?.(cama);
  });
  container?.querySelector('.btn-transfer')?.addEventListener('click', (e) => {
    e.stopPropagation();
    actions.onTransfer?.(cama);
  });
  container?.querySelector('.btn-history')?.addEventListener('click', (e) => {
    e.stopPropagation();
    actions.onHistory?.(cama);
  });
  container?.querySelector('.btn-vacate')?.addEventListener('click', (e) => {
    e.stopPropagation();
    actions.onVacate?.(cama);
  });
}