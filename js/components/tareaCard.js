// @ts-nocheck
/**
 * js/components/tareaCard.js
 * Componente: Tarjeta Individual de Tarea (Nivel 1 - Vista por Períodos)
 * Diseño Flat UI 2013 adaptado - Mismo estilo que camaCard.js
 */

import { ATRIBUTOS_MAP } from '../config/atributos.js';
import { UNIDADES as UNIDADES_CONFIG } from '../config/unidades.js';
import { appState } from '../state/appState.js';
import { updateDockStats } from './dock.js';
import { openConfirmModal } from './modals/confirmModal.js';
import { openTareasExtraModal } from './modals/tareasExtraModal.js';

// Estado local de expansión persistente durante la sesión (evita problemas de re-renderizado)
const expandedKeys = new Set();

/**
 * Fabrica y devuelve el elemento DOM de la tarjeta de tarea.
 * @param {Object} task - Objeto con datos de la tarea.
 * @param {Object} franja - Datos de la franja horaria (para contexto).
 * @param {Object} state - Estado actual de la app.
 * @returns {HTMLElement} Elemento <div> de la tarea.
 */
export function createTareaCard(task, franja, state) {
  // Verificar que task y franja existen
  if (!task || !franja) {
    console.warn('⚠️ createTareaCard: task o franja es undefined', { task, franja });
    const fallback = document.createElement('div');
    fallback.className = 'tarea-card error-card';
    fallback.innerHTML = '<span style="color: red; padding: 0.5rem; display: block;">Error: Tarea inválida</span>';
    return fallback;
  }

  // Verificar que cama existe
  if (!task.cama) {
    console.warn('⚠️ createTareaCard: task.cama es undefined', task);
    const fallback = document.createElement('div');
    fallback.className = 'tarea-card error-card';
    fallback.innerHTML = '<span style="color: red; padding: 0.5rem; display: block;">Error: Cama no encontrada</span>';
    return fallback;
  }

  let { 
    key, 
    cama, 
    accion, 
    isOverdue, 
    isCompleted, 
    isExtra, 
    nombreAccion, 
    iconoAccion, 
    isExpanded, 
    tareaExtraData 
  } = task;
  
  // Sincronizar expansión usando el Set local del módulo
  isExpanded = expandedKeys.has(key) || Boolean(isExpanded);
  task.isExpanded = isExpanded;

  // Si es una tarea extra, la unidad viene en tareaExtraData; si no, viene de cama.
  const unidadId = (isExtra && tareaExtraData?.unidadId) 
    ? tareaExtraData.unidadId 
    : (cama.unidadId || cama.unidad || 'amarilla');
  
  // Obtener colores de la unidad
  const unidadData = UNIDADES_CONFIG.find(u => u.id === unidadId);
  const colorSaturado = unidadData?.accentColor || '#737373';
  const colorPastel = unidadData?.bgPastel || '#ffffff';
  
  const card = document.createElement('div');
  card.className = `tarea-card ${isOverdue ? 'overdue' : ''} ${isCompleted ? 'completed' : ''} ${isExpanded ? 'expanded' : ''}`;
  card.dataset.key = key;
  card.style.backgroundColor = colorSaturado;
  card.style.outline = 'none';
  card.style.webkitTapHighlightColor = 'transparent';

  // ---- ICONO DE ACCIÓN Y TEXTO ----
  // 🔥 CORRECCIÓN: Si es extra, usar el icono genérico que ya viene de periodoView.js.
  // Si es null o undefined, NO se pinta icono, pero la tarjeta se crea igualmente.
  let actionIconSrc = '';
  if (isExtra) {
    // Si periodoView.js proporciona un icono genérico, lo usamos. Si no, no pintamos nada.
    actionIconSrc = iconoAccion || '';
  } else {
    actionIconSrc = `assets/icons/navigation/${accion === 'levantar' ? 'levantar.svg' : 'acostar.svg'}`;
  }
  
  // 🔥 CORRECCIÓN: Si es extra, usamos nombreAccion tal cual. Si no, capitalizamos.
  const accionTexto = isExtra 
    ? (nombreAccion || accion || 'Tarea extra') 
    : (accion ? accion.charAt(0).toUpperCase() + accion.slice(1) : '');
  const textCama = cama.id ? ` ${cama.id}` : '';

  // ---- ICONO CHEVRON DINÁMICO ----
  const chevronIcon = isExpanded 
    ? 'assets/icons/navigation/chevron-up.svg' 
    : 'assets/icons/navigation/chevron-down.svg';

  // ---- ICONOS DE ATRIBUTOS (Cuerpo desplegado) ----
  let atributosIconosHTML = '';
  if (cama.atributos) {
    for (const [keyAttr, value] of Object.entries(cama.atributos)) {
      if (value) {
        const item = ATRIBUTOS_MAP[keyAttr];
        if (item) {
          atributosIconosHTML += `<img src="${item.icon}" alt="${item.label}" class="icon-attr-plain" style="width: 24px; height: 24px; margin: 0 2px;" />`;
        }
      }
    }
  }

  // ---- BOTONES DE ACCIÓN (dentro del cuerpo) ----
  let rightButtonsHTML = '';

  if (!isCompleted) {
    rightButtonsHTML += `
      <button data-key="${key}" data-action-btn="check" class="btn-icon-plain task-action-btn ${isExpanded ? '' : 'hidden'}" style="outline: none; -webkit-tap-highlight-color: transparent;">
        <img src="assets/icons/navigation/check.svg" alt="Marcar como realizada" />
      </button>
    `;
  }

  if (isCompleted) {
    rightButtonsHTML += `
      <button data-key="${key}" data-action-btn="undo" class="btn-icon-plain task-action-btn ${isExpanded ? '' : 'hidden'}" style="outline: none; -webkit-tap-highlight-color: transparent;">
        <img src="assets/icons/navigation/undo-2.svg" alt="Revertir tarea" />
      </button>
    `;
  }

  if (isExtra) {
    rightButtonsHTML += `
      <button data-key="${key}" data-action-btn="edit" class="btn-icon-plain task-action-btn ${isExpanded ? '' : 'hidden'}" style="outline: none; -webkit-tap-highlight-color: transparent;">
        <img src="assets/icons/navigation/pencil.svg" alt="Editar" />
      </button>
    `;
  }

  // ---- CONSTRUCCIÓN DEL HTML ----
  card.innerHTML = `
    <!-- CABECERA (fondo saturado) -->
    <div class="tarea-header" style="padding: 0.75rem 1rem;">
      <div class="tarea-header-row">
        <div class="tarea-left" style="display: flex; align-items: center;">
          ${isOverdue ? `<span class="dot-overdue" style="margin-right: 6px;"></span>` : ''}
          ${actionIconSrc ? `<img src="${actionIconSrc}" class="tarea-action-icon" alt="${accion}" style="width: 22px; height: 22px; margin-right: 8px; filter: brightness(0) invert(1);" />` : ''}
          <span class="tarea-cama-id" style="color: #ffffff;">${accionTexto}${textCama}</span>
        </div>
        
        <div class="tarea-header-actions">
          <img src="${chevronIcon}" alt="Desplegar" class="tarea-chevron" style="width: 18px; height: 18px; filter: brightness(0) invert(1);" />
        </div>
      </div>
    </div>

    <!-- CUERPO DESPLEGABLE (fondo pastel) -->
    <div class="tarea-body ${isExpanded ? '' : 'hidden'}" style="background-color: ${colorPastel}; padding: 0.75rem 1rem;">
      
      <!-- Botones de acción en el cuerpo -->
      <div class="tarea-actions-row ${isExpanded ? '' : 'hidden'}">
        ${rightButtonsHTML}
      </div>
      
      <!-- Atributos -->
      <div class="tarea-attributes-row">
        ${atributosIconosHTML || `<span class="text-empty">Sin atributos</span>`}
      </div>
      
    </div>
  `;

  setupEventListeners(card, task, accionTexto, textCama, state);
  return card;
}

/**
 * Asigna los listeners de interacción.
 */
function setupEventListeners(card, task, accionTexto, textCama, state) {
  const { key, isCompleted, isExtra, tareaExtraData } = task;
  
  let startX = 0;
  let startY = 0;
  let isSwiping = false;
  let isScrolling = false;

  const body = card.querySelector('.tarea-body');
  const actionsRow = card.querySelector('.tarea-actions-row');
  const chevron = card.querySelector('.tarea-chevron');

  // ---- SWIPE ----
  // Distingue un gesto de "deslizar para marcar" (predominantemente horizontal)
  // de un gesto de scroll de la lista (predominantemente vertical, aunque
  // tenga algo de deriva horizontal, como ocurre casi siempre al hacer scroll
  // rápido o con el móvil sujeto con una sola mano). Sin esta distinción, el
  // código anterior solo miraba el desplazamiento horizontal y podía marcar
  // tareas como completadas mientras el celador simplemente hacía scroll.
  card.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = false;
    isScrolling = false;
  }, { passive: true });

  card.addEventListener('touchmove', (e) => {
    const diffX = e.touches[0].clientX - startX;
    const diffY = e.touches[0].clientY - startY;

    // La intención del gesto se decide una sola vez, en cuanto el movimiento
    // supera un umbral mínimo, y se mantiene fija durante el resto del toque.
    if (!isSwiping && !isScrolling) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        if (Math.abs(diffX) > Math.abs(diffY) * 1.5) {
          isSwiping = true;
        } else {
          isScrolling = true;
        }
      }
    }
  }, { passive: true });

  card.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].clientX - startX;
    if (isSwiping && !isScrolling && Math.abs(diffX) > 40) {
      appState.toggleChecklist(key, !isCompleted);
      updateDockStats([], state);
    }
    isSwiping = false;
    isScrolling = false;
  }, { passive: true });

  // ---- CLICK EN LA TARJETA (Expandir / Contraer) ----
  card.addEventListener('click', (e) => {
    e.stopPropagation();

    if (isSwiping) {
      isSwiping = false;
      return;
    }
    if (e.target.closest('button')) {
      return;
    }

    const newExpanded = !task.isExpanded;
    task.isExpanded = newExpanded;

    // Actualizar el registro local de tarjetas abiertas
    if (newExpanded) {
      expandedKeys.clear();
      expandedKeys.add(key);
    } else {
      expandedKeys.delete(key);
    }

    card.classList.toggle('expanded', newExpanded);
    if (body) body.classList.toggle('hidden', !newExpanded);
    if (actionsRow) actionsRow.classList.toggle('hidden', !newExpanded);
    
    if (chevron) {
      chevron.src = newExpanded 
        ? 'assets/icons/navigation/chevron-up.svg' 
        : 'assets/icons/navigation/chevron-down.svg';
    }

    card.querySelectorAll('.task-action-btn').forEach((btn) => {
      btn.classList.toggle('hidden', !newExpanded);
    });

    // Cerrar las demás tarjetas visualmente
    if (newExpanded) {
      const allCards = document.querySelectorAll('.periodo-cards-grid .tarea-card');
      allCards.forEach((otherCard) => {
        if (otherCard !== card) {
          const otherBody = otherCard.querySelector('.tarea-body');
          const otherActions = otherCard.querySelector('.tarea-actions-row');
          const otherChevron = otherCard.querySelector('.tarea-chevron');
          if (otherBody) otherBody.classList.add('hidden');
          if (otherActions) otherActions.classList.add('hidden');
          if (otherChevron) otherChevron.src = 'assets/icons/navigation/chevron-down.svg';
          otherCard.classList.remove('expanded');
          otherCard.querySelectorAll('.task-action-btn').forEach((btn) => {
            btn.classList.add('hidden');
          });
          if (otherCard._taskData) {
            otherCard._taskData.isExpanded = false;
          }
        }
      });
    }
  });

  card._taskData = task;

  // ---- BOTÓN CHECK ----
  const checkBtn = card.querySelector('button[data-action-btn="check"]');
  if (checkBtn) {
    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mensaje = isCompleted 
  ? `La tarea "${accionTexto}${textCama}" ya está marcada como realizada. ¿Deseas desmarcarla?`
  : `¿Confirmas que has completado la tarea "${accionTexto}${textCama}"? (También puedes deslizar la tarea hacia la izquierda o la derecha para marcarla como realizada)`;

      openConfirmModal({
        titulo: isCompleted ? 'Desmarcar tarea' : 'Marcar tarea como realizada',
        mensaje: mensaje,
        textoCancelar: 'Cancelar',
        textoAceptar: 'Aceptar',
        onAceptar: () => {
          appState.toggleChecklist(key, true);
          updateDockStats([], state);
        }
      });
    });
  }

  // ---- BOTÓN REVERTIR ----
  const revertBtn = card.querySelector('button[data-action-btn="undo"]');
  if (revertBtn) {
    revertBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openConfirmModal({
        titulo: 'Revertir tarea',
        mensaje: `¿Deseas desmarcar la tarea "${accionTexto}${textCama}"?`,
        textoCancelar: 'Cancelar',
        textoAceptar: 'Aceptar',
        onAceptar: () => {
          appState.toggleChecklist(key, false);
          updateDockStats([], state);
        }
      });
    });
  }

  // ---- BOTÓN EDITAR (Extraordinarias) ----
  const editBtn = card.querySelector('button[data-action-btn="edit"]');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTareasExtraModal(
        (resultado) => {
          if (resultado) {
            updateDockStats([], state);
          }
        },
        tareaExtraData
      );
    });
  }
}