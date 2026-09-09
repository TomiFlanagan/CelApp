// @ts-nocheck
/**
 * js/components/modals/tareasExtraModal.js
 * Modal de Nivel 2 para Tareas Extraordinarias.
 * Paso 4: Selección de Acción (¿Qué?).
 * Paso 5: Selección de Unidad y Cama por conmutación táctil (¿Dónde?).
 * Paso 6: Selección de Franja (¿Cuándo?) y Guardado.
 * 
 * Soporta modo edición: si se pasa tareaExistente, carga sus datos para modificación.
 */

import { TAREAS_EXTRA } from '../../config/tareasExtra.js';
import { UNIDADES, getUnidadById } from '../../config/unidades.js';
import { getCamasByUnidad } from '../../config/estructuraCamas.js';
import { getFranjasOrdenadas, getFranjaActualId } from '../../config/franjas.js';
import { storage } from '../../services/storage.js';
// 🔧 FIX: antes el modal escribía directamente en storage.js al crear/editar una
// tarea extra, sin pasar por appState. Eso dejaba appState.state.tareasExtra
// desactualizado en memoria y la tarea no se pintaba en periodoView.js hasta el
// siguiente login (cuando appState se reconstruye desde cero). Importamos appState
// para que sea él quien centralice el guardado y la actualización del estado reactivo.
import { appState } from '../../state/appState.js';

/**
 * @typedef {import('../../config/tareasExtra.js').TareaExtra} TareaExtra
 * @typedef {import('../../config/unidades.js').Unidad} Unidad
 * @typedef {import('../../config/franjas.js').Franja} Franja
 */

/** @type {readonly TareaExtra[]} */
const tareasExtraList = TAREAS_EXTRA;

/** @type {Unidad[]} */
const unidadesList = UNIDADES;

/**
 * Abre el modal de tareas extraordinarias.
 * @param {Function} [onAccept] - Callback al guardar una nueva tarea
 * @param {Object} [tareaExistente] - Datos de la tarea a editar (opcional)
 */
export function openTareasExtraModal(onAccept, tareaExistente = null) {
  document.body.classList.add('modal-open');

  const esEdicion = Boolean(tareaExistente);

  /** @type {TareaExtra|null} */
  let selectedAccion = null;
  let isAccionExpanded = true;

  /** @type {string|null} */
  let selectedUnidad = null;
  /** @type {string|null} */
  let selectedCama = null;
  let isDondeExpanded = true;

  // Controla si se asigna a toda la unidad (sin cama concreta)
  let esTodaLaUnidad = false;

  let selectedFranja = getFranjaActualId();
  let isCuandoExpanded = true;

  // Si estamos editando, cargar los datos existentes
  if (esEdicion) {
    const accionEncontrada = tareasExtraList.find(t => t.id === tareaExistente.tipo);
    if (accionEncontrada) {
      selectedAccion = accionEncontrada;
      isAccionExpanded = false;
    }
    selectedUnidad = tareaExistente.unidadId || tareaExistente.unidad || null;
    selectedCama = tareaExistente.habitacionCama || null;
    esTodaLaUnidad = !selectedCama;
    selectedFranja = tareaExistente.franjaId || tareaExistente.franja || getFranjaActualId();
    isDondeExpanded = false;
    isCuandoExpanded = false;
  }

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay level-2-overlay';

  modalOverlay.innerHTML = `
    <div class="modal-card modal-level-2 tareas-extra-modal-card">
      <!-- Cabecera genérica -->
      <header class="modal-header-generic">
        <h3>${esEdicion ? 'Editar Tarea Extraordinaria' : 'Nueva Tarea Extraordinaria'}</h3>
      </header>

      <div class="tareas-extra-body" id="tareas-extra-body">
        <div class="tareas-extra-block" id="bloque-accion"></div>
        <div class="tareas-extra-block" id="bloque-donde"></div>
        <div class="tareas-extra-block" id="bloque-cuando"></div>
      </div>

      <footer class="modal-footer-5050">
        <button type="button" class="btn-modal-cancel" id="btn-extra-cancel">
          Cancelar
        </button>
        <button type="button" class="btn-modal-accept" id="btn-extra-accept" ${esEdicion ? '' : 'disabled'}>
          ${esEdicion ? 'Guardar cambios' : 'Aceptar'}
        </button>
      </footer>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const bloqueAccionEl = modalOverlay.querySelector('#bloque-accion');
  const bloqueDondeEl = modalOverlay.querySelector('#bloque-donde');
  const bloqueCuandoEl = modalOverlay.querySelector('#bloque-cuando');
  const btnAccept = modalOverlay.querySelector('#btn-extra-accept');

  function updateAcceptButton() {
    if (btnAccept) {
      btnAccept.disabled = !(selectedAccion && selectedUnidad);
    }
  }

  // ==========================================
  // DELEGACIÓN DE EVENTOS EN BLOQUE ACCIÓN (No se destruye)
  // ==========================================
  bloqueAccionEl.addEventListener('click', (e) => {
    const btnAccion = e.target.closest('.tareas-extra-acciones-grid .btn-flat');
    if (btnAccion) {
      const tareaId = btnAccion.getAttribute('data-id');
      selectedAccion = tareasExtraList.find(t => t.id === tareaId) || null;
      isDondeExpanded = true;
      renderAll();
    }
  });

  // ==========================================
  // DELEGACIÓN DE EVENTOS EN BLOQUE DÓNDE (No se destruye)
  // ==========================================
  bloqueDondeEl.addEventListener('click', (e) => {
    const target = e.target;

    // Botones de Unidad
    const btnUnidad = target.closest('.traslado-btn-unidad-color');
    if (btnUnidad) {
      selectedUnidad = btnUnidad.getAttribute('data-unidad');
      selectedCama = null;
      esTodaLaUnidad = false;
      renderAll();
      return;
    }

    // Botón "Sin cama asignada"
    const btnSinCama = target.closest('#btn-sin-cama');
    if (btnSinCama) {
      esTodaLaUnidad = !esTodaLaUnidad;
      if (esTodaLaUnidad) {
        selectedCama = null;
      }
      renderAll();
      return;
    }

    // Botones del selector de cama (Centena / Decena / Unidad / Letra)
    const btnDigit = target.closest('.module-btn-plano[data-tipo]');
    if (btnDigit) {
      if (btnDigit.disabled) return;

      const tipo = btnDigit.getAttribute('data-tipo');
      const nextVal = btnDigit.getAttribute('data-next-value') ?? '';
      if (!tipo) return;

      const camasValidas = getCamasByUnidad(selectedUnidad);
      const curCentena = selectedCama ? selectedCama.charAt(0) : '';
      const curDecena = selectedCama ? selectedCama.charAt(1) : '';
      const curUnidadDig = selectedCama ? selectedCama.charAt(2) : '';
      const curLetra = selectedCama ? (selectedCama.charAt(3) || '') : '';

      let match = null;

      if (tipo === 'centena') {
        match = camasValidas.find(c => c === `${nextVal}${curDecena}${curUnidadDig}${curLetra}`) ||
                camasValidas.find(c => c.startsWith(`${nextVal}${curDecena}${curUnidadDig}`)) ||
                camasValidas.find(c => c.startsWith(`${nextVal}${curDecena}`)) ||
                camasValidas.find(c => c.startsWith(nextVal));
      } else if (tipo === 'decena') {
        match = camasValidas.find(c => c === `${curCentena}${nextVal}${curUnidadDig}${curLetra}`) ||
                camasValidas.find(c => c.startsWith(`${curCentena}${nextVal}${curUnidadDig}`)) ||
                camasValidas.find(c => c.startsWith(`${curCentena}${nextVal}`)) ||
                camasValidas.find(c => c.charAt(1) === nextVal);
      } else if (tipo === 'unidad') {
        match = camasValidas.find(c => c === `${curCentena}${curDecena}${nextVal}${curLetra}`) ||
                camasValidas.find(c => c.startsWith(`${curCentena}${curDecena}${nextVal}`)) ||
                camasValidas.find(c => c.charAt(2) === nextVal);
      } else if (tipo === 'letra') {
        match = camasValidas.find(c => c === `${curCentena}${curDecena}${curUnidadDig}${nextVal}`) ||
                camasValidas.find(c => (c.charAt(3) || '') === nextVal);
      }

      if (match) {
        selectedCama = match;
        esTodaLaUnidad = false;
        renderAll();
      }
      return;
    }
  });

  // ==========================================
  // DELEGACIÓN DE EVENTOS EN BLOQUE CUÁNDO (No se destruye)
  // ==========================================
  bloqueCuandoEl.addEventListener('click', (e) => {
    const btnFranja = e.target.closest('.btn-flat');
    if (btnFranja) {
      selectedFranja = btnFranja.getAttribute('data-franja');
      isCuandoExpanded = false;
      renderAll();
    }
  });

  function renderBloqueAccion() {
    if (!bloqueAccionEl) return;

    // Mostramos SIEMPRE la cuadrícula de acciones (nunca se pliega)
    bloqueAccionEl.innerHTML = `
      <p class="editor-section-title">1. ¿Qué acción deseas realizar?</p>
      <div class="tareas-extra-acciones-grid">
        ${tareasExtraList.map(tarea => `
          <button 
            type="button" 
            class="btn-flat ${selectedAccion?.id === tarea.id ? 'active' : ''}" 
            data-id="${tarea.id}"
          >
            ${tarea.icono ? `<img src="assets/icons/navigation/${tarea.icono}.svg" class="icon-sm" alt="" />` : ''}
            <span>${tarea.nombre}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderBloqueDonde() {
    if (!bloqueDondeEl) return;

    if (!selectedAccion) {
      bloqueDondeEl.innerHTML = '';
      return;
    }

    // ==========================================
    // 1. SUB-BLOQUE: RENDERIZAR UNIDADES
    // ==========================================
    let htmlUnidades = `
      <p class="editor-section-title">2. ¿En qué unidad y cama?</p>
      <p style="font-size: 0.8rem; color: #737373; margin: 0 0 0.4rem 0;">Selecciona la Unidad:</p>
      <div class="traslado-unidades-grid">
        ${unidadesList.map(u => `
          <button 
            type="button" 
            class="traslado-btn-unidad-color ${selectedUnidad === u.id ? 'activo' : ''}" 
            data-unidad="${u.id}"
            style="background-color: ${selectedUnidad === u.id ? u.accentColor : u.bgPastel};"
            aria-label="${u.nombre}"
          ></button>
        `).join('')}
      </div>
    `;

    // ==========================================
    // 2. SUB-BLOQUE: RENDERIZAR SELECTOR DE CAMA Y BOTÓN "SIN CAMA ASIGNADA"
    // ==========================================
    let htmlCamas = '';
    if (selectedUnidad) {
      const camasValidas = getCamasByUnidad(selectedUnidad);

      if (selectedCama && !camasValidas.includes(selectedCama)) {
        selectedCama = null;
      }

      // Valores usados para FILTRAR (deben ser cadena vacía cuando no hay selección todavía)
      const curCentena = selectedCama ? selectedCama.charAt(0) : '';
      const curDecena = selectedCama ? selectedCama.charAt(1) : '';
      const curUnidadDig = selectedCama ? selectedCama.charAt(2) : '';
      const curLetra = selectedCama ? (selectedCama.charAt(3) || '') : '';

      // Valores usados solo para MOSTRAR en el botón
      const dispCentena = curCentena || '-';
      const dispDecena = curDecena || '-';
      const dispUnidad = curUnidadDig || '-';
      const dispLetra = selectedCama ? (selectedCama.charAt(3) || '—') : '-';

      // Calcular posibles valores en cada nivel, en cascada desde el nivel anterior
      const centenas = [...new Set(camasValidas.map(c => c.charAt(0)))];
      const decenas = [...new Set(camasValidas.filter(c => !curCentena || c.charAt(0) === curCentena).map(c => c.charAt(1)))];
      const prefixDecena = `${curCentena}${curDecena}`;
      const unidadesDig = [...new Set(camasValidas.filter(c => !prefixDecena || c.startsWith(prefixDecena)).map(c => c.charAt(2)))];
      const prefixRoom = `${curCentena}${curDecena}${curUnidadDig}`;
      const letras = [...new Set(camasValidas.filter(c => !prefixRoom || c.startsWith(prefixRoom)).map(c => c.charAt(3) || ''))];

      // Siguiente valor al pulsar cada botón (cicla dentro del conjunto disponible)
      const nextCentena = centenas.length > 1 ? centenas[(centenas.indexOf(curCentena) + 1) % centenas.length] : (centenas[0] || '');
      const nextDecena = decenas.length > 1 ? decenas[(decenas.indexOf(curDecena) + 1) % decenas.length] : (decenas[0] || '');
      const nextUnidadDig = unidadesDig.length > 1 ? unidadesDig[(unidadesDig.indexOf(curUnidadDig) + 1) % unidadesDig.length] : (unidadesDig[0] || '');
      const nextLetra = letras.length > 1 ? letras[(letras.indexOf(curLetra) + 1) % letras.length] : (letras[0] || '');

      // Si NO es "toda la unidad", mostramos el selector de cama
      if (!esTodaLaUnidad) {
        htmlCamas += `
          <div class="location-module-grid" style="margin-top: 1rem;">
            <div class="module-col">
              <span class="module-label">Centena</span>
              <button type="button" class="module-btn module-btn-plano" id="btn-digit-centena" 
                data-tipo="centena" 
                data-next-value="${nextCentena}" 
                ${selectedCama && centenas.length <= 1 ? 'disabled' : ''}>${dispCentena}</button>
            </div>
            <div class="module-col">
              <span class="module-label">Decena</span>
              <button type="button" class="module-btn module-btn-plano" id="btn-digit-decena" 
                data-tipo="decena" 
                data-next-value="${nextDecena}" 
                ${selectedCama && decenas.length <= 1 ? 'disabled' : ''}>${dispDecena}</button>
            </div>
            <div class="module-col">
              <span class="module-label">Unidad</span>
              <button type="button" class="module-btn module-btn-plano" id="btn-digit-unidad" 
                data-tipo="unidad" 
                data-next-value="${nextUnidadDig}" 
                ${selectedCama && unidadesDig.length <= 1 ? 'disabled' : ''}>${dispUnidad}</button>
            </div>
            <div class="module-col">
              <span class="module-label">Cama</span>
              <button type="button" class="module-btn module-btn-plano" id="btn-digit-letra" 
                data-tipo="letra" 
                data-next-value="${nextLetra}" 
                ${selectedCama && letras.length <= 1 ? 'disabled' : ''}>${dispLetra}</button>
            </div>
          </div>
        `;
      }

      // El botón "Sin cama asignada" aparece siempre debajo del selector, una vez elegida la unidad
      htmlCamas += `
        <button type="button" class="btn-flat ${esTodaLaUnidad ? 'active' : ''}" id="btn-sin-cama" style="width: 100%; margin-top: 1rem;">
          Sin cama asignada
        </button>
      `;
    }

    // ==========================================
    // 3. INYECTAR TODO DE UNA SOLA VEZ
    // ==========================================
    bloqueDondeEl.innerHTML = htmlUnidades + htmlCamas;
  }

function renderBloqueCuando() {
  if (!bloqueCuandoEl) return;

  // La franja horaria solo aparece una vez resuelta la ubicación:
  // cama concreta seleccionada, o "Sin cama asignada" marcado.
  const ubicacionResuelta = Boolean(selectedCama) || esTodaLaUnidad;

  if (!selectedAccion || !selectedUnidad || !ubicacionResuelta) {
    bloqueCuandoEl.innerHTML = '';
    return;
  }

  const franjas = getFranjasOrdenadas();

  // Mostramos SIEMPRE la cuadrícula completa, sin plegarse
  bloqueCuandoEl.innerHTML = `
    <p class="editor-section-title">3. ¿En qué franja horaria?</p>
    <div class="tareas-extra-grid" style="grid-template-columns: repeat(3, 1fr);">
      ${franjas.map(f => `
        <button 
          type="button" 
          class="btn-flat ${selectedFranja === f.id ? 'active' : ''}" 
          data-franja="${f.id}"
          style="min-height: 44px; font-size: 0.8rem; justify-content: center; text-align: center; padding: 0.4rem 0.3rem;"
        >
          <span>${f.nombre}</span>
        </button>
      `).join('')}
    </div>
  `;
}

  function renderAll() {
    renderBloqueAccion();
    renderBloqueDonde();
    renderBloqueCuando();
    updateAcceptButton();
  }

  renderAll();

  const cerrar = () => {
    modalOverlay.remove();
    if (!document.querySelector('.modal-overlay')) {
      document.body.classList.remove('modal-open');
    }
  };

  modalOverlay.querySelector('#btn-extra-cancel')?.addEventListener('click', cerrar);

  modalOverlay.querySelector('#btn-extra-accept')?.addEventListener('click', () => {
    if (!selectedAccion || !selectedUnidad) return;

    if (esEdicion && tareaExistente) {
      // 🔧 FIX: MODO EDICIÓN — antes se manipulaba storage.js directamente
      // (storage.getExtraTasks() + storage.saveTareasExtra()) y solo se avisaba
      // a la app mediante un CustomEvent en window, sin tocar el estado reactivo
      // de appState. Ahora pasa por appState.editarTareaExtra(), que persiste,
      // sincroniza con Supabase y actualiza this.state.tareasExtra en memoria.
      const tareaActualizada = appState.editarTareaExtra(tareaExistente.id, {
        tipo: selectedAccion.id,
        unidadId: selectedUnidad,
        habitacionCama: selectedCama || '',
        franjaId: selectedFranja || ''
      });

      if (tareaActualizada && typeof onAccept === 'function') {
        onAccept({
          accion: selectedAccion,
          unidad: selectedUnidad,
          cama: selectedCama,
          franja: selectedFranja,
          tarea: tareaActualizada,
          esEdicion: true
        });
      }
    } else {
      // 🔧 FIX: MODO CREACIÓN — antes llamaba a storage.addExtraTask() directamente.
      // Ahora pasa por appState.addTareaExtra(), que ya deja this.state.tareasExtra
      // actualizado de inmediato (appState.subscribe en app.js dispara el re-render
      // con datos frescos, sin esperar a un login nuevo).
      const nuevaTarea = appState.addTareaExtra({
        tipo: selectedAccion.id,
        unidadId: selectedUnidad,
        habitacionCama: selectedCama || '',
        franjaId: selectedFranja || ''
      });

      if (typeof onAccept === 'function') {
        onAccept({
          accion: selectedAccion,
          unidad: selectedUnidad,
          cama: selectedCama,
          franja: selectedFranja,
          tarea: nuevaTarea,
          esEdicion: false
        });
      }
    }
    cerrar();
  });

  // Si estamos en modo edición, forzar actualización del botón Aceptar
  if (esEdicion) {
    updateAcceptButton();
  }
}