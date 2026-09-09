/**
 * editorCamaModal.js - Modal de Nivel 2
 * Editor de camas para actualización operativa rápida.
 * Disposición vertical única sin pestañas, restricción Zero Free-Text y botonera 50/50.
 * Flat UI 2013: Sin colores de unidades, sin marcos en botones.
 * Rutinas en 2 columnas con botones compactos solo-icono.
 */

import { getUnidadById } from '../../config/unidades.js';
import { FRANJAS } from '../../config/franjas.js';
import { ATRIBUTOS } from '../../config/atributos.js';
import { openConfirmModal } from './confirmModal.js';

/**
 * Abre la ventana modal de Nivel 2 para editar los atributos, paciente y sedestación de una cama.
 * @param {Object} cama - Datos actuales de la cama seleccionada
 * @param {Function} onSave - Callback que recibe la cama con los datos actualizados
 */
export function openEditorCamaModal(cama, onSave) {
  document.body.classList.add('modal-open');

  const unidad = getUnidadById(cama.unidadId) || {};

  // Estado borrador aislado para cambios locales
  const draftState = {
    esPacienteCelador: Boolean(cama.esPacienteCelador),
    atributos: { ...(cama.atributos || {}) },
    rutinas: { ...(cama.rutinas || {}) }
  };

  const initialJSON = JSON.stringify(draftState);

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay level-2-overlay';

  // Dividimos las franjas en dos mitades para mostrarlas en 2 columnas
  const mitad = Math.ceil(FRANJAS.length / 2);
  const franjasCol1 = FRANJAS.slice(0, mitad);
  const franjasCol2 = FRANJAS.slice(mitad);

  modalOverlay.innerHTML = `
    <div class="modal-card modal-level-2 editor-cama-card">
      <!-- Cabecera estándar del Flat UI: Solo título, en negro sobre blanco -->
      <header class="modal-header-generic">
        <h3>Cama ${cama.id} · ${unidad.nombre || 'Unidad'}</h3>
      </header>

      <!-- Disposición vertical única sin pestañas (Zero Free-Text) -->
      <div class="editor-cama-body">
        <!-- Bloque 1: Paciente de Celador (Icono plano alineado con cuadrícula de 4) -->
        <section class="editor-section">
          <h4 class="editor-section-title">Paciente de Celador</h4>
          <div class="editor-iconos-grid" id="icono-paciente-container">
            <button type="button" class="icono-filtro-plano ${draftState.esPacienteCelador ? 'activo' : 'inactivo'}" id="btn-toggle-paciente" title="Paciente de Celador" aria-label="Paciente de Celador">
              <img src="assets/icons/attributes/user-check.svg" alt="Paciente de Celador" class="icono-plano-img" />
            </button>
          </div>
        </section>

        <!-- Bloque 2: Equipamiento (Iconos planos, 2 filas de 4) -->
        <section class="editor-section">
          <h4 class="editor-section-title">Equipamiento</h4>
          <div class="editor-iconos-grid" id="atributos-grid">
            ${ATRIBUTOS.map((/** @type {any} */ attr) => {
              const active = Boolean(draftState.atributos[attr.id]);
              return `
                <button type="button" class="icono-filtro-plano ${active ? 'activo' : 'inactivo'}" data-attr="${attr.id}" title="${attr.label}" aria-label="${attr.label}">
                  <img src="${attr.icon}" alt="${attr.label}" class="icono-plano-img" />
                </button>
              `;
            }).join('')}
          </div>
        </section>

        <!-- Bloque 3: Rutina de Sedestación (En 2 columnas, botón solo-icono) -->
        <section class="editor-section editor-section-rutinas">
          <h4 class="editor-section-title">Rutina de Sedestación</h4>
          <div class="editor-rutinas-2col" id="rutinas-table">
            <div class="rutinas-columna">
              ${franjasCol1.map((/** @type {any} */ franja) => {
                const estado = draftState.rutinas[franja.id] || 'nada';
                return renderRutinaRow(franja, estado);
              }).join('')}
            </div>
            <div class="rutinas-columna">
              ${franjasCol2.map((/** @type {any} */ franja) => {
                const estado = draftState.rutinas[franja.id] || 'nada';
                return renderRutinaRow(franja, estado);
              }).join('')}
            </div>
          </div>
        </section>
      </div>

      <!-- Botonera Edge-to-Edge 50/50 -->
      <footer class="modal-footer-5050">
        <button type="button" class="btn-modal-cancel" id="btn-editor-cancel">Cancelar</button>
        <button type="button" class="btn-modal-accept" id="btn-editor-accept">Aceptar</button>
      </footer>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const btnTogglePaciente = modalOverlay.querySelector('#btn-toggle-paciente');
  const atributosGrid = modalOverlay.querySelector('#atributos-grid');
  const rutinasTable = modalOverlay.querySelector('#rutinas-table');
  const btnCancel = modalOverlay.querySelector('#btn-editor-cancel');
  const btnAccept = modalOverlay.querySelector('#btn-editor-accept');

  // Toggle Paciente de Celador (Icono plano)
  btnTogglePaciente?.addEventListener('click', () => {
    draftState.esPacienteCelador = !draftState.esPacienteCelador;
    btnTogglePaciente.classList.toggle('activo', draftState.esPacienteCelador);
    btnTogglePaciente.classList.toggle('inactivo', !draftState.esPacienteCelador);
  });

  // Matriz de Atributos (Iconos planos)
  atributosGrid?.addEventListener('click', (/** @type {any} */ e) => {
    const btn = e.target.closest('.icono-filtro-plano');
    if (!btn) return;
    const attrId = btn.dataset.attr;
    draftState.atributos[attrId] = !draftState.atributos[attrId];
    btn.classList.toggle('activo', draftState.atributos[attrId]);
    btn.classList.toggle('inactivo', !draftState.atributos[attrId]);
  });

  // Tabla de Sedestación (Ciclo triestado: nada -> levantar -> acostar -> nada)
  rutinasTable?.addEventListener('click', (/** @type {any} */ e) => {
    const btn = e.target.closest('.btn-tristate');
    if (!btn) return;
    const franjaId = btn.dataset.franja;
    const actual = draftState.rutinas[franjaId] || 'nada';
    
    let siguiente = 'nada';
    if (actual === 'nada') siguiente = 'levantar';
    else if (actual === 'levantar') siguiente = 'acostar';
    else if (actual === 'acostar') siguiente = 'nada';

    draftState.rutinas[franjaId] = siguiente;

    const franjaObj = FRANJAS.find((/** @type {any} */ f) => f.id === franjaId);
    const rowOld = btn.closest('.rutina-row');
    if (rowOld && franjaObj) {
      rowOld.outerHTML = renderRutinaRow(franjaObj, siguiente);
    }
  });

  const cerrar = () => {
    modalOverlay.remove();
    if (!document.querySelector('.modal-overlay')) {
      document.body.classList.remove('modal-open');
    }
    // 🔥 NUEVO: Restaurar scroll al cerrar sin cambios
    const container = document.getElementById('app');
    if (container && window.scrollPositionBeforeUpdate && window.scrollPositionBeforeUpdate > 0) {
      const maxScroll = container.scrollHeight - container.clientHeight;
      const targetScroll = Math.min(window.scrollPositionBeforeUpdate, maxScroll);
      container.scrollTop = targetScroll;
      console.log(`🔄 [EDITOR] Scroll restaurado a: ${targetScroll}px`);
      window.scrollPositionBeforeUpdate = 0;
    }
  };

  const isDirty = () => JSON.stringify(draftState) !== initialJSON;

  // Cierre con comprobación de cambios
  btnCancel?.addEventListener('click', () => {
    if (isDirty()) {
      openConfirmModal({
        titulo: 'Descartar cambios',
        mensaje: '¿Deseas salir sin guardar los cambios del editor?',
        textoCancelar: 'Cancelar',
        textoAceptar: 'Aceptar',
        onAceptar: cerrar
      });
    } else {
      cerrar();
    }
  });

  // Guardado consolidado depurando valores 'nada'
  btnAccept?.addEventListener('click', () => {
    if (onSave) {
      const rutinasLimpias = {};
      Object.entries(draftState.rutinas).forEach(([franjaId, accion]) => {
        if (accion && accion !== 'nada') {
          rutinasLimpias[franjaId] = accion;
        }
      });

      onSave({
        ...cama,
        esPacienteCelador: draftState.esPacienteCelador,
        atributos: draftState.atributos,
        rutinas: rutinasLimpias
      });
    }
    cerrar();
  });
}

/**
 * Renderiza la fila de una franja horaria en la rutina de sedestación
 * @param {Object} franja
 * @param {string} estado
 */
function renderRutinaRow(franja, estado) {
  let btnClass = 'btn-tristate state-nada';
  let iconHtml = '';

  if (estado === 'levantar') {
    btnClass = 'btn-tristate state-levantar';
    iconHtml = `<img src="assets/icons/navigation/levantar.svg" alt="Levantar" class="icon-sm" />`;
  } else if (estado === 'acostar') {
    btnClass = 'btn-tristate state-acostar';
    iconHtml = `<img src="assets/icons/navigation/acostar.svg" alt="Acostar" class="icon-sm" />`;
  }

  return `
    <div class="rutina-row">
      <span class="rutina-row-name">${franja.nombre}</span>
      <button type="button" class="${btnClass}" data-franja="${franja.id}">
        ${estado === 'nada' ? `<span class="texto-nada">Nada</span>` : iconHtml}
      </button>
    </div>
  `;
}