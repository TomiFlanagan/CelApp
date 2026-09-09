/**
 * confirmModal.js - Modal de Nivel 3
 * Acciones de Confirmación y Edición Táctil de Selección (Zero Free-Text).
 * Implementa la botonera inferior 50/50 (Cancelar / Aceptar).
 * Flat UI 2013 - Estilos inline
 */

/**
 * Muestra una ventana de confirmación auxiliar de Nivel 3.
 * @param {Object} options
 * @param {string} options.titulo - Título del aviso
 * @param {string} options.mensaje - Texto explicativo
 * @param {string} [options.textoCancelar='Cancelar'] - Texto del botón secundario
 * @param {string} [options.textoAceptar='Aceptar'] - Texto del botón principal
 * @param {Function} [options.onAceptar] - Callback ejecutado al confirmar
 * @param {Function} [options.onCancelar] - Callback ejecutado al cancelar
 * @param {boolean} [options.showInputs=false] - Indica si se deben renderizar inputs de contraseña para cambios de cuenta
 * @param {{label: string, placeholder?: string}} [options.campoTexto] - Si se indica, renderiza un único campo de texto genérico; onAceptar recibe su valor
 */
export function openConfirmModal({
  titulo = 'Confirmación',
  mensaje = '¿Estás seguro?',
  textoCancelar = 'Cancelar',
  textoAceptar = 'Aceptar',
  onAceptar,
  onCancelar,
  showInputs = false,
  campoTexto = null
}) {
  document.body.classList.add('modal-open');

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay level-3-overlay';
  
  let inputsHTML = '';
  if (showInputs) {
    inputsHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 12px; padding: 0 1rem;">
        <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
          <label style="font-size: 0.75rem; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 0.03em;">Contraseña Actual</label>
          <input type="password" id="input-pwd-actual" placeholder="••••••••" style="padding: 10px; border: 1px solid #d1d5db; border-radius: 0; font-size: 0.9rem; outline: none; -webkit-tap-highlight-color: transparent;" />
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
          <label style="font-size: 0.75rem; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 0.03em;">Nueva Contraseña</label>
          <input type="password" id="input-pwd-nueva" placeholder="••••••••" style="padding: 10px; border: 1px solid #d1d5db; border-radius: 0; font-size: 0.9rem; outline: none; -webkit-tap-highlight-color: transparent;" />
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
          <label style="font-size: 0.75rem; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 0.03em;">Confirmar Nueva Contraseña</label>
          <input type="password" id="input-pwd-confirmar" placeholder="••••••••" style="padding: 0.625rem; border: 1px solid #d1d5db; border-radius: 0; font-size: 0.9rem; outline: none; -webkit-tap-highlight-color: transparent;" />
        </div>
      </div>
    `;
  } else if (campoTexto) {
    inputsHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 12px; padding: 0 1rem;">
        <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
          <label style="font-size: 0.75rem; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 0.03em;">${campoTexto.label || ''}</label>
          <input type="text" id="input-campo-texto" placeholder="${campoTexto.placeholder || ''}" style="padding: 0.625rem; border: 1px solid #d1d5db; border-radius: 0; font-size: 0.9rem; outline: none; -webkit-tap-highlight-color: transparent;" />
        </div>
      </div>
    `;
  }

  modalOverlay.innerHTML = `
  <div class="modal-card modal-level-3" style="border-radius: 0; box-shadow: none; width: 90%; max-width: 360px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
    
    <!-- Cabecera Flat UI: con línea inferior separadora -->
    <div class="modal-header-l3" style="border-bottom: 1px solid #e5e7eb; padding: 0.85rem 1rem; background: #ffffff; flex-shrink: 0;">
      <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #171717;">${titulo}</h3>
    </div>
    
    <!-- Cuerpo del modal con el mensaje -->
    <div style="padding: 1rem 1rem 1.5rem 1rem; flex: 1;">
      <p style="margin: 0; font-size: 0.95rem; color: #737373; line-height: 1.5;">${mensaje}</p>
      ${inputsHTML ? `<div style="margin-top: 0.75rem;">${inputsHTML}</div>` : ''}
    </div>
    
    <!-- Botonera Edge-to-Edge 50/50 (sin línea divisoria) -->
    <div class="modal-footer-5050" style="display: flex; width: 100%; border-top: none; flex-shrink: 0; margin-top: 0;">
      <button type="button" class="btn-modal-cancel" id="btn-confirm-cancel" style="flex: 1; min-height: 48px; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; background-color: #f3f4f6; color: #171717; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">${textoCancelar}</button>
      <button type="button" class="btn-modal-accept" id="btn-confirm-accept" style="flex: 1; min-height: 48px; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; background-color: #171717; color: #ffffff; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">${textoAceptar}</button>
    </div>
  </div>
`;

  document.body.appendChild(modalOverlay);

  const cerrar = () => {
    modalOverlay.remove();
    if (!document.querySelector('.modal-overlay')) {
      document.body.classList.remove('modal-open');
    }
    // 🔥 NUEVO: Restaurar scroll al cerrar sin acción
    const container = document.getElementById('app');
    if (container && window.scrollPositionBeforeUpdate && window.scrollPositionBeforeUpdate > 0) {
      const maxScroll = container.scrollHeight - container.clientHeight;
      const targetScroll = Math.min(window.scrollPositionBeforeUpdate, maxScroll);
      container.scrollTop = targetScroll;
      console.log(`🔄 [CONFIRM] Scroll restaurado a: ${targetScroll}px`);
      window.scrollPositionBeforeUpdate = 0;
    }
  };

  modalOverlay.querySelector('#btn-confirm-cancel').addEventListener('click', () => {
    if (onCancelar) onCancelar();
    cerrar();
  });

  modalOverlay.querySelector('#btn-confirm-accept').addEventListener('click', () => {
    if (showInputs) {
      const actual = /** @type {HTMLInputElement} */ (modalOverlay.querySelector('#input-pwd-actual'))?.value || '';
      const nueva = /** @type {HTMLInputElement} */ (modalOverlay.querySelector('#input-pwd-nueva'))?.value || '';
      const confirmar = /** @type {HTMLInputElement} */ (modalOverlay.querySelector('#input-pwd-confirmar'))?.value || '';
      if (onAceptar) onAceptar({ actual, nueva, confirmar });
    } else if (campoTexto) {
      const valor = (/** @type {HTMLInputElement} */ (modalOverlay.querySelector('#input-campo-texto'))?.value || '').trim();
      if (onAceptar) onAceptar(valor);
    } else {
      if (onAceptar) onAceptar();
    }
    cerrar();
  });
}

/**
 * Muestra una ventana auxiliar de Nivel 3 para modificar la cantidad de existencias.
 * @param {Object} options
 * @param {string} options.titulo - Nombre del material
 * @param {string} options.subtitulo - Nombre de la unidad
 * @param {number} options.valorInicial - Stock actual
 * @param {Function} options.onAceptar - Callback con la nueva cantidad consolidada
 */
export function openCantidadEditModal({ titulo, subtitulo, valorInicial = 0, onAceptar }) {
  document.body.classList.add('modal-open');

  let cantidad = valorInicial;

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay level-3-overlay';
  modalOverlay.innerHTML = `
  <div class="modal-card modal-level-3" style="border-radius: 0; box-shadow: none; width: 90%; max-width: 360px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
    
    <!-- Cabecera Flat UI: con línea inferior separadora -->
    <div class="modal-header-l3" style="border-bottom: 1px solid #e5e7eb; padding: 0.85rem 1rem; background: #ffffff; flex-shrink: 0;">
      <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #171717;">${titulo}</h3>
    </div>
    
    <!-- Stepper con padding inferior para separar de la botonera -->
    <div style="padding: 1rem 1rem 1.5rem 1rem; display: flex; justify-content: center; flex: 1;">
      <div class="stepper-container" style="display: flex; align-items: center; justify-content: center; gap: 1.5rem; padding: 0.5rem 0;">
        <button type="button" class="btn-step" id="btn-step-minus" aria-label="Disminuir" style="width: 48px; height: 48px; min-height: 48px; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 0; font-size: 1.5rem; font-weight: 700; color: #171717; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">-</button>
        <span class="stepper-value" id="stepper-val" style="font-size: 1.8rem; font-weight: 700; color: #171717; min-width: 48px; text-align: center;">${cantidad}</span>
        <button type="button" class="btn-step" id="btn-step-plus" aria-label="Aumentar" style="width: 48px; height: 48px; min-height: 48px; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 0; font-size: 1.5rem; font-weight: 700; color: #171717; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">+</button>
      </div>
    </div>
    
    <!-- Botonera Edge-to-Edge 50/50 (sin línea divisoria) -->
    <div class="modal-footer-5050" style="display: flex; width: 100%; border-top: none; flex-shrink: 0; margin-top: 0;">
      <button type="button" class="btn-modal-cancel" id="btn-modal-cancel" style="flex: 1; min-height: 48px; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; background-color: #f3f4f6; color: #171717; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">Cancelar</button>
      <button type="button" class="btn-modal-accept" id="btn-modal-accept" style="flex: 1; min-height: 48px; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; background-color: #171717; color: #ffffff; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">Aceptar</button>
    </div>
  </div>
`;

  document.body.appendChild(modalOverlay);

  const valEl = modalOverlay.querySelector('#stepper-val');
  const btnMinus = modalOverlay.querySelector('#btn-step-minus');
  const btnPlus = modalOverlay.querySelector('#btn-step-plus');
  const btnCancel = modalOverlay.querySelector('#btn-modal-cancel');
  const btnAccept = modalOverlay.querySelector('#btn-modal-accept');

  const updateDisplay = () => {
    if (valEl) valEl.textContent = String(cantidad);
    if (btnMinus) btnMinus.disabled = cantidad <= 0;
  };

  btnMinus.addEventListener('click', () => {
    if (cantidad > 0) {
      cantidad--;
      updateDisplay();
    }
  });

  btnPlus.addEventListener('click', () => {
    cantidad++;
    updateDisplay();
  });

  const cerrar = () => {
    modalOverlay.remove();
    if (!document.querySelector('.modal-overlay')) {
      document.body.classList.remove('modal-open');
    }
  };

  btnCancel.addEventListener('click', cerrar);

  btnAccept.addEventListener('click', () => {
    if (onAceptar) onAceptar(cantidad);
    cerrar();
  });

  updateDisplay();
}