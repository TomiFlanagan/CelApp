# ESPECIFICACIÓN TÉCNICA Y ARQUITECTURA DE ARCHIVOS (v2.5)
**Proyecto:** Gestión de Turnos de Celadores (BSA)
**Enfoque:** Vanilla JavaScript (ES6 Modules) - 0€ Coste - Mobile First

---

## 1. REGLAS BÁSICAS DE DESARROLLO
1. **Límite de tamaño:** Ningún archivo debe superar las 150-200 líneas de código para garantizar lectura y edición cómoda desde el móvil.
2. **Cero texto libre:** Prohibida la entrada de texto por teclado para garantizar cumplimiento estricto de GDPR/LOPD. Todo se gestiona mediante botones, toggles y selectores guiados.
3. **Mantenimiento Cero / 0€:** Infraestructura servida mediante PWA (Servidor estático en Cloudflare Pages / GitHub Pages) y sincronización con capa gratuita de Supabase/Firebase.
4. **Botoneras Modales Unificadas:** Todos los modales (Nivel 2 y 3) utilizan una botonera inferior dividida 50/50 de borde a borde, restringida strictly al uso de los botones **Cancelar** (izquierda/neutro) y **Aceptar** (derecha/énfasis).

---

## 2. ESTRUCTURA DE DIRECTORIOS Y ARCHIVOS

AppCeladores/
├── ARQUITECTURA.md             # Este documento (Hoja de ruta del proyecto)
├── index.html                  # Estructura principal y montador de la PWA
├── assets/
│   ├── videos/                 # (NUEVO) Recursos multimedia de la aplicación
│   │   └── logo.mp4            # Vídeo de animación del logo para la pantalla de login (se congela en el último frame)
│   └── icons/
│       ├── app-icon/           # (NUEVO) Carpeta para el icono principal de la aplicación
│       │   └── icon.png        # Icono de la aplicación (PNG cuadrado, alta resolución)
│       ├── attributes/         # Pictogramas vectoriales de equipamiento y atributos de cama
│       │   ├── cama-especial.svg
│       │   ├── grua.svg
│       │   ├── oxigeno.svg
│       │   ├── pedal-ext-d.svg
│       │   ├── pedal-ext-i.svg
│       │   ├── silla-gd.svg
│       │   ├── silla-xl.svg
│       │   └── user-check.svg
│       └── navigation/         # Iconografía del sistema, navegación y acciones rápidas
│           ├── acostar.svg
│           ├── ban.svg               # (Nuevo) Icono para denegar, bloquear o rechazar acciones
│           ├── check.svg             # (Nuevo) Icono para marcar tareas como realizadas
│           ├── chevron-down.svg
│           ├── chevron-up.svg
│           ├── funnel.svg
│           ├── levantar.svg
│           ├── package.svg
│           ├── pencil.svg
│           ├── plus.svg
│           ├── repeat.svg
│           ├── rotate-ccw-clock.svg
│           ├── settings.svg
│           ├── trash-2.svg
│           ├── undo-2.svg            # (Nuevo) Icono para revertir el estado de una tarea completada
│           └── x.svg                 # (Nuevo) Icono para cerrar ventanas, modales o descartar acciones
├── css/
│   ├── base.css                # Variables de color, tipografía y reset general
│   ├── layout.css              # Grid, Dock inferior, encabezado y contenedores
│   ├── dock.css                # Estilos exclusivos de los Docks (Superior e Inferior)
│   ├── cards.css               # Estilos de Tarjetas (Camas y Tareas) y acordeón
│   └── modals.css              # Estilos de Modales (Nivel 2 y 3), Login y Almacén
└── js/
    ├── config/
    │   ├── unidades.js         # Lista de unidades (U1 a U5) y paleta pastel oficial
    │   ├── franjas.js          # Definición de las 7 franjas horarias oficiales
    │   ├── estructuraCamas.js  # Mapeo estático predeterminado de camas por planta
    │   ├── materiales.js       # Catálogo inmutable de recursos del almacén (Grúas, sillas, etc.)
    │   ├── atributos.js        # Catálogo unificado de los 7 atributos de cama y pictogramas
    │   └── tareasExtra.js      # Catálogo predefinido de tareas extraordinarias (Zero Free-Text)
    ├── services/
    │   ├── storage.js          # Gestión de estado privado/local (LocalStorage / IndexedDB)
    │   ├── sync.js             # Gestión de estado compartido/global (WebSockets / Supabase)
    │   ├── auth.js             # Acceso de usuarios (Sufijo @bsa.cat)
    │   └── resetService.js     # Servicio explícito de reinicio diario (Comprobación de fecha, purgas y caducidad)
    ├── state/
    │   └── appState.js         # Control central del estado de la app y filtros (Y/O)
    ├── components/
    │   ├── header.js           # Barra superior y selectores de vista
    │   ├── unidadView.js       # Nivel 1: Retícula por unidades y acordeón plano
    │   ├── periodoView.js      # Nivel 1: Tarjetas por 7 franjas y swipe bidireccional
    │   ├── camaCard.js         # Nivel 1: Tarjeta individual de cama (Ficha desplegable de 3 bloques)
    │   ├── tareaCard.js        # (Nuevo) Nivel 1: Tarjeta individual de tarea (Iconos Check/Revertir, atributos)
    │   ├── dock.js             # Navegación inferior persistente (5 accesos a unidades)
    │   └── modals/             # Modales de Nivel 2 y Nivel 3 (Subdivididos para <200 líneas)
    │       ├── editorCamaModal.js   # Nivel 2: Pestañas de categoría y toggles de atributos
    │       ├── almacenModal.js      # Nivel 2: Tabla global de 5 columnas (Estado compartido)
    │       ├── tareasExtraModal.js  # Nivel 2: Selector en 3 bloques (Qué, Dónde, Cuándo)
    │       ├── filtrosModal.js      # Nivel 2: Filtros avanzados con lógica Y/O
    │       ├── ajustesModal.js      # Nivel 2: Pestañas de Preferencias y Cuenta; orquesta el modal y delega Administración
    │       ├── adminPanelModal.js   # Nivel 2: Panel de Administración de cuentas (extraído de ajustesModal.js)
    │       └── confirmModal.js      # Nivel 3: Modales de confirmación crítica y avisos
    └── app.js                  # Punto de entrada principal (Inicialización)

---

## 3. RESPONSABILIDAD DE CADA MÓDULO

### 3.1. Raíz, Recursos Estáticos y Estilos
* **`index.html`**: Solo contiene el "esqueleto" HTML puro. No lleva lógica ni estilos internos. Importa las hojas CSS (`base.css`, `layout.css`, `dock.css`, `cards.css`, `modals.css`) y el archivo script `js/app.js` de tipo módulo.
* **`assets/videos/logo.mp4`**: (NUEVO) Vídeo de animación del logo utilizado en la pantalla de login. Se reproduce automáticamente, no es interactivo y se congela en el último fotograma para simular un logo estático.
* **`assets/icons/app-icon/icon.png`**: (NUEVO) Icono principal de la aplicación (PNG cuadrado, alta resolución) destinado a la PWA y futuras compilaciones APK.
* **`assets/icons/attributes/`**: Iconografía gráfica estándar asociada a los requerimientos técnicos y de movilidad de las camas:
  * `cama-especial.svg`: Identificador de camas bariátricas o articuladas especiales.
  * `grua.svg`: Necesidad de grúa de traslado.
  * `oxigeno.svg`: Soporte de oxigenoterapia.
  * `pedal-ext-d.svg`: Reposapiés/pedal extensible adaptado Derecho.
  * `pedal-ext-i.svg`: Reposapiés/pedal extensible adaptado Izquierdo.
  * `silla-gd.svg`: Silla de ruedas articulada Grande.
  * `silla-xl.svg`: Silla de ruedas articulada Extra Grande.
  * `user-check.svg`: Verificación de paciente / celador asignado.
* **`assets/icons/navigation/`**: Componentes visuales para la interfaz de usuario y acciones en ficha desplegada:
  * `acostar.svg`: Icono direccional de flecha hacia abajo para acciones y tareas de acostar.
  * `ban.svg`: (Nuevo) Icono para denegar, bloquear o rechazar acciones.
  * `check.svg`: (Nuevo) Icono para marcar tareas como realizadas.
  * `chevron-down.svg` / `chevron-up.svg`: Controles de despliegue en acordeón de unidades.
  * `funnel.svg`: Acceso al modal de filtros avanzados (Lógica Y/O).
  * `levantar.svg`: Icono direccional de flecha hacia arriba para acciones y tareas de levantar.
  * `package.svg`: Icono de almacén/inventario de recursos.
  * `pencil.svg`: Acceso directo al modal de edición de atributos de cama (Nivel 2).
  * `plus.svg`: Acción de añadir registros o tareas extraordinarias.
  * `repeat.svg`: Acción directa para iniciar traslados o intercambios de camas.
  * `rotate-ccw-clock.svg`: Consulta del historial de última modificación reciente (Nivel 3).
  * `settings.svg`: Menú de ajustes e información de usuario/sesión.
  * `trash-2.svg`: Accionador para vaciar/limpiar los datos de la cama (requiere confirmación).
  * `undo-2.svg`: (Nuevo) Icono para revertir el estado de una tarea completada.
  * `x.svg`: (Nuevo) Icono para cerrar ventanas, modales o descartar acciones.
* **`css/base.css`**: Define los colores corporativos (Fondo `#F8F9FA`, colores pastel de U1-U5, acento carmesí `#E11D48`), tamaños de fuente táctiles y dimensiones mínimas de toque (48px). Contiene además los estilos del vídeo de bienvenida y el parche para tapar la marca de agua.
* **`css/layout.css`**: Organiza las zonas fijas de la pantalla (Header fijo arriba, Dock fijo abajo, área central desplazable).
* **`css/dock.css`**: Estilos de los Docks Superior e Inferior, botones de unidad y selector de vista.
* **`css/cards.css`**: Estilos de las tarjetas de cama y tareas, acordeón de unidades, atributos y rutinas.
* **`css/modals.css`**: Estilos de todos los modales (Nivel 2 y 3), botoneras 50/50, Login, Almacén y tablas.
* **`css/components.css`**: (ELIMINADO - El código ha sido dividido en los 3 archivos anteriores)

### 3.2. Configuración y Datos Fijos (`js/config/`)
* **`unidades.js`**: Exporta los nombres de las 5 unidades y sus códigos hexadecimales de color pastel asociados.
* **`franjas.js`**: Exporta las 7 franjas horarias de la jornada (*Primera hora, Media mañana, Antes de comer, Después de comer, Merienda, Antes de cenar, Después de cenar*).
* **`estructuraCamas.js`**: Define el número predeterminado de camas por cada una de las 5 unidades y sus IDs únicos.
* **`materiales.js`**: Exporta el catálogo oficial e inmutable de recursos del almacén global (IDs, nombres legibles y metadatos). Fuente única de verdad para el almacén.
* **`atributos.js`**: Exporta el catálogo e iconografía oficial de los 7 atributos de cama. Fuente única de verdad para `camaCard.js`, `editorCamaModal.js` y `filtrosModal.js`.
* **`tareasExtra.js`**: Exporta el catálogo predefinido de tareas extraordinarias (Zero Free-Text para estricto cumplimiento GDPR/LOPD). Fuente única de verdad para `tareasExtraModal.js` y `periodoView.js`.

### 3.3. Servicios e Infraestructura (`js/services/`)
* **`storage.js`**: **Gestiona exclusivamente el Espacio Privado/Local del celador.** Almacena en `LocalStorage` o `IndexedDB` el checklist personal de tareas marcadas como completadas, las tareas extraordinarias creadas por él mismo y sus preferencias de interfaz. Gestiona la purga automática de datos locales a medianoche (00:00).
* **`sync.js`**: **Gestiona el Estado Compartido/Global en tiempo real (Backend Supabase/WebSockets).** Sincroniza los atributos de camas, la tabla global única del Almacén (construida dinámicamente desde `config/materiales.js` y `config/unidades.js`) y el registro de última modificación. Aplica el bloqueo temporal de edición si otro celador está editando una cama.
* **`auth.js`**: Controla el inicio de sesión forzando el dominio `@bsa.cat`.
* **`resetService.js`**: **Gestiona el reinicio diario explícito de la aplicación.** Comprueba el cambio de fecha al iniciar y reanudar la PWA, ejecutando la purga de tareas extraordinarias locales, la limpieza del checklist, el restablecimiento de filtros y la caducidad de 5 días del indicador de cambios recientes.

### 3.4. Estado de la Aplicación (`js/state/`)
* **`appState.js`**: Es el "cerebro" temporal. Sabe qué vista está activa (Vista por Unidad o Vista por Período), qué filtros están aplicados (Lógica Y/O) y qué celador tiene la sesión iniciada.

### 3.5. Componentes Visuales (`js/components/`)
* **`header.js`**: Pinta el título, el selector de modo de vista y el conmutador de filtros de unidad basándose en `config/unidades.js`.
* **`unidadView.js`**: Renderiza las cajas de unidades con sangrado asimétrico y gestiona el despliegue del acordeón de camas.
* **`periodoView.js`**: Renderiza el listado de tareas por las 7 franjas y la lógica del gesto *swipe* lateral en móvil.
* **`camaCard.js`**: Pinta la tarjeta individual de cama (`camaCard.js`):
  * **Vista Plegada:** Muestra identificador, barra lateral del color de la unidad si es *Paciente de celador*, triángulo/flecha indicadora de contenido y el punto carmesí (`#E11D48`) si hay cambios recientes sin consultar.
  * **Vista Desplegada:** Oculta el punto carmesí e integra los accesos de acción rápida superiores (`pencil.svg`, `rotate-ccw-clock.svg`, `trash-2.svg`, `repeat.svg`) y los 3 bloques internos de información (*1. Paciente de celador, 2. Atributos, 3. Rutina de sedestación*).
* **`tareaCard.js`**: (Nuevo) Pinta la tarjeta individual de tarea para la Vista por Períodos. Maneja el renderizado de los iconos de acción, los botones de Check y Revertir, y la visualización de atributos en la segunda línea.
* **`dock.js`**: Renderiza los 5 botones cuadrados inferiores de acceso rápido a las unidades.

#### 3.5.1. Submódulo de Modales (`js/components/modals/`)
* **`editorCamaModal.js`**: Modal de Nivel 2 para editar atributos de cama (accionado con `pencil.svg`) mediante pestañas horizontales e interruptores ON/OFF (Zero Free-Text).
* **`almacenModal.js`**: Modal de Nivel 2 que muestra la **tabla global única del almacén** estructurada en 5 columnas (una por unidad). Consume dinámicamente `config/materiales.js` para las filas y `config/unidades.js` para las columnas.
* **`tareasExtraModal.js`**: Modal de Nivel 2 para añadir tareas extraordinarias utilizando el selector táctil secuencial de 3 bloques (*Qué, Dónde, Cuándo*) consumiendo `config/tareasExtra.js`.
* **`filtrosModal.js`**: Modal de Nivel 2 que permite aplicar filtros combinados de atributos seleccionando explícitamente el operador lógico (**Y** / **O**).
* **`ajustesModal.js`**: Modal de Nivel 2 que orquesta las pestañas de Preferencias y Cuenta del usuario. Cuando el usuario tiene rol de administrador, inicializa `adminPanelModal.js` sobre el mismo `modalOverlay` para añadir la pestaña de Administración, pero no contiene su lógica directamente.
* **`adminPanelModal.js`**: Modal de Nivel 2 (extraído de `ajustesModal.js` para mantener ambos archivos dentro de un tamaño manejable) con el panel de Administración de cuentas: listado y acciones sobre cuentas pendientes, activas e inactivas, y el diálogo de alta de nuevo usuario autorizado. No depende de ninguna variable de Preferencias/Cuenta; solo recibe el `modalOverlay` ya insertado en el DOM, el usuario actual y la pestaña inicial.
* **`confirmModal.js`**: Modal de Nivel 3 compacto para avisos críticos, descartar cambios sin guardar o confirmaciones de borrado (utilizado al pulsar `trash-2.svg`). Utiliza strictly la botonera 50/50 edge-to-edge con los botones **Cancelar** y **Aceptar**.

### 3.6. Entrada (`js/app.js`)
* **`app.js`**: Carga las configuraciones iniciales, comprueba si hay un usuario conectado en `auth.js`, conecta los listeners de `sync.js` y `storage.js`, y arranca la aplicación.