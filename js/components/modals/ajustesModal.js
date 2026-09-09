/**
 * js/components/modals/ajustesModal.js
 * Modal de Nivel 2: Ajustes de la Aplicación, Preferencias de Usuario y Cuenta.
 * PUNTO 1: Estructura común Flat UI 2013
 * PUNTO 2: Sistema de pestañas Flat UI 2013
 * PUNTO 3.3: Estilo de secciones en mayúscula
 * PUNTO 4: Pestaña de Usuario - Opción A (3 columnas iguales)
 * PUNTO 5.1: Botón "Añadir Usuario" como icono plus.svg
 * PUNTO 5.2: Secciones plegables (estilo acordeón sin exclusividad)
 * PUNTO 5.3: Lista de usuarios estilo Flat UI (texto + iconos)
 * PUNTO 5.4: Flujo de usuarios (ACTIVO → SUSPENDIDO → INACTIVO)
 * PUNTO 5.5: Secciones de administración plegadas por defecto
 * PUNTO 5.6: Altura fija del modal (Opción C - cálculo dinámico)
 */

import { UNIDADES } from '../../config/unidades.js';
import { auth, getCurrentUser } from '../../services/auth.js';
import { storage } from '../../services/storage.js';
import { initAdminPanel } from './adminPanelModal.js';

/**
 * Abre el modal de ajustes con pestañas (Preferencias, Cuenta de usuario, Administración).
 * @param {Object} state
 * @param {Function} onSave
 * @param {Object|string} [callbacksOrTab={}]
 * @param {string} [tabInicialArg='preferencias']
 */
export function openAjustesModal(state, onSave, callbacksOrTab = {}, tabInicialArg = 'preferencias') {
  let callbacks = {};
  let tabInicial = 'preferencias';

  if (typeof callbacksOrTab === 'string') {
    tabInicial = callbacksOrTab;
  } else if (typeof callbacksOrTab === 'object' && callbacksOrTab !== null) {
    callbacks = callbacksOrTab;
    if (typeof tabInicialArg === 'string') {
      tabInicial = tabInicialArg;
    }
  }

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';

  const user = getCurrentUser();
  const isAdmin = user && user.rol === 'admin';
  // El objeto user (auth.js) no tiene campo 'nombre'; el identificador que el
  // celador reconoce (ej. "tjerez") es siempre la parte del email anterior a "@bsa.cat".
  const nombreUsuario = user?.email ? user.email.split('@')[0] : 'No disponible';
  const prefs = storage.getPreferencias();
  const defaultView = prefs.defaultView || state.currentView || 'unidades';
  const defaultUnitsUnidades = Array.isArray(prefs.defaultUnitsUnidades) ? prefs.defaultUnitsUnidades : (state.activeUnits || ['amarilla']);
  const defaultUnitsPeriodos = Array.isArray(prefs.defaultUnitsPeriodos) ? prefs.defaultUnitsPeriodos : (state.activeUnits || ['amarilla']);
  const showIndicadores = prefs.showIndicadores !== false;

    // ============================================================
  // PUNTO 1: ESTRUCTURA COMÚN FLAT UI 2013
  // - Cabecera genérica sin bordes decorativos
  // - Modal sin redondeos, sin sombras, 90% ancho
  // - Botonera 50/50 edge-to-edge
  // ============================================================
  // PUNTO 2: PESTAÑAS FLAT UI 2013
  // - Activa: fondo blanco (#ffffff), texto negro (#171717)
  // - Inactiva: fondo gris claro (#f3f4f6), texto gris oscuro (#737373)
  // - Responsivas: reparten espacio equitativamente (2 o 3 pestañas)
  // - Pegadas a la línea que separa cabecera del cuerpo
  // ============================================================
  modalOverlay.innerHTML = `
    <div class="modal-card modal-level-2 ajustes-modal-card" style="border-radius: 0; box-shadow: none; width: 90%; max-height: 90vh; background: #ffffff; display: flex; flex-direction: column; overflow: hidden;">
      
      <!-- Cabecera estándar Flat UI: solo título, sin bordes decorativos -->
<header class="modal-header-generic" style="border-bottom: 1px solid #e5e7eb; padding: 0.85rem 1rem; background: #ffffff; flex-shrink: 0;">
  <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #171717;">Ajustes</h3>
</header>

      <!-- Cuerpo del modal (scrollable) -->
      <div class="modal-body" style="padding: 0; display: flex; flex-direction: column; gap: 0.75rem; overflow-y: auto; flex: 1;">
        
<!-- Pestañas estilo Header (sin bordes ni redondeos, siempre visibles) -->
<div class="ajustes-tabs-2" style="display: flex; border-bottom: none; gap: 0; flex-shrink: 0;">
  <button class="ajuste-tab-btn-2 ${tabInicial === 'preferencias' ? 'active' : ''}" data-tab="preferencias" style="flex: 1; padding: 0.65rem 0.5rem; background-color: ${tabInicial === 'preferencias' ? '#ffffff' : '#f3f4f6'}; border: none; border-radius: 0; font-size: 0.85rem; font-weight: ${tabInicial === 'preferencias' ? '700' : '600'}; color: ${tabInicial === 'preferencias' ? '#171717' : '#737373'}; text-transform: uppercase; letter-spacing: 0.03em; cursor: pointer; text-align: center; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">Preferencias</button>
  <button class="ajuste-tab-btn-2 ${tabInicial === 'cuenta' ? 'active' : ''}" data-tab="cuenta" style="flex: 1; padding: 0.65rem 0.5rem; background-color: ${tabInicial === 'cuenta' ? '#ffffff' : '#f3f4f6'}; border: none; border-radius: 0; font-size: 0.85rem; font-weight: ${tabInicial === 'cuenta' ? '700' : '600'}; color: ${tabInicial === 'cuenta' ? '#171717' : '#737373'}; text-transform: uppercase; letter-spacing: 0.03em; cursor: pointer; text-align: center; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">Cuenta de usuario</button>
  ${isAdmin ? `<button class="ajuste-tab-btn-2 ${tabInicial === 'admin' ? 'active' : ''}" data-tab="admin" style="flex: 1; padding: 0.65rem 0.5rem; background-color: ${tabInicial === 'admin' ? '#ffffff' : '#f3f4f6'}; border: none; border-radius: 0; font-size: 0.85rem; font-weight: ${tabInicial === 'admin' ? '700' : '600'}; color: ${tabInicial === 'admin' ? '#171717' : '#737373'}; text-transform: uppercase; letter-spacing: 0.03em; cursor: pointer; text-align: center; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">Administración</button>` : ''}
</div>

        <!-- Contenido de las pestañas -->
        <div style="padding: 0 1rem 1rem 1rem; display: flex; flex-direction: column; gap: 0.75rem;">

        <div class="ajuste-tab-content ${tabInicial === 'preferencias' ? '' : 'hidden'}" id="tab-content-preferencias">
          
          <div class="form-group">
  <label style="font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; margin: 0;">Vista inicial:</label>
  <div class="unit-selector-chips" id="selector-default-view" style="display: flex; gap: 0; border: none;">
    <button type="button" class="unit-chip ${defaultView === 'unidades' ? 'selected' : ''}" data-view="unidades" style="flex: 1; padding: 0.65rem 0.5rem; border: none; border-radius: 0; background-color: ${defaultView === 'unidades' ? '#171717' : '#f3f4f6'}; color: ${defaultView === 'unidades' ? '#ffffff' : '#737373'}; font-size: 0.85rem; font-weight: ${defaultView === 'unidades' ? '700' : '600'}; cursor: pointer; text-align: center; outline: none; -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease;">Unidades</button>
    <button type="button" class="unit-chip ${defaultView === 'periodos' ? 'selected' : ''}" data-view="periodos" style="flex: 1; padding: 0.65rem 0.5rem; border: none; border-radius: 0; background-color: ${defaultView === 'periodos' ? '#171717' : '#f3f4f6'}; color: ${defaultView === 'periodos' ? '#ffffff' : '#737373'}; font-size: 0.85rem; font-weight: ${defaultView === 'periodos' ? '700' : '600'}; cursor: pointer; text-align: center; outline: none; -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease;">Jornada</button>
  </div>
</div>

          <div class="form-group">
            <label style="font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; margin: 0;">Unidades visibles por defecto en Vista por Unidades:</label>
            <div class="unit-selector-chips" id="chips-unidades" style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
              ${UNIDADES.map(u => {
                const selected = defaultUnitsUnidades.includes(u.id);
                return `<button type="button" class="unit-chip ${selected ? 'selected' : ''}" data-unit="${u.id}" style="width: clamp(40px, 10vw, 56px); height: clamp(40px, 10vw, 56px); min-width: clamp(40px, 10vw, 48px); min-height: clamp(40px, 10vw, 48px); border: none; border-radius: 0; padding: 0; cursor: pointer; background-color: ${selected ? u.accentColor : u.bgPastel}; outline: none; -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease;" aria-label="${u.nombre}" title="${u.nombre}"></button>`;
              }).join('')}
            </div>
          </div>

          <div class="form-group">
            <label style="font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; margin: 0;">Unidades visibles por defecto en Vista por Jornada:</label>
            <div class="unit-selector-chips" id="chips-periodos" style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
              ${UNIDADES.map(u => {
                const selected = defaultUnitsPeriodos.includes(u.id);
                return `<button type="button" class="unit-chip ${selected ? 'selected' : ''}" data-unit="${u.id}" style="width: clamp(40px, 10vw, 56px); height: clamp(40px, 10vw, 56px); min-width: clamp(40px, 10vw, 48px); min-height: clamp(40px, 10vw, 48px); border: none; border-radius: 0; padding: 0; cursor: pointer; background-color: ${selected ? u.accentColor : u.bgPastel}; outline: none; -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease;" aria-label="${u.nombre}" title="${u.nombre}"></button>`;
              }).join('')}
            </div>
          </div>

          <div class="form-group" style="display: flex; flex-direction: column; gap: 0.4rem;">
  <label style="font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; margin: 0;">Mostrar indicadores de modificación reciente:</label>
  <div class="unit-selector-chips" id="selector-indicadores" style="display: flex; gap: 0; border: none; width: 100%;">
    <button type="button" class="toggle-indicador-btn ${showIndicadores ? 'active' : ''}" data-value="on" style="flex: 1; padding: 0.65rem 0.5rem; border: none; border-radius: 0; background-color: ${showIndicadores ? '#171717' : '#f3f4f6'}; color: ${showIndicadores ? '#ffffff' : '#737373'}; font-size: 0.85rem; font-weight: ${showIndicadores ? '700' : '600'}; cursor: pointer; text-align: center; outline: none; -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease;">ON</button>
    <button type="button" class="toggle-indicador-btn ${!showIndicadores ? 'active' : ''}" data-value="off" style="flex: 1; padding: 0.65rem 0.5rem; border: none; border-radius: 0; background-color: ${!showIndicadores ? '#171717' : '#f3f4f6'}; color: ${!showIndicadores ? '#ffffff' : '#737373'}; font-size: 0.85rem; font-weight: ${!showIndicadores ? '700' : '600'}; cursor: pointer; text-align: center; outline: none; -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease;">OFF</button>
  </div>
</div>
        </div>
        
        <div class="ajuste-tab-content ${tabInicial === 'cuenta' ? '' : 'hidden'}" id="tab-content-cuenta">
  
  <!-- Mantener sesión iniciada - Toggle ON/OFF -->
  <div class="form-group" style="display: flex; flex-direction: column; gap: 0.4rem;">
    <label style="font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; margin: 0;">Mantener sesión iniciada:</label>
    <div class="unit-selector-chips" id="selector-mantener-sesion" style="display: flex; gap: 0; border: none; width: 100%;">
      <button type="button" class="toggle-sesion-btn ${auth.getMantenerSesion() ? 'active' : ''}" data-value="on" style="flex: 1; padding: 0.65rem 0.5rem; border: none; border-radius: 0; background-color: ${auth.getMantenerSesion() ? '#171717' : '#f3f4f6'}; color: ${auth.getMantenerSesion() ? '#ffffff' : '#737373'}; font-size: 0.85rem; font-weight: ${auth.getMantenerSesion() ? '700' : '600'}; cursor: pointer; text-align: center; outline: none; -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease;">ON</button>
      <button type="button" class="toggle-sesion-btn ${!auth.getMantenerSesion() ? 'active' : ''}" data-value="off" style="flex: 1; padding: 0.65rem 0.5rem; border: none; border-radius: 0; background-color: ${!auth.getMantenerSesion() ? '#171717' : '#f3f4f6'}; color: ${!auth.getMantenerSesion() ? '#ffffff' : '#737373'}; font-size: 0.85rem; font-weight: ${!auth.getMantenerSesion() ? '700' : '600'}; cursor: pointer; text-align: center; outline: none; -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease;">OFF</button>
    </div>
  </div>
  
  <div class="form-group">
    <label style="font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; margin: 0;">Nombre de usuario:</label>
    <p style="font-size: 0.9rem; font-weight: 600; color: #171717; margin: 0;">${nombreUsuario}</p>
  </div>
  
  <div class="form-group">
    <label style="font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; margin: 0;">Identificador / ID:</label>
    <p style="font-size: 0.9rem; font-weight: 600; color: #171717; margin: 0;">${user ? user.id : 'No disponible'}</p>
  </div>
  
  <div class="form-group">
    <label style="font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; margin: 0;">Rol del sistema:</label>
    <p style="font-size: 0.9rem; font-weight: 600; color: #171717; margin: 0; text-transform: uppercase;">${user ? user.rol : 'No disponible'}</p>
  </div>
  
  <!-- Gestión de cuenta y sesión - Grid 3 columnas iguales -->
  <div class="form-group" style="display: flex; flex-direction: column; gap: 0.75rem;">
    <label style="font-size: 0.8rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; margin: 0;">Gestión de cuenta y sesión:</label>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
      <button type="button" class="btn-modal" id="btn-cambiar-password" style="min-height: 48px; padding: 0.5rem; font-size: 0.75rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; text-align: center; background-color: #f3f4f6; color: #171717; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">Cambiar Contraseña</button>
      <button type="button" class="btn-modal" id="btn-cerrar-sesion" style="min-height: 48px; padding: 0.5rem; font-size: 0.75rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; text-align: center; background-color: #f3f4f6; color: #171717; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">Cerrar Sesión</button>
      <button type="button" class="btn-modal" id="btn-borrar-cuenta" style="min-height: 48px; padding: 0.5rem; font-size: 0.75rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; text-align: center; background-color: #b91c1c; color: #ffffff; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">Borrar Cuenta</button>
    </div>
  </div>
</div>

        ${isAdmin ? `
        <div class="ajuste-tab-content ${tabInicial === 'admin' ? '' : 'hidden'}" id="tab-content-admin"></div>
        ` : ''}
        </div>
      </div>

      <!-- Botonera Edge-to-Edge 50/50 -->
      <footer class="modal-footer-5050" style="display: flex; width: 100%; border-top: none; flex-shrink: 0;">
        <button type="button" class="btn-modal-cancel" id="btn-modal-cancel" style="flex: 1; min-height: 48px; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; background-color: #f3f4f6; color: #171717;">Cancelar</button>
        <button type="button" class="btn-modal-accept" id="btn-modal-accept" style="flex: 1; min-height: 48px; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; background-color: #171717; color: #ffffff;">Aceptar</button>
      </footer>
    </div>
  `;

  document.body.appendChild(modalOverlay);
  document.body.classList.add('modal-open');

  // El panel de Administración vive en su propio módulo (adminPanelModal.js);
  // se inicializa aquí porque necesita el modalOverlay ya insertado en el DOM.
  // Si el usuario no es administrador, no hace falta inicializarlo.
  const adminPanel = isAdmin ? initAdminPanel(modalOverlay, user, isAdmin, tabInicial) : null;

  // ============================================================
// PUNTO 5.6: ALTURA FIJA DEL MODAL (Opción C - cálculo dinámico)
// ============================================================
// Forzar que la pestaña de Preferencias esté visible para medir
const tabPreferencias = modalOverlay.querySelector('#tab-content-preferencias');
const tabCuenta = modalOverlay.querySelector('#tab-content-cuenta');
const tabAdmin = modalOverlay.querySelector('#tab-content-admin');

// Asegurar que Preferencias está visible y las otras ocultas
tabPreferencias?.classList.remove('hidden');
tabCuenta?.classList.add('hidden');
if (tabAdmin) tabAdmin.classList.add('hidden');

// Actualizar estilos de las pestañas para reflejar Preferencias como activa
const allTabs = modalOverlay.querySelectorAll('.ajuste-tab-btn-2');
allTabs.forEach(tab => {
  const isActive = tab.dataset.tab === 'preferencias';
  tab.style.backgroundColor = isActive ? '#ffffff' : '#f3f4f6';
  tab.style.color = isActive ? '#171717' : '#737373';
  tab.style.fontWeight = isActive ? '700' : '600';
  tab.classList.toggle('active', isActive);
});

// Medir la altura de la pestaña Preferencias después de renderizar
requestAnimationFrame(() => {
  const modalCard = modalOverlay.querySelector('.ajustes-modal-card');
  const modalBody = modalOverlay.querySelector('.modal-body');
  const header = modalOverlay.querySelector('.modal-header-generic');
  const footer = modalOverlay.querySelector('.modal-footer-5050');
  
  const preferenciasContent = modalOverlay.querySelector('#tab-content-preferencias');
  if (preferenciasContent) {
    const headerHeight = header ? header.offsetHeight : 0;
    const footerHeight = footer ? footer.offsetHeight : 0;
    const bodyPadding = 32;
    const tabsHeight = 50;
    
    let idealHeight = headerHeight + footerHeight + bodyPadding + tabsHeight;
    const contentHeight = preferenciasContent.scrollHeight;
    idealHeight += contentHeight;
    idealHeight += 16;
    
    const maxHeight = window.innerHeight * 0.9;
    if (idealHeight > maxHeight) idealHeight = maxHeight;
    
    if (modalCard) {
      modalCard.style.height = idealHeight + 'px';
      modalCard.style.minHeight = idealHeight + 'px';
    }
  }
});

// Manejo de pestañas - Actualiza estilos inline y carga Admin si es necesario
modalOverlay.querySelectorAll('.ajuste-tab-btn-2').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const clickedBtn = /** @type {HTMLElement} */(e.currentTarget);
    const allTabs = modalOverlay.querySelectorAll('.ajuste-tab-btn-2');
    const allContents = modalOverlay.querySelectorAll('.ajuste-tab-content');
    
    allContents.forEach(c => c.classList.add('hidden'));
    
    const targetTab = clickedBtn.dataset.tab;
    const targetContent = modalOverlay.querySelector(`#tab-content-${targetTab}`);
    
    // Si es la pestaña de Admin y aún no tiene contenido, cargarlo de forma asíncrona
    if (targetTab === 'admin' && targetContent && targetContent.children.length === 0) {
      adminPanel?.renderAdminContent().then(html => {
        if (targetContent) targetContent.innerHTML = html;
        adminPanel.setupAdminListeners();
      });
    }
    
    targetContent?.classList.remove('hidden');
    
    allTabs.forEach(tab => {
      const isActive = tab === clickedBtn;
      tab.style.backgroundColor = isActive ? '#ffffff' : '#f3f4f6';
      tab.style.color = isActive ? '#171717' : '#737373';
      tab.style.fontWeight = isActive ? '700' : '600';
      tab.classList.toggle('active', isActive);
    });
  });
});

// Selector interactivo de vista por defecto (Flat UI 2013)
let selectedDefaultView = defaultView;
modalOverlay.querySelectorAll('#selector-default-view button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const clickedBtn = /** @type {HTMLElement} */(e.currentTarget);
    const allBtns = modalOverlay.querySelectorAll('#selector-default-view button');
    
    allBtns.forEach(b => {
      b.classList.remove('selected');
      b.style.backgroundColor = '#f3f4f6';
      b.style.color = '#737373';
      b.style.fontWeight = '600';
    });
    
    clickedBtn.classList.add('selected');
    clickedBtn.style.backgroundColor = '#171717';
    clickedBtn.style.color = '#ffffff';
    clickedBtn.style.fontWeight = '700';
    
    selectedDefaultView = clickedBtn.dataset.view || 'unidades';
  });
});

// Selector interactivo de chips de unidades (Flat UI 2013)
modalOverlay.querySelectorAll('.unit-selector-chips .unit-chip').forEach(chip => {
  chip.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement} */(e.currentTarget);
    const isSelected = btn.classList.toggle('selected');
    const unitId = btn.dataset.unit;
    const unidadObj = UNIDADES.find(u => u.id === unitId);
    if (unidadObj) {
      btn.style.backgroundColor = isSelected ? unidadObj.accentColor : unidadObj.bgPastel;
    }
  });
});

// Selector interactivo de indicadores ON/OFF (Flat UI 2013)
let selectedIndicadores = showIndicadores;
modalOverlay.querySelectorAll('#selector-indicadores .toggle-indicador-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const clickedBtn = /** @type {HTMLElement} */(e.currentTarget);
    const allBtns = modalOverlay.querySelectorAll('#selector-indicadores .toggle-indicador-btn');
    
    allBtns.forEach(b => {
      b.classList.remove('active');
      b.style.backgroundColor = '#f3f4f6';
      b.style.color = '#737373';
      b.style.fontWeight = '600';
    });
    
    clickedBtn.classList.add('active');
    clickedBtn.style.backgroundColor = '#171717';
    clickedBtn.style.color = '#ffffff';
    clickedBtn.style.fontWeight = '700';
    
    selectedIndicadores = clickedBtn.dataset.value === 'on';
  });
});

// Selector interactivo de "Mantener sesión iniciada" ON/OFF (Flat UI 2013)
let selectedMantenerSesion = auth.getMantenerSesion();
modalOverlay.querySelectorAll('#selector-mantener-sesion .toggle-sesion-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const clickedBtn = /** @type {HTMLElement} */(e.currentTarget);
    const allBtns = modalOverlay.querySelectorAll('#selector-mantener-sesion .toggle-sesion-btn');
    
    allBtns.forEach(b => {
      b.classList.remove('active');
      b.style.backgroundColor = '#f3f4f6';
      b.style.color = '#737373';
      b.style.fontWeight = '600';
    });
    
    clickedBtn.classList.add('active');
    clickedBtn.style.backgroundColor = '#171717';
    clickedBtn.style.color = '#ffffff';
    clickedBtn.style.fontWeight = '700';
    
    selectedMantenerSesion = clickedBtn.dataset.value === 'on';
  });
});

// Listeners para los botones de gestión de cuenta y sesión
modalOverlay.querySelector('#btn-cambiar-password')?.addEventListener('click', () => {
  if (callbacks.onCambiarPassword) callbacks.onCambiarPassword();
});

modalOverlay.querySelector('#btn-cerrar-sesion')?.addEventListener('click', () => {
  if (callbacks.onCerrarSesion) callbacks.onCerrarSesion();
});

modalOverlay.querySelector('#btn-borrar-cuenta')?.addEventListener('click', () => {
  if (callbacks.onBorrarCuenta) callbacks.onBorrarCuenta();
});

    const closeModal = () => {
    document.body.classList.remove('modal-open');
    modalOverlay.remove();
  };

  modalOverlay.querySelector('#btn-modal-cancel')?.addEventListener('click', closeModal);

  modalOverlay.querySelector('#btn-modal-accept')?.addEventListener('click', () => {
    if (selectedMantenerSesion !== undefined) {
      auth.setMantenerSesion(selectedMantenerSesion);
    }

    const defaultUnitsUnidades = Array.from(modalOverlay.querySelectorAll('#chips-unidades .unit-chip.selected'))
      .map(el => /** @type {HTMLElement} */(el).dataset.unit);

    const defaultUnitsPeriodos = Array.from(modalOverlay.querySelectorAll('#chips-periodos .unit-chip.selected'))
      .map(el => /** @type {HTMLElement} */(el).dataset.unit);

    const nuevasPreferencias = {
      defaultView: selectedDefaultView,
      defaultUnitsUnidades: defaultUnitsUnidades,
      defaultUnitsPeriodos: defaultUnitsPeriodos,
      showIndicadores: selectedIndicadores
    };

    if (onSave) onSave(nuevasPreferencias);
    closeModal();
  });
}