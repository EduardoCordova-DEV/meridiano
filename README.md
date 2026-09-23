# Meridiano Desk App

Aplicación Windows independiente con **Electron 44.4.1 + React + TypeScript**.
Conserva la interfaz de Meridiano, sin backend, cuentas, APIs, telemetría ni recursos
remotos. Instalada, carga sus archivos empaquetados: no necesita Node, npm, Vite,
una terminal, un navegador externo ni conexión a Internet.

Este proyecto vive en `C:\Users\ecordova\Projects\meridiano-desk-app`.
No comparte dependencias, procesos ni almacenamiento con la web. No modifica el
alias **`meridiano`**, que sigue perteneciendo a la web. Se retiraron de esta copia
el iniciador web y sus pruebas; no se cambia ningún perfil de PowerShell.

## Abrir en Windows

Los artefactos se generan en `release`:

| Archivo | Uso |
| --- | --- |
| `Meridiano-Desk-App-1.0.0-x64-nsis.exe` | Instalador por usuario, con acceso directo en escritorio y menú Inicio. No requiere elevación. |
| `Meridiano-Desk-App-1.0.0-x64-portable.exe` | Ejecutable sin instalación. Doble clic; no abre una terminal. |
| `win-unpacked\Meridiano Desk App.exe` | Aplicación desempaquetada. Hay que conservar **toda** la carpeta `win-unpacked`, no solo el EXE. |

No se instala ni se ejecuta al iniciar Windows. No hay bandeja, actualizador ni
servicio. Una segunda apertura activa la ventana existente. El nombre del producto
es **Meridiano Desk App** y su identificador estable es `com.meridiano.desk`.
El icono Windows se genera a partir del mismo globo de `public\favicon.svg`.

**Firma:** esta distribución local no tiene certificado de firma de código.
Windows/SmartScreen puede advertir sobre un editor desconocido. No desactives
SmartScreen, el antivirus ni políticas corporativas; si tu organización bloquea
ejecutables sin firma, solicita aprobación o una compilación firmada.
Generar el instalador no lo instala automáticamente.

## Ajuste a la pantalla

La ventana abre **maximizada en el área útil del monitor**, respetando la barra
de tareas de Windows. Puedes restaurarla, moverla y redimensionarla. El panel
distribuye su altura para evitar el scroll general; en ventanas bajas coloca la
referencia y el conversor a la izquierda y las conexiones a la derecha.

La franja superior muestra **Meridiano Desk App** sobre el mismo fondo del
dashboard, conservando la cabecera original debajo (diseño B). Sigue el modo
claro/oscuro y las paletas, incluida la vista previa de colores. Puedes arrastrar
desde esa franja y usar los controles **nativos de Windows** para minimizar,
maximizar/restaurar y cerrar; no se sustituyen por botones web. Al restaurar,
Windows 11 aplica las esquinas redondeadas y la sombra del sistema; al maximizar
o acoplar la ventana, Windows decide su forma. Windows 10 no ofrece este
redondeado nativo. No se fuerza transparencia ni se simulan esquinas recortando
contenido.

Los relojes se muestran en **páginas de una a cuatro tarjetas**, según el ancho
disponible. Usan **Flexbox sin crecimiento**, alineadas a la izquierda, con
**400 × 320 píxeles CSS** por tarjeta, o **400 × 300** si la ventana tiene hasta
900 píxeles de alto. Todas comparten ancho y alto, tengan o no número de caso,
y alinean sus pies y bordes inferiores. No se ensanchan por tener menos relojes
ni al llegar a la última página: el espacio sobrante queda libre. Si un panel
dispone de menos espacio, se limitan uniformemente a ese espacio y conservan
el acceso al contenido largo mediante desplazamiento interno.

Las flechas permiten recorrer todos los clientes y muestran el rango
y total. Añadir o guardar un reloj lleva a su página; eliminar la última tarjeta
ajusta la página automáticamente. El paginado no cambia ni recorta tus datos,
no se guarda en las preferencias y no altera la exportación.

El comparador y los diálogos conservan desplazamiento **interno** para acceder a
todos sus datos. Los textos excepcionalmente largos o avisos también pueden
necesitarlo dentro de su panel. No se ocultan barras a costa de perder contenido.
El ajuste sin scroll general requiere un área de contenido de al menos
**760 × 540 píxeles CSS**; por debajo, por ejemplo con zoom muy alto, se conserva
el flujo desplazable accesible en lugar de comprimir o cortar controles.

## Desarrollo y distribución

Requiere Node.js **22.12 o posterior**, npm y Windows x64 para la distribución aquí
configurada. La primera instalación de dependencias y la descarga de herramientas
de empaquetado necesitan red; la aplicación final no.

```powershell
Set-Location 'C:\Users\ecordova\Projects\meridiano-desk-app'
npm ci
npm run dev
```

`dev` compila el proceso principal, inicia Vite exclusivamente en
`http://127.0.0.1:5183/` con `strictPort` y abre una ventana Electron aislada.
Si el puerto está ocupado, falla sin reutilizarlo ni matar procesos ajenos.
Cerrar Electron o pulsar Ctrl+C detiene ese desarrollo. Los cambios del frontend
se actualizan con Vite; para cambios del proceso principal, reinicia el comando.
Este entorno usa un perfil distinto del escritorio normal.

```powershell
npm run build          # TypeScript, frontend, proceso principal e iconos
npm start              # Electron con el build local, SIN servidor
npm run pack           # release\win-unpacked
npm run dist:win       # Instalador NSIS + portable x64, sin publicación
```

`npm run dev:renderer` sirve solo el frontend en 5183 para las pruebas del navegador.
`npm run preview` sirve el build en 4183. Ninguno usa el puerto de la web (5173).
No se requieren dependencias globales, enlaces simbólicos ni rutas al código web.
`package-lock.json` fija las dependencias; Electron está fijado a una versión
estable, no a la etiqueta `latest` que puede apuntar a una versión preliminar.
La actualización del runtime es manual: cambia la versión, verifica y redistribuye.

## Datos y almacenamiento

El origen empaquetado permanece **`meridiano://app/`**, independiente de la carpeta
del ejecutable. LocalStorage usa exclusivamente `meridiano.preferences.v1`:

```json
{
  "version": 1,
  "clocks": [
    {
      "id": "cliente-ejemplo",
      "zone": "America/New_York",
      "label": "Cliente de ejemplo",
      "caseNumber": "00042"
    }
  ],
  "hourCycle": "24",
  "theme": "dark",
  "language": "es",
  "clockView": "cards",
  "palettePreset": "react"
}
```

`personalization` también se conserva cuando existe, con las paletas por modo.
Los campos opcionales antiguos pueden faltar. El caso es texto opcional y conserva
ceros iniciales. Una lista `clocks: []` se conserva, sin regenerar ejemplos.
No se escribe al montar la aplicación. Los datos inválidos se mantienen intactos,
con aviso visible, hasta un guardado explícito. Si solo falla una paleta almacenada,
se recuperan en memoria los demás datos sin sobrescribir el original.

El perfil normal está en **`%APPDATA%\meridiano-desk-app`**; Chromium administra
su LocalStorage dentro de esa carpeta. Instalador, portable y `npm start` comparten
ese perfil y la misma instancia. *Portable* significa sin instalación: **no**
significa que guarde los datos junto al EXE o en una memoria USB.
Desarrollo usa `%APPDATA%\meridiano-desk-app-dev`. Las pruebas usan perfiles
temporales propios con `--user-data-dir` absoluto; nunca leen perfiles de Edge,
Chrome ni el perfil normal. No edites los archivos internos de Chromium.

Las preferencias no están cifradas por la app. Protege la cuenta de Windows y sus
copias. Desinstalar conserva los datos por configuración; borrar el perfil elimina
las preferencias. Exporta una copia antes de hacerlo. La fecha de conversión no se
persiste: cada apertura vuelve a **Ahora**.

## Importar y exportar

Abre **Ajustes → Importar / exportar** (en inglés, **Settings → Import / export**).
Esta sección descarta cualquier vista previa de colores que no hayas guardado.

- **Exportar JSON** solicita guardar solo la configuración mostrada: relojes,
  clientes, casos, formato, tema, idioma, vista y personalización. Electron muestra
  un diálogo nativo para elegir el destino. Cancelar no crea una copia.
- **Importar JSON** lee únicamente el archivo que seleccionas, hasta **5 MiB**.
  Se valida el esquema completo, incluidos colores, identificadores únicos, zonas
  y números de caso. JSON inválido o incompatible no cambia los datos.
- Un archivo válido muestra el número de relojes y exige pulsar
  **Reemplazar mis preferencias**. Reemplaza todo, no combina listas; incluso una
  lista vacía requiere confirmación. Puedes cancelar sin escribir.
- Si falla el guardado de una importación, los datos anteriores y la configuración
  activa permanecen intactos y se muestra un error.

**Los JSON contienen datos de clientes y números de caso sin cifrar. Guárdalos
privadamente; no los publiques, adjuntes a incidencias ni subas a repositorios.**
Si existe un error de lectura, exportar copia lo mostrado, no datos originales
inaccesibles; la interfaz lo advierte. No existe sincronización automática.

### Traer datos de la web existente, sin modificarla

Hazlo tú, explícitamente, en la pestaña y perfil donde ya usas la web. No hace
falta editar su código, reiniciar su servidor ni explorar archivos privados.

1. Abre exactamente **http://127.0.0.1:5173/** y comprueba que sean tus relojes.
2. Abre DevTools con F12. En **Application → Local Storage → ese origen**, busca
   **solo** `meridiano.preferences.v1`. Copia el valor completo (no la clave).
3. Pégalo en un archivo UTF-8 llamado, por ejemplo, `meridiano-web.json`, en una
   carpeta privada. No copies otras claves, cookies, credenciales ni perfiles.
4. En Desk App, importa ese archivo. Revisa el número de relojes y confirma el
   reemplazo únicamente si es lo que deseas. Conserva la web sin cambios.

Alternativa opt-in desde la consola de DevTools, después de revisar el código:

```javascript
if (location.origin !== 'http://127.0.0.1:5173') {
  throw new Error('Origen incorrecto: no se copió ningún dato');
}
const value = localStorage.getItem('meridiano.preferences.v1');
if (value === null) throw new Error('No hay preferencias en este origen');
JSON.parse(value);
copy(value);
```

`copy` es una utilidad de DevTools: copia **esa única clave** al portapapeles.
No escribe en LocalStorage, no lee cookies y no envía datos a la red. Pega el
resultado en el archivo privado; considera después limpiar el portapapeles y su
historial según tus políticas. No eludas las advertencias antipegado de DevTools:
puedes usar la vía de Application sin ejecutar código.

## Funciones conservadas

Ciudad de México (`America/Mexico_City`) es siempre la referencia, aunque Windows
use otra zona. `Intl` y Temporal calculan DST y offsets fraccionarios; las siglas
como ET son alias de búsqueda, no offsets fijos. Se conserva el catálogo de
**419 zonas IANA y 162 siglas**, con nombres ES/EN, sujeto al soporte del runtime.
El catálogo geográfico local `src\zone.tab` es IANA tzdb **2026d**; no se descarga
durante el uso.

Se conservan tarjetas, comparador, clientes y casos opcionales, formatos 12/24 h,
ES/EN, claro/oscuro, siete paletas (incluida **React Theme**) y colores personalizados.
La vista de tarjetas termina en los relojes: se retiraron el acceso duplicado
«Otra conexión, otro lugar» y la franja inferior de ayuda. Puedes añadir relojes
desde el botón superior, desde el estado vacío o desde el comparador; el pie de
privacidad permanece visible.
Los casos se muestran como badge numérico en las tarjetas; el comparador mantiene
la etiqueta Caso/Case. No se restaura el antiguo indicador En vivo/Live.
Ahora sigue actualizando todos los relojes; convertir congela el instante común.
El conversor admite 1970–2100 y rechaza horas históricas ambiguas o inexistentes
en CDMX; el comparador distingue las horas repetidas por su desfase UTC.

La Tierra realista permanece grande y recortada en el lateral derecho, con
texturas WebP locales. El giro está limitado a 24 fps; su pausa no detiene los
relojes. Respeta movimiento reducido, conversión, visibilidad de ventana y
viewport, y comunica fallos de carga. Es decorativa, no iluminación solar real.
Se unificó el fondo de la Tierra con el de la tarjeta en modo oscuro para evitar
el degradado claro y la pérdida de contraste del tema predeterminado.

Las tarjetas de horarios incorporan el sol y la luna del diseño cinematográfico:
textura solar con corona animada y luna con cráteres, sombra y halo azul. Se
recortan por arriba y por la derecha como la Tierra, sin cambiar las dimensiones
de las cards. Sus texturas son procedurales, generadas localmente y compartidas
entre tarjetas; no añaden dependencias, archivos remotos ni llamadas de red.

Se muestra el sol de **07:00 a 18:59 de la zona de cada reloj** y la luna el resto
del día, también al convertir horarios. Es una indicación horaria, no un cálculo
de amanecer, puesta de sol o fase lunar. Cada tarjeta tiene un botón de
pausa/reanudación junto a editar y quitar: pausar el dibujo no detiene el reloj.
La pausa es temporal para esa tarjeta montada, no se guarda en las preferencias.
Las animaciones se limitan a 24 fps, se detienen al convertir, al ocultar la
ventana o salir del viewport y respetan movimiento reducido. Las tarjetas fuera
de vista no inicializan su renderer hasta aparecer; cambiar de página libera los
renderers anteriores. Los fallos se muestran dentro de la tarjeta, sin impedir
editar el reloj ni conservar los datos.

La precisión depende del reloj de Windows y de las reglas IANA incluidas con
Electron. No hay sincronización NTP propia. Las franjas laborales del comparador
son orientativas, no disponibilidad, festivos ni cálculos astronómicos.

## Seguridad y comprobaciones

Renderer con `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`,
seguridad web activa, sin preload ni IPC. El proceso principal solo sirve recursos
empaquetados permitidos; no ofrece acceso genérico al filesystem. CSP restringe
scripts al origen local y prohíbe conexiones, frames y objetos. Se bloquean ventanas
nuevas, navegación externa, permisos y solicitudes remotas. Solo se permiten las
exportaciones JSON iniciadas por la app. No se abre contenido remoto privilegiado.
El color de los controles nativos sigue la etiqueta `theme-color` ya usada por
el frontend; no necesita exponer nuevas capacidades al renderer.

```powershell
npm run typecheck
npm test
npm run test:e2e       # Edge instalado; solo 5183, sin reutilizar servidores
npm run build
npm run test:electron -- --project electron
npm run pack
npm run test:packaged  # EXE real de win-unpacked, sin devserver
```

Las pruebas nativas lanzan Electron con Playwright `_electron`, verifican el sandbox
del proceso, ausencia de Node en la ventana, recursos locales, Tierra, sol/luna, conversión
con Windows emulado en Asia/Tokyo, temas, idioma, casos, comparador, JSON, rechazo
de importación inválida y persistencia tras cerrar/reabrir, también de listas vacías.
La exportación usa el manejador nativo real; solo el destino del diálogo se fija
desde el harness para no requerir interacción humana. No se instala el NSIS
automáticamente. Capturas y resultados quedan en `test-results`.
Las pruebas de ajuste redimensionan la ventana nativa, recorren las páginas con
0, 1, 2, 3 y 30 relojes y comprueban las dimensiones iguales de las tarjetas,
la alineación de sus pies y los límites de paginación, incluso en la última página.
El recorrido de tamaños usa movimiento reducido; el smoke nativo y las pruebas
de navegador comprueban por separado la animación de píxeles, pausa por tarjeta,
transición día/noche, conversión, errores y preferencias intactas.
El documento no desborda la ventana, sin ocultar el reloj principal ni perder
preferencias; los casos largos siguen accesibles dentro de su tarjeta.
La franja integrada se verifica con las siete paletas en ambos modos, colores
manuales y cancelación de vista previa. También se comprueban el contraste de los
controles nativos, la maximización desde el título, minimizar/restaurar y la
preferencia de esquinas redondeadas de DWM en Windows 11.

Las pruebas heredadas del indicador Live se sustituyeron por comprobaciones de
avance/congelación/reanudación de relojes. Las aserciones de caso respetan la UI
actual. Los tests no restauran markup eliminado ni acceden a la web existente.

## Licencias

Las texturas de la Tierra proceden de los ejemplos de
[three-globe](https://github.com/vasturiano/three-globe) y
[globe.gl](https://github.com/vasturiano/globe.gl); se conserva su licencia MIT en
`public\earth-textures.LICENSE.txt` y en el build. `src\zone.tab` conserva el aviso
de dominio público de IANA. Electron/Chromium incluyen sus avisos en la distribución
(`LICENSE.electron.txt` y `LICENSES.chromium.html`). React, Temporal y las otras
dependencias conservan sus licencias de paquete dentro de la distribución.
Los enlaces de esta documentación son referencias; la app no los consulta.
#   m e r i d i a n o  
 