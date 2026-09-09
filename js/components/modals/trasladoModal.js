/**
 * js/components/modals/trasladoModal.js - Modal de Nivel 2
 * Traslado de Paciente: selector de unidades por color y cama de destino mediante módulos de dígitos.
 */

import { UNIDADES, getUnidadById } from '../../config/unidades.js';
import { getCamasByUnidad } from '../../config/estructuraCamas.js';
import { openConfirmModal } from './confirmModal.js';

/**
 * Comprueba si una cama (según los datos actuales en memoria) está vacía.
 * @param {Object|undefined} cama
 * @returns {boolean}
 */
function estaVacia(cama) {
  if (!cama) return true;
  const sinAtributos = !cama.atributos || Object.values(cama.atributos).every(v => !v);
  const sinRutinas = !cama.rutinas || Object.keys(cama.rutinas).length === 0;
  return !cama.esPacienteCelador && sinAtributos && sinRutinas;
}

/**
 * Abre la ventana de Nivel 2 para trasladar la información de una cama a otra.
 * @param {Object} camaOrigen - Cama desde la que se traslada
 * @param {Array<Object>} todasLasCamas - Estado actual de todas las camas, para comprobar el destino
 * @param {Function} onConfirmarTraslado - Callback (unidadDestino, camaDestinoId) al confirmar
 */
export function openTrasladoModal(camaOrigen, todasLasCamas, onConfirmarTraslado) {
  document.body.classList.add('modal-open');

  /** @type {string|null} */
  let selectedUnidad = null;
  /** @type {string|null} */
  let selectedCama = null;

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay level-2-overlay';

  modalOverlay.innerHTML = `
    <div class="modal-card modal-level-2 traslado-modal-card">
      <header class="modal-header-generic">
        <h3>Trasladar desde Cama ${camaOrigen.id}</h3>
      </header>

      <div class="editor-cama-body" id="traslado-body"></div>

      <footer class="modal-footer-5050">
        <button type="button" class="btn-modal-cancel" id="btn-traslado-cancel">Cancelar</button>
        <button type="button" class="btn-modal-accept" id="btn-traslado-accept" disabled>Aceptar</button>
      </footer>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const bodyEl = modalOverlay.querySelector('#traslado-body');
  const btnAccept = /** @type {HTMLButtonElement} */ (modalOverlay.querySelector('#btn-traslado-accept'));

  function updateAcceptState() {
    btnAccept.disabled = !(selectedUnidad && selectedCama);
  }

  /** Obtiene el primer dígito disponible por categoría en la unidad seleccionada */
  function getCamaInicialDeUnidad() {
    const camas = getCamasByUnidad(selectedUnidad).filter(id => !(selectedUnidad === camaOrigen.unidadId && id === camaOrigen.id));
    if (camas.length === 0) return null;

    // Devuelve el primer ID de cama completo (ej. 130A) para que los dígitos se muestren
    return camas[0];
  }

  function render() {
    if (!bodyEl) return;

    const camasValidas = selectedUnidad 
      ? getCamasByUnidad(selectedUnidad).filter(id => !(selectedUnidad === camaOrigen.unidadId && id === camaOrigen.id))
      : [];

    // Si no hay unidad, los dígitos aparecen como guiones. Si hay unidad, se inicializa a la primera cama.
    if (selectedUnidad && !selectedCama) {
      const inicial = getCamaInicialDeUnidad();
      if (inicial) selectedCama = inicial;
    }

    const curCentena = selectedCama ? selectedCama.charAt(0) : '-';
    const curDecena = selectedCama ? selectedCama.charAt(1) : '-';
    const curUnidad = selectedCama ? selectedCama.charAt(2) : '-';
    const curLetra = selectedCama ? (selectedCama.charAt(3) || '—') : '—';

    const centenas = [...new Set(camasValidas.map(c => c.charAt(0)))];
    const decenas = [...new Set(camasValidas.filter(c => !selectedCama || c.charAt(0) === curCentena).map(c => c.charAt(1)))];
    const prefixDecena = selectedCama ? `${curCentena}${curDecena}` : '';
    const unidadesDigito = [...new Set(camasValidas.filter(c => !prefixDecena || c.startsWith(prefixDecena)).map(c => c.charAt(2)))];
    const prefixRoom = selectedCama ? `${curCentena}${curDecena}${curUnidad}` : '';
    const letras = [...new Set(camasValidas.filter(c => !prefixRoom || c.startsWith(prefixRoom)).map(c => c.charAt(3) || ''))];

    bodyEl.innerHTML = `
      <p class="editor-section-title">Selecciona unidad</p>
      <div class="traslado-unidades-grid">
        ${UNIDADES.map((/** @type {any} */ u) => `
          <button
            type="button"
            class="traslado-btn-unidad-color ${selectedUnidad === u.id ? 'activo' : ''}"
            data-unidad="${u.id}"
            style="background-color: ${selectedUnidad === u.id ? u.accentColor : u.bgPastel};"
            aria-label="${u.nombre}"
          ></button>
        `).join('')}
      </div>

      <p class="editor-section-title">Selecciona cama</p>
      <div class="location-module-grid">
        <div class="module-col">
          <span class="module-label">Centena</span>
          <button type="button" class="module-btn module-btn-plano" id="btn-digit-centena" disabled>${curCentena}</button>
        </div>
        <div class="module-col">
          <span class="module-label">Decena</span>
          <button type="button" class="module-btn module-btn-plano" id="btn-digit-decena" disabled>${curDecena}</button>
        </div>
        <div class="module-col">
          <span class="module-label">Unidad</span>
          <button type="button" class="module-btn module-btn-plano" id="btn-digit-unidad" disabled>${curUnidad}</button>
        </div>
        <div class="module-col">
          <span class="module-label">Cama</span>
          <button type="button" class="module-btn module-btn-plano" id="btn-digit-letra" disabled>${curLetra}</button>
        </div>
      </div>
    `;

    bodyEl.querySelectorAll('.traslado-btn-unidad-color').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-unidad');
        if (id && id !== selectedUnidad) {
          selectedUnidad = id;
          selectedCama = null;
          render();
          updateAcceptState();
        }
      });
    });

    // Habilitar botones de dígitos solo cuando hay unidad seleccionada
    if (selectedUnidad && camasValidas.length > 0) {
      const digitButtons = {
        centena: bodyEl.querySelector('#btn-digit-centena'),
        decena: bodyEl.querySelector('#btn-digit-decena'),
        unidad: bodyEl.querySelector('#btn-digit-unidad'),
        letra: bodyEl.querySelector('#btn-digit-letra')
      };

      digitButtons.centena.disabled = centenas.length <= 1;
      digitButtons.decena.disabled = decenas.length <= 1;
      digitButtons.unidad.disabled = unidadesDigito.length <= 1;
      digitButtons.letra.disabled = letras.length <= 1;

      digitButtons.centena.addEventListener('click', () => {
        const curIdx = centenas.indexOf(curCentena);
        if (curIdx === -1) return;
        const nextVal = centenas[(curIdx + 1) % centenas.length];
        const match = camasValidas.find(c => c.startsWith(nextVal));
        if (match) { selectedCama = match; render(); updateAcceptState(); }
      });

      digitButtons.decena.addEventListener('click', () => {
        const curIdx = decenas.indexOf(curDecena);
        if (curIdx === -1) return;
        const nextVal = decenas[(curIdx + 1) % decenas.length];
        const match = camasValidas.find(c => c.startsWith(`${curCentena}${nextVal}`));
        if (match) { selectedCama = match; render(); updateAcceptState(); }
      });

      digitButtons.unidad.addEventListener('click', () => {
        const curIdx = unidadesDigito.indexOf(curUnidad);
        if (curIdx === -1) return;
        const nextVal = unidadesDigito[(curIdx + 1) % unidadesDigito.length];
        const match = camasValidas.find(c => c.startsWith(`${curCentena}${curDecena}${nextVal}`));
        if (match) { selectedCama = match; render(); updateAcceptState(); }
      });

      digitButtons.letra.addEventListener('click', () => {
        const curIdx = letras.indexOf(curLetra);
        if (curIdx === -1) return;
        const nextVal = letras[(curIdx + 1) % letras.length];
        const match = camasValidas.find(c => c.startsWith(`${curCentena}${curDecena}${curUnidad}${nextVal}`));
        if (match) { selectedCama = match; render(); updateAcceptState(); }
      });
    }
  }

  render();
  updateAcceptState();

  const cerrar = () => {
    modalOverlay.remove();
    if (!document.querySelector('.modal-overlay')) {
      document.body.classList.remove('modal-open');
    }
    // 🔥 NUEVO: Restaurar scroll al cerrar el traslado sin acción
    const container = document.getElementById('app');
    if (container && window.scrollPositionBeforeUpdate && window.scrollPositionBeforeUpdate > 0) {
      const maxScroll = container.scrollHeight - container.clientHeight;
      const targetScroll = Math.min(window.scrollPositionBeforeUpdate, maxScroll);
      container.scrollTop = targetScroll;
      console.log(`🔄 [TRASLADO] Scroll restaurado a: ${targetScroll}px`);
      window.scrollPositionBeforeUpdate = 0;
    }
  };

  modalOverlay.querySelector('#btn-traslado-cancel')?.addEventListener('click', cerrar);

  btnAccept.addEventListener('click', () => {
    if (!selectedUnidad || !selectedCama) return;

    const camaDestino = todasLasCamas.find(c => c.id === selectedCama && c.unidadId === selectedUnidad);
    const destinoLibre = estaVacia(camaDestino);

    if (destinoLibre) {
      openConfirmModal({
        titulo: 'Confirmar Traslado',
        mensaje: `¿Deseas trasladar la información de la Cama ${camaOrigen.id} a la Cama ${selectedCama}?`,
        textoCancelar: 'Cancelar',
        textoAceptar: 'Aceptar',
        onAceptar: () => {
          onConfirmarTraslado(selectedUnidad, selectedCama);
          cerrar();
        }
      });
    } else {
      const resumen = [];
      if (camaDestino.esPacienteCelador) resumen.push('Paciente de celador');
      const numAtributos = Object.values(camaDestino.atributos || {}).filter(Boolean).length;
      if (numAtributos > 0) resumen.push(`${numAtributos} atributo(s)`);
      const numRutinas = Object.keys(camaDestino.rutinas || {}).length;
      if (numRutinas > 0) resumen.push(`${numRutinas} rutina(s) de sedestación`);
      const detalle = resumen.length > 0 ? resumen.join(', ') : 'información asociada';

      openConfirmModal({
        titulo: 'Confirmar Intercambio',
        mensaje: `La Cama ${selectedCama} ya contiene información (${detalle}). ¿Deseas intercambiar los datos entre la Cama ${camaOrigen.id} y la Cama ${selectedCama}?`,
        textoCancelar: 'Cancelar',
        textoAceptar: 'Aceptar',
        onAceptar: () => {
          onConfirmarTraslado(selectedUnidad, selectedCama);
          cerrar();
        }
      });
    }
  });
}