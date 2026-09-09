/**
 * js/components/modals/filtrosModal.js
 * Modal de Nivel 2: Filtros avanzados con lógica Y/O.
 * Respeta idénticas dimensiones, iconos, retícula y botonera 50/50 que editorCamaModal.js.
 */

import { FRANJAS } from '../../config/franjas.js';
import { ATRIBUTOS } from '../../config/atributos.js';
import { openConfirmModal } from './confirmModal.js';

/**
 * Obtiene el nombre visible de la franja horaria o el estado por defecto.
 * @param {string|null} franjaId
 * @returns {string}
 */
function getFranjaNombre(franjaId) {
  if (!franjaId) return 'Todas las franjas';
  const f = FRANJAS.find((/** @type {any} */ item) => item.id === franjaId);
  return f ? f.nombre : 'Todas las franjas';
}

/**
 * Devuelve el siguiente id de franja en el ciclo ordenado.
 * @param {string|null} currentId
 * @returns {string|null}
 */
function getNextFranjaId(currentId) {
  if (!currentId) {
    return FRANJAS[0]?.id || null;
  }
  const currentIndex = FRANJAS.findIndex((/** @type {any} */ f) => f.id === currentId);
  if (currentIndex === -1 || currentIndex === FRANJAS.length - 1) {
    return null;
  }
  return FRANJAS[currentIndex + 1].id;
}

/**
 * Abre la ventana modal de Nivel 2 para configurar los filtros avanzados (Y/O).
 * @param {Object} currentFiltros - Filtros actualmente aplicados
 * @param {Function} onApply - Callback al pulsar Aceptar con el estado de filtros
 * @param {Function} [onClear] - Callback al confirmar la limpieza de filtros
 */
export function openFiltrosModal(currentFiltros = {}, onApply, onClear) {
  document.body.classList.add('modal-open');

  // Estado borrador aislado para los filtros
  const draftState = {
    esPacienteCelador: Boolean(currentFiltros.esPacienteCelador),
    atributos: { ...(currentFiltros.atributos || {}) },
    operador: currentFiltros.operador || 'O',
    rutinas: {
      levantar: currentFiltros.rutinas?.levantar || null,
      acostar: currentFiltros.rutinas?.acostar || null
    }
  };

  const initialJSON = JSON.stringify(draftState);

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';

  // Iconos de celador y atributos en 2 filas de 4 columnas
  const allIcons = ATRIBUTOS; // 7 iconos, dejamos 1 hueco vacío en la última celda

  modalOverlay.innerHTML = `
    <div class="modal-card modal-level-2 filtros-modal-card">
      <!-- Cabecera: Solo título "Filtros", sin subtítulos ni iconos -->
      <header class="modal-header-generic">
        <h3>Filtros</h3>
      </header>

      <!-- Cuerpo del Modal (Sin bordes, todo plano) -->
      <div class="filtros-cuerpo">
        
        <!-- Fila 1: Lógica Y/O + Icono Papelera -->
        <div class="filtros-fila-superior">
          <div class="operadores-yo" id="operator-container">
            <button type="button" class="btn-operador-plano ${draftState.operador === 'O' ? 'activo' : 'inactivo'}" data-op="O">O</button>
            <button type="button" class="btn-operador-plano ${draftState.operador === 'Y' ? 'activo' : 'inactivo'}" data-op="Y">Y</button>
          </div>
          <button type="button" id="btn-limpiar-filtros" class="icono-papelera" aria-label="Limpiar filtros" title="Limpiar filtros">
            <img src="assets/icons/navigation/trash-2.svg" alt="Limpiar" />
          </button>
        </div>

        <!-- Fila 2: Iconos de Celador y Atributos (Sin marcos, en gris o negro) -->
        <div class="filtros-iconos-grid" id="filtros-atributos-grid">
          
          <!-- Botón de Celador -->
          <button type="button" class="icono-filtro-plano ${draftState.esPacienteCelador ? 'activo' : 'inactivo'}" id="btn-toggle-paciente-filtro" title="Paciente de Celador">
            <img src="assets/icons/attributes/user-check.svg" alt="Paciente de Celador" class="icono-plano-img" />
          </button>

          ${allIcons.map((/** @type {any} */ attr) => {
            const active = Boolean(draftState.atributos[attr.id]);
            return `
              <button type="button" class="icono-filtro-plano ${active ? 'activo' : 'inactivo'}" data-attr="${attr.id}" title="${attr.label}" aria-label="${attr.label}">
                <img src="${attr.icon}" alt="${attr.label}" class="icono-plano-img" />
              </button>
            `;
          }).join('')}
          
        </div>

        <!-- Fila 3: Rutinas de Sedestación (Botones sin marco, resalte en blanco) -->
        <div class="filtros-rutinas">
          <div class="rutina-fila">
            <img src="assets/icons/navigation/levantar.svg" alt="Levantar" class="icono-rutina-plano" />
            <span class="texto-rutina">Levantar</span>
            <button type="button" class="btn-franja-plano ${draftState.rutinas.levantar ? 'franja-activa' : 'franja-inactiva'}" id="btn-rutina-filtro-levantar" data-tipo="levantar">
              <span>${getFranjaNombre(draftState.rutinas.levantar)}</span>
            </button>
          </div>
          <div class="rutina-fila">
            <img src="assets/icons/navigation/acostar.svg" alt="Acostar" class="icono-rutina-plano" />
            <span class="texto-rutina">Acostar</span>
            <button type="button" class="btn-franja-plano ${draftState.rutinas.acostar ? 'franja-activa' : 'franja-inactiva'}" id="btn-rutina-filtro-acostar" data-tipo="acostar">
              <span>${getFranjaNombre(draftState.rutinas.acostar)}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Botonera Edge-to-Edge 50/50 -->
      <footer class="modal-footer-5050">
        <button type="button" class="btn-modal-cancel" id="btn-filtros-cancel">Cancelar</button>
        <button type="button" class="btn-modal-accept" id="btn-filtros-accept">Aceptar</button>
      </footer>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const btnLimpiar = modalOverlay.querySelector('#btn-limpiar-filtros');
  const operatorContainer = modalOverlay.querySelector('#operator-container');
  const btnTogglePaciente = modalOverlay.querySelector('#btn-toggle-paciente-filtro');
  const atributosGrid = modalOverlay.querySelector('#filtros-atributos-grid');
  const rutinasTable = modalOverlay.querySelector('.filtros-rutinas');
  const btnCancel = modalOverlay.querySelector('#btn-filtros-cancel');
  const btnAccept = modalOverlay.querySelector('#btn-filtros-accept');

  // Selección de operador Y / O (Intercambio de estados)
  operatorContainer?.addEventListener('click', (e) => {
    const btn = (/** @type {HTMLElement} */ (e.target)).closest('.btn-operador-plano');
    if (!btn) return;
    const op = (/** @type {HTMLButtonElement} */ (btn)).dataset.op;
    draftState.operador = op;

    operatorContainer.querySelectorAll('.btn-operador-plano').forEach(b => {
      b.classList.toggle('activo', (/** @type {HTMLButtonElement} */ (b)).dataset.op === op);
      b.classList.toggle('inactivo', (/** @type {HTMLButtonElement} */ (b)).dataset.op !== op);
    });
  });

  // Toggle Paciente de Celador
  btnTogglePaciente?.addEventListener('click', () => {
    draftState.esPacienteCelador = !draftState.esPacienteCelador;
    btnTogglePaciente.classList.toggle('activo', draftState.esPacienteCelador);
    btnTogglePaciente.classList.toggle('inactivo', !draftState.esPacienteCelador);
  });

  // Toggle Atributos
  atributosGrid?.addEventListener('click', (e) => {
    const btn = (/** @type {HTMLElement} */ (e.target)).closest('.icono-filtro-plano');
    if (!btn) return;
    const attrId = (/** @type {HTMLButtonElement} */ (btn)).dataset.attr;
    if (attrId) {
      draftState.atributos[attrId] = !draftState.atributos[attrId];
      btn.classList.toggle('activo', Boolean(draftState.atributos[attrId]));
      btn.classList.toggle('inactivo', !draftState.atributos[attrId]);
    }
  });

  // Selector de Rutinas de Sedestación
  rutinasTable?.addEventListener('click', (e) => {
    const btn = (/** @type {HTMLElement} */ (e.target)).closest('.btn-franja-plano');
    if (!btn) return;
    const tipo = (/** @type {HTMLButtonElement} */ (btn)).dataset.tipo;
    if (tipo === 'levantar' || tipo === 'acostar') {
      const nextFranja = getNextFranjaId(draftState.rutinas[tipo]);
      draftState.rutinas[tipo] = nextFranja;

      const span = btn.querySelector('span');
      if (span) span.textContent = getFranjaNombre(nextFranja);

      btn.classList.toggle('franja-activa', Boolean(nextFranja));
      btn.classList.toggle('franja-inactiva', !nextFranja);
    }
  });

  // Acción Limpiar filtros
  btnLimpiar?.addEventListener('click', () => {
    draftState.esPacienteCelador = false;
    draftState.atributos = {};
    draftState.operador = 'O';
    draftState.rutinas = { levantar: null, acostar: null };

    operatorContainer?.querySelectorAll('.btn-operador-plano').forEach(b => {
      b.classList.toggle('activo', (/** @type {HTMLButtonElement} */ (b)).dataset.op === 'O');
      b.classList.toggle('inactivo', (/** @type {HTMLButtonElement} */ (b)).dataset.op !== 'O');
    });

    if (btnTogglePaciente) {
      btnTogglePaciente.classList.remove('activo');
      btnTogglePaciente.classList.add('inactivo');
    }

    atributosGrid?.querySelectorAll('.icono-filtro-plano').forEach(b => {
      b.classList.remove('activo');
      b.classList.add('inactivo');
    });

    const btnLevantar = modalOverlay.querySelector('#btn-rutina-filtro-levantar');
    if (btnLevantar) {
      btnLevantar.classList.remove('franja-activa');
      btnLevantar.classList.add('franja-inactiva');
      const span = btnLevantar.querySelector('span');
      if (span) span.textContent = getFranjaNombre(null);
    }

    const btnAcostar = modalOverlay.querySelector('#btn-rutina-filtro-acostar');
    if (btnAcostar) {
      btnAcostar.classList.remove('franja-activa');
      btnAcostar.classList.add('franja-inactiva');
      const span = btnAcostar.querySelector('span');
      if (span) span.textContent = getFranjaNombre(null);
    }
  });

  const cerrar = () => {
    modalOverlay.remove();
    if (!document.querySelector('.modal-overlay')) {
      document.body.classList.remove('modal-open');
    }
  };

  const isDirty = () => JSON.stringify(draftState) !== initialJSON;

  // Cancelar
  btnCancel?.addEventListener('click', () => {
    if (isDirty()) {
      openConfirmModal({
        titulo: 'Descartar cambios',
        mensaje: '¿Deseas salir sin aplicar los cambios en los filtros?',
        textoCancelar: 'Cancelar',
        textoAceptar: 'Aceptar',
        onAceptar: cerrar
      });
    } else {
      cerrar();
    }
  });

  // Aceptar / Aplicar
  btnAccept?.addEventListener('click', () => {
    if (onApply) {
      onApply({ ...draftState });
    }
    const isVacio = !draftState.esPacienteCelador && 
                    Object.keys(draftState.atributos).length === 0 && 
                    !draftState.rutinas.levantar && 
                    !draftState.rutinas.acostar;
    
    if (isVacio && onClear) {
      onClear();
    }
    cerrar();
  });
}