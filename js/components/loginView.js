/**
 * js/components/loginView.js
 * Pantalla de Acceso (Nivel 1): identificador + contraseña, con dominio @bsa.cat automático.
 * Flat UI 2013 - Estilos inline
 */

import { auth } from '../services/auth.js';
import { adminService } from '../services/adminService.js';
import { storage } from '../services/storage.js';

const DOMINIO_CORPORATIVO = '@bsa.cat';

/**
 * Renderiza la pantalla de acceso dentro del contenedor indicado.
 * @param {HTMLElement} container
 * @param {Function} onSuccess - Callback ejecutado tras un inicio de sesión correcto. Recibe (user, esPrimerAcceso).
 */
export function renderLoginView(container, onSuccess) {
  console.log('🚀 [LOGINVIEW] renderLoginView() INICIADO');
  console.log('📦 [LOGINVIEW] container:', container);
  console.log('📦 [LOGINVIEW] container?.id:', container?.id);
  console.log('📦 [LOGINVIEW] container?.tagName:', container?.tagName);
  
  if (!container) {
    console.error('❌ [LOGINVIEW] container es null o undefined');
    return;
  }

  // Añadir clase para eliminar el padding de #app específicamente en login
  console.log('📎 [LOGINVIEW] Añadiendo clase login-active...');
  container.classList.add('login-active');
  console.log('✅ [LOGINVIEW] Clase login-active añadida');

  console.log('📝 [LOGINVIEW] Generando HTML del login...');
  container.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; background: #ffffff;">
      <div style="width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 1rem;">

        <!-- 🔥 VIDEO DE BIENVENIDA (Animación del logo) -->
        <div class="video-container" style="width: 100%; display: flex; justify-content: center; margin-bottom: 0.5rem; overflow: hidden;">
          <video 
            id="video-bienvenida" 
            autoplay 
            muted 
            playsinline 
            preload="auto"
            style="width: 100%; max-width: 360px; height: auto; display: block; object-fit: contain; background: transparent; border: none; outline: none;"
          >
            <source src="assets/videos/logo.mp4" type="video/mp4">
          </video>
        </div>

        <!-- Subtítulo -->
        <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #737373; text-align: center;">Accede con tu identificador corporativo</p>

        <!-- Campo Usuario -->
        <div style="display: flex; flex-direction: column; gap: 0.35rem;">
          <label for="login-usuario" style="font-size: 0.75rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em;">Usuario</label>
          <div style="display: flex; align-items: center; gap: 0; background: transparent;">
            <input type="text" id="login-usuario" placeholder="jperez" autocomplete="username" style="width: 50%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 0; font-size: 1rem; outline: none; -webkit-tap-highlight-color: transparent; background: #ffffff; text-align: right; box-sizing: border-box;" />
            <span style="padding: 10px 4px; font-size: 1rem; color: #171717; background: transparent; white-space: nowrap; flex-shrink: 0;">@bsa.cat</span>
          </div>
        </div>

        <!-- Campo Contraseña -->
        <div style="display: flex; flex-direction: column; gap: 0.35rem;">
          <label for="login-password" style="font-size: 0.75rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em;">Contraseña</label>
          <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 0; font-size: 1rem; outline: none; -webkit-tap-highlight-color: transparent; background: #ffffff; box-sizing: border-box;" />
        </div>

        <!-- Mantener sesión iniciada - Toggle ON/OFF -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0;">
          <label style="font-size: 0.75rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; margin: 0;">Mantener sesión iniciada</label>
          <div id="login-mantener-container" style="display: flex; gap: 0; border: none; width: auto;">
            <button type="button" class="toggle-sesion-btn active" data-value="on" style="flex: 1; padding: 0.4rem 0.75rem; border: none; border-radius: 0; background-color: #171717; color: #ffffff; font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: center; outline: none; -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease;">ON</button>
            <button type="button" class="toggle-sesion-btn" data-value="off" style="flex: 1; padding: 0.4rem 0.75rem; border: none; border-radius: 0; background-color: #f3f4f6; color: #737373; font-size: 0.75rem; font-weight: 600; cursor: pointer; text-align: center; outline: none; -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease;">OFF</button>
          </div>
        </div>

        <!-- Mensaje de error/info -->
        <p id="login-mensaje" style="font-size: 0.8rem; margin: 0; min-height: 1.2rem; color: #b91c1c; display: none;"></p>

        <!-- Botón Iniciar sesión -->
        <button type="button" id="btn-login-acceder" style="width: 100%; min-height: 48px; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; border: none; border-radius: 0; cursor: pointer; background-color: #171717; color: #ffffff; transition: background-color 0.15s ease; outline: none; -webkit-tap-highlight-color: transparent;">Iniciar sesión</button>

        <!-- Botón ¿Olvidaste? -->
        <button type="button" id="btn-login-reset" style="background: none; border: none; color: #737373; font-size: 0.8rem; font-weight: 600; cursor: pointer; padding: 0.25rem 0; outline: none; -webkit-tap-highlight-color: transparent; display: none;">¿Olvidaste tu contraseña?</button>
      </div>
    </div>
  `;
  console.log('✅ [LOGINVIEW] HTML generado, container.innerHTML.length:', container.innerHTML.length);
  console.log('📏 [LOGINVIEW] container.innerHTML (primeros 200 chars):', container.innerHTML.substring(0, 200));

  const inputUsuario = /** @type {HTMLInputElement} */ (container.querySelector('#login-usuario'));
  const inputPassword = /** @type {HTMLInputElement} */ (container.querySelector('#login-password'));
  const toggleContainer = container.querySelector('#login-mantener-container');
  const mensajeEl = /** @type {HTMLElement} */ (container.querySelector('#login-mensaje'));
  const btnAcceder = /** @type {HTMLButtonElement} */ (container.querySelector('#btn-login-acceder'));
  const btnReset = /** @type {HTMLButtonElement} */ (container.querySelector('#btn-login-reset'));
  const videoBienvenida = /** @type {HTMLVideoElement} */ (container.querySelector('#video-bienvenida'));

  console.log('🔍 [LOGINVIEW] Elementos DOM encontrados:', {
    inputUsuario: !!inputUsuario,
    inputPassword: !!inputPassword,
    toggleContainer: !!toggleContainer,
    mensajeEl: !!mensajeEl,
    btnAcceder: !!btnAcceder,
    btnReset: !!btnReset,
    videoBienvenida: !!videoBienvenida
  });

  let mantenerSesion = true;
  console.log('🔍 [LOGINVIEW] mantenerSesion inicial:', mantenerSesion);

  // 🔥 TRUCO 1: PRECARGA INVISIBLE
  // 1. Ocultar el vídeo inicialmente (opacidad 0) para que no se vea la pantalla negra ni el botón de play.
  if (videoBienvenida) {
    console.log('🎬 [LOGINVIEW] Configurando vídeo de bienvenida...');
    videoBienvenida.style.opacity = '0';
    videoBienvenida.style.transition = 'opacity 0.5s ease';

    // 2. Esperar a que el vídeo esté completamente cargado y listo para reproducirse.
    videoBienvenida.addEventListener('loadeddata', () => {
      console.log('🎬 [LOGINVIEW] Vídeo cargado, reproduciendo...');
      // 3. Intentar reproducir el vídeo. Si falla, no pasa nada (se mantiene oculto).
      videoBienvenida.play().catch(() => {
        console.warn('⚠️ [LOGINVIEW] No se pudo reproducir el vídeo automáticamente');
      });

      // 4. Hacer visible el vídeo con un fundido suave.
      videoBienvenida.style.opacity = '1';
      console.log('🎬 [LOGINVIEW] Vídeo visible');
    });

    // 5. Si el vídeo termina, congelarlo en el último fotograma (parece un logo estático).
    videoBienvenida.addEventListener('ended', () => {
      console.log('🎬 [LOGINVIEW] Vídeo terminado, congelando en último fotograma');
      videoBienvenida.pause();
      videoBienvenida.currentTime = videoBienvenida.duration;
    });
  }

  // Toggle ON/OFF
  toggleContainer?.querySelectorAll('.toggle-sesion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      console.log('🔄 [LOGINVIEW] Toggle sesión clickeado, value:', btn.dataset.value);
      const allBtns = toggleContainer.querySelectorAll('.toggle-sesion-btn');
      allBtns.forEach(b => {
        b.classList.remove('active');
        b.style.backgroundColor = '#f3f4f6';
        b.style.color = '#737373';
        b.style.fontWeight = '600';
      });
      btn.classList.add('active');
      btn.style.backgroundColor = '#171717';
      btn.style.color = '#ffffff';
      btn.style.fontWeight = '700';
      mantenerSesion = btn.dataset.value === 'on';
      console.log('🔍 [LOGINVIEW] mantenerSesion actualizado:', mantenerSesion);
    });
  });

  const mostrarMensaje = (/** @type {string} */ texto, esError = true) => {
    console.log('📢 [LOGINVIEW] mostrarMensaje:', texto, 'esError:', esError);
    mensajeEl.textContent = texto;
    mensajeEl.style.display = 'block';
    mensajeEl.style.color = esError ? '#b91c1c' : '#737373';
  };

  const ocultarMensaje = () => {
    mensajeEl.style.display = 'none';
  };

  const ocultarReset = () => {
    console.log('🔍 [LOGINVIEW] Ocultando botón reset');
    btnReset.style.display = 'none';
  };

  const intentarAcceso = async () => {
    console.log('🔐 [LOGINVIEW] intentarAcceso() INICIADO');
    const identificador = inputUsuario.value;
    const password = inputPassword.value;
    console.log('🔍 [LOGINVIEW] identificador:', identificador, 'password:', password ? '***' : 'vacio');

    btnAcceder.disabled = true;
    ocultarMensaje();
    ocultarReset();

    console.log('📡 [LOGINVIEW] Llamando a auth.login()...');
    const resultado = await auth.login(identificador, password, mantenerSesion);
    console.log('📊 [LOGINVIEW] resultado:', { success: resultado.success, reason: resultado.reason });

    btnAcceder.disabled = false;

    if (resultado.success) {
      console.log('✅ [LOGINVIEW] Login exitoso');
      // auth.login() no informa de si es el primer acceso del usuario (no hay
      // un dato equivalente en Supabase que lo confirme). Como aproximación,
      // se considera "primer acceso en este dispositivo" cuando aún no hay
      // preferencias guardadas localmente: es la señal de que el celador
      // todavía no ha pasado por la pantalla de Preferencias en este móvil.
      const esPrimerAcceso = Object.keys(storage.getPreferencias() || {}).length === 0;
      console.log('🔍 [LOGINVIEW] esPrimerAcceso:', esPrimerAcceso);
      console.log('📡 [LOGINVIEW] Llamando a onSuccess...');
      onSuccess(resultado.user, esPrimerAcceso);
      console.log('✅ [LOGINVIEW] onSuccess ejecutado');
      return;
    }

    if (resultado.reason === 'no_autorizado') {
      mostrarMensaje('Este identificador no está autorizado a usar la aplicación. Se ha notificado al administrador.');
    } else if (resultado.reason === 'password_incorrecta') {
      mostrarMensaje('Contraseña incorrecta.');
      btnReset.style.display = 'block';
    } else if (resultado.reason === 'usuario_inactivo') {
      mostrarMensaje('Tu cuenta está desactivada. Contacta con el administrador.');
    } else {
      mostrarMensaje('Introduce tu usuario y contraseña.');
    }
  };

  btnAcceder.addEventListener('click', () => {
    console.log('🔄 [LOGINVIEW] Click en botón Iniciar sesión');
    intentarAcceso();
  });

  inputPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      console.log('🔄 [LOGINVIEW] Enter presionado en campo contraseña');
      intentarAcceso();
    }
  });

  btnReset.addEventListener('click', async () => {
    console.log('🔄 [LOGINVIEW] Click en botón ¿Olvidaste?');
    const identificador = inputUsuario.value;
    if (!identificador) {
      console.warn('⚠️ [LOGINVIEW] No hay identificador para reset');
      return;
    }
    await adminService.registrarSolicitudRestablecimiento(identificador);
    mostrarMensaje('Se ha enviado tu solicitud de restablecimiento al administrador.', false);
    ocultarReset();
  });
  
  console.log('✅ [LOGINVIEW] renderLoginView() FINALIZADO');
}