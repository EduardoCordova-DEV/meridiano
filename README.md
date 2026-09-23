# Meridiano Desk App

**Tus clientes, sus horarios y un mismo instante.**

Meridiano Desk App es un dashboard de relojes mundiales para Windows. Permite
consultar la hora de distintas ciudades, asociar cada reloj a un cliente o caso
y convertir un horario de Ciudad de México a todas tus conexiones.

Está construido con **Electron, React y TypeScript** y funciona de manera
**local y sin conexión**. La aplicación distribuida no necesita Node.js, npm,
una terminal, un navegador externo ni un servidor. No utiliza cuentas, APIs,
backend, telemetría ni recursos remotos.

## Qué puedes hacer

| Función | Descripción |
| --- | --- |
| Reloj de referencia | Ciudad de México (`America/Mexico_City`), independiente de la zona configurada en Windows. |
| Relojes de clientes | Tarjetas con ciudad, fecha, hora, diferencia respecto a CDMX, etiqueta de cliente y número de caso opcional. |
| Búsqueda de zonas | Catálogo de 419 zonas IANA y 162 siglas, con búsquedas como `ET`, `Bucarest`, `GMT+2` o `UTC+05:30`. |
| Conversor | Elige una fecha y hora de CDMX y consulta ese mismo instante en todos los relojes. Respeta horario de verano y desfases fraccionarios. |
| Comparador | Vista conjunta de horarios para comparar ciudades y elegir un instante común. |
| Personalización | Español/inglés, formato 12/24 h, modo claro/oscuro, siete paletas —incluida React Theme— y colores personalizados. |
| Fondos animados | Tierra en la tarjeta principal; sol o luna en cada reloj según su horario local, con controles de pausa. |
| Respaldo de datos | Importación y exportación JSON de relojes, clientes, casos y preferencias, con validación y confirmación de reemplazo. |

El proyecto de escritorio es independiente de la versión web: no comparte sus
dependencias, procesos ni almacenamiento. El alias **`meridiano`** sigue
perteneciendo a la web; instalar esta app no lo modifica ni añade perfiles de
PowerShell.

## Instalación en Windows

### Requisitos para usar la aplicación

- Windows x64. Windows 11 ofrece las esquinas redondeadas nativas; Windows 10 no
  dispone de ese mismo efecto.
- Permiso para ejecutar aplicaciones locales en tu cuenta de Windows.
- Uno de los archivos de distribución indicados abajo.

**No necesitas instalar Node.js ni ejecutar comandos para usar la app.**
La conexión a Internet solo es necesaria para obtener los archivos o preparar
el entorno de desarrollo; el dashboard funciona sin ella.

### Archivos disponibles

Los archivos de la versión actual, **1.0.0**, están en la carpeta `release` del
proyecto:

| Archivo | Cuándo elegirlo |
| --- | --- |
| `Meridiano-Desk-App-1.0.0-x64-nsis.exe` | Instalación habitual, con accesos directos en el escritorio y el menú Inicio. |
| `Meridiano-Desk-App-1.0.0-x64-portable.exe` | Uso sin instalación, mediante un único ejecutable. |
| `win-unpacked\Meridiano Desk App.exe` | Uso de la distribución desempaquetada; requiere conservar toda su carpeta. |

En esta máquina se encuentran en:

```text
C:\Users\ecordova\Projects\meridiano-desk-app\release
```

Si solo tienes el código fuente y `release` todavía no existe, consulta
[Desarrollo y compilación](#desarrollo-y-compilación).

### Opción A: instalar con el asistente — recomendada

1. Cierra cualquier ventana de Meridiano Desk App que esté abierta.
2. Ejecuta `Meridiano-Desk-App-1.0.0-x64-nsis.exe` con doble clic.
3. Sigue el asistente. Si cambias la carpeta de instalación, elige una ubicación
   donde tu cuenta pueda escribir: la instalación es **por usuario y sin
   elevación de privilegios**.
4. Completa la instalación y abre **Meridiano Desk App** desde el escritorio o
   el menú Inicio.

No es necesario ejecutar `npm run dev`, mantener una terminal abierta ni iniciar
un servidor. Generar o descargar el instalador no lo instala automáticamente.

### Opción B: usar el portable

1. Guarda `Meridiano-Desk-App-1.0.0-x64-portable.exe` en una carpeta de tu elección.
2. Cierra cualquier versión anterior de la app.
3. Abre el archivo con doble clic.

Puedes crear manualmente un acceso directo a ese archivo si lo deseas.
**Portable significa que no requiere instalación**, no que guarde las
preferencias junto al ejecutable: usa el perfil local de Windows descrito en
[Datos y almacenamiento](#datos-y-almacenamiento).

### Opción C: usar la carpeta desempaquetada

Abre `release\win-unpacked\Meridiano Desk App.exe`. Si mueves o compartes esta
distribución, conserva **toda la carpeta `win-unpacked`**, incluidos sus archivos
y subcarpetas. Copiar solo el EXE no es suficiente.

### Advertencias de Windows y firma

Esta distribución local **no tiene certificado de firma de código**.
Windows/SmartScreen puede advertir sobre un editor desconocido. Comprueba la
procedencia del archivo y respeta las políticas de tu organización.

**No desactives SmartScreen, el antivirus ni las políticas corporativas.** Si la
ejecución de archivos sin firma está bloqueada, solicita aprobación o una
distribución firmada.

### Actualizar o desinstalar

Antes de actualizar, exporta una copia desde **Ajustes → Importar / exportar**.
Cierra la app y ejecuta el nuevo instalador, o sustituye el portable por la nueva
versión. No hay actualizaciones automáticas.

Instalador, portable y ejecución local con `npm start` comparten el mismo perfil
y usan una sola instancia: abrir otra copia activa la ventana existente. Para
ver una versión nueva, primero debes cerrar la anterior.

Para desinstalar la versión instalada, utiliza **Configuración de Windows →
Aplicaciones**, busca Meridiano Desk App y selecciona desinstalar. La configuración
del instalador conserva los datos del usuario. Para dejar de usar el portable,
cierra la app y elimina su ejecutable; esto tampoco elimina el perfil.

No borres el perfil para actualizar. Borrarlo elimina las preferencias locales;
exporta un respaldo antes de cualquier eliminación deliberada.

## Primeros pasos

1. Pulsa **Añadir reloj**, busca una ciudad, zona o sigla y, si lo necesitas,
   introduce una etiqueta de cliente y un número de caso.
2. Usa **Ahora** para seguir la hora actual. En **Convertir horario**, introduce
   la fecha y hora de CDMX y pulsa **Convertir en todos los relojes**. **Volver a
   ahora** reanuda el instante actual.
3. Alterna entre **Tarjetas** y **Comparador**. Cuando las tarjetas no caben en una
   sola página, usa las flechas de navegación; no se elimina ningún reloj.
4. Elige idioma, formato y apariencia. En **Ajustes** puedes cambiar la paleta,
   personalizar colores y exportar un respaldo.

Editar o quitar un reloj afecta únicamente a los datos de esta app. Los casos
son texto opcional y conservan ceros iniciales; aparecen como un badge en las
tarjetas y con la etiqueta Caso/Case en el comparador.

## Interfaz y animaciones

### Ventana y tarjetas adaptables

La ventana abre **maximizada en el área útil del monitor**, respetando la barra
de tareas. Puedes restaurarla, moverla y redimensionarla. El dashboard distribuye
su altura para evitar el scroll general; en ventanas bajas coloca la referencia
y el conversor a la izquierda y las conexiones a la derecha.

La barra superior está integrada en el fondo del dashboard y conserva los
controles nativos de Windows. Sigue los temas y las paletas. La ventana
restaurada utiliza el redondeado y la sombra nativos de Windows 11; al maximizar
o acoplar, Windows decide su forma.

Las tarjetas usan **Flexbox sin crecimiento**, alineadas a la izquierda. Su
tamaño habitual es **400 × 320 píxeles CSS**, o **400 × 300** en ventanas de hasta
900 píxeles de alto. Todas mantienen las mismas dimensiones y sus pies alineados,
tengan o no caso. No se estiran para rellenar huecos ni en la última página.
Si el panel es menor, se ajustan uniformemente al espacio disponible.

Se muestran de una a cuatro tarjetas por página, según el ancho. Añadir o guardar
un reloj revela su página; eliminar la última tarjeta ajusta la página
automáticamente. La página seleccionada no se guarda ni cambia la exportación.

El ajuste sin scroll general requiere al menos **760 × 540 píxeles CSS** de
contenido. Por debajo se mantiene un flujo desplazable accesible. El comparador,
los diálogos, los textos excepcionalmente largos y los avisos pueden necesitar
scroll **interno**: no se ocultan controles para evitar una barra.

### Tierra, sol y luna

La Tierra utiliza texturas WebP locales y aparece grande y recortada en el lateral
derecho. Las tarjetas incorporan el diseño cinematográfico de sol y luna, con el
mismo encuadre: corona solar animada o luna con cráteres, sombra y halo azul.
Sus texturas son procedurales, generadas localmente y compartidas entre tarjetas.

Se muestra el sol de **07:00 a 18:59 de la zona de cada reloj** y la luna el resto
del día, también al convertir horarios. Es una indicación horaria: **no calcula
amanecer, puesta de sol ni fase lunar**.

Cada tarjeta tiene pausa/reanudación junto a editar y quitar. Pausar el dibujo
no detiene el reloj. Esa pausa es temporal para la tarjeta montada y no se guarda
en las preferencias. Las animaciones:

- Se limitan a 24 fps y respetan la opción de reducir movimiento.
- Se detienen al convertir, ocultar la ventana o salir del viewport.
- Inicializan los renderers de las tarjetas solo cuando están visibles y los
  liberan al desmontarlas, por ejemplo al cambiar de página.
- Muestran un aviso si falla el dibujo, sin impedir usar el reloj ni conservar
  sus datos.

## Datos y almacenamiento

El origen de la app empaquetada es **`meridiano://app/`**, independiente de la
carpeta del ejecutable. El perfil normal está en:

```text
%APPDATA%\meridiano-desk-app
```

Instalador, portable y `npm start` comparten ese perfil. Desarrollo utiliza
`%APPDATA%\meridiano-desk-app-dev`; las pruebas crean perfiles temporales propios.
La app no lee perfiles de Chrome/Edge ni importa automáticamente datos de la web.

Chromium administra LocalStorage dentro del perfil. **No edites sus archivos
internos**: usa la importación/exportación de la app.

Las preferencias se validan y se guardan en `meridiano.preferences.v1`, versión 1:

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

`personalization` conserva los colores personalizados por modo cuando existe.
Se admiten preferencias antiguas sin los campos opcionales. Una lista
`clocks: []` permanece vacía, sin regenerar ejemplos.

No se sobrescriben preferencias al montar la app. Los datos inválidos se
mantienen intactos, con aviso visible, hasta un guardado explícito. Si solo falla
una paleta, se recuperan en memoria los demás datos sin sobrescribir el original.
La fecha de conversión no se persiste: cada apertura vuelve a **Ahora**.

Las preferencias no están cifradas por la app. Protege tu cuenta de Windows
y las copias de seguridad. No existe sincronización entre dispositivos ni
con la web.

## Importar y exportar

Abre **Ajustes → Importar / exportar**; en inglés, **Settings → Import / export**.
Abrir esta sección descarta una vista previa de colores que no hayas guardado.

**Para exportar:** pulsa **Exportar JSON**, elige el destino en el diálogo nativo
de Windows y confirma. Se exporta únicamente la configuración mostrada: relojes,
clientes, casos, formato, tema, idioma, vista y personalización. Cancelar el
diálogo no crea una copia.

**Para importar:** pulsa **Importar JSON** y selecciona tu archivo, de hasta
**5 MiB**. La app valida el esquema, colores, identificadores únicos, zonas y
casos. Si es válido, muestra el número de relojes y pide confirmar con
**Reemplazar mis preferencias**. El reemplazo es completo, no combina listas;
una lista vacía también requiere confirmación.

Un archivo inválido o incompatible no cambia los datos. Puedes cancelar antes
de confirmar. Si falla el guardado, las preferencias anteriores y la
configuración activa permanecen intactas y se muestra un error.

**Los JSON contienen datos de clientes y números de caso sin cifrar. Guárdalos
privadamente; no los publiques, adjuntes a incidencias ni subas a repositorios.**
Si existe un error de lectura, exportar copia lo mostrado, no datos originales
inaccesibles; la interfaz lo advierte.

### Traer datos de la versión web

Este procedimiento es manual y no modifica la web ni reinicia su servidor.
Realízalo en la pestaña y el perfil donde ya utilizas Meridiano:

1. Abre exactamente **http://127.0.0.1:5173/** y comprueba que sean tus relojes.
2. Abre DevTools con F12. En **Application → Local Storage → ese origen**, busca
   **solo** `meridiano.preferences.v1` y copia el valor completo, no la clave.
3. Pega el valor en un archivo UTF-8, por ejemplo `meridiano-web.json`, dentro de
   una carpeta privada. No copies otras claves, cookies, credenciales ni perfiles.
4. Importa ese archivo en la Desk App. Revisa el número de relojes y confirma el
   reemplazo únicamente si es lo que deseas.

Alternativa opcional desde la consola de DevTools, después de revisar el código:

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
No escribe en LocalStorage, no lee cookies y no envía datos a la red. Guarda el
resultado privadamente y limpia el portapapeles y su historial según tus políticas.
No eludas las advertencias antipegado de DevTools; puedes utilizar la vía de
Application sin ejecutar código.

## Desarrollo y compilación

Esta sección es para modificar el código o generar los ejecutables. **No es
necesaria para utilizar una distribución ya compilada.**

### Preparar el entorno

Requiere **Node.js 22.12 o posterior**, npm y Windows x64 para los paquetes aquí
configurados. La instalación de dependencias y la primera descarga de
herramientas de empaquetado necesitan red.

Desde PowerShell, en la ubicación actual del proyecto:

```powershell
Set-Location 'C:\Users\ecordova\Projects\meridiano-desk-app'
npm ci
npm run dev
```

Si copias el proyecto a otra carpeta, adapta la primera ruta. No se necesitan
dependencias globales, enlaces simbólicos ni referencias de ejecución al proyecto
web. `package-lock.json` fija las dependencias.

`npm run dev` compila el proceso principal, inicia Vite en
**http://127.0.0.1:5183/** con `strictPort` y abre Electron con el perfil de
desarrollo. Si el puerto está ocupado, falla sin reutilizarlo ni terminar procesos
ajenos. Cerrar Electron o pulsar Ctrl+C detiene ese desarrollo. El frontend se
actualiza con Vite; los cambios del proceso principal requieren reiniciar el
comando.

### Compilar y ejecutar sin servidor

```powershell
npm run build
npm start
```

`build` comprueba TypeScript y genera el frontend, el proceso principal y los
iconos. `npm start` abre esos archivos mediante Electron, sin Vite, y utiliza el
perfil normal de la app.

### Generar la distribución de Windows

```powershell
npm run pack       # Genera release\win-unpacked
npm run dist:win   # Genera instalador NSIS y portable x64, sin publicar
```

Ambos comandos compilan antes de empaquetar. Puedes ejecutar directamente
`npm run dist:win` si solo necesitas el instalador y el portable. No instala
la app automáticamente ni publica archivos en un repositorio o servicio.

| Comando adicional | Uso |
| --- | --- |
| `npm run dev:renderer` | Frontend de desarrollo en `127.0.0.1:5183`, sin abrir Electron. |
| `npm run preview` | Vista previa del build frontend en `127.0.0.1:4183`. |
| `npm run build:electron` | Compila únicamente el proceso principal. |
| `npm run icons` | Genera los iconos Windows a partir de `public\favicon.svg`. |

El puerto **5173 pertenece a la web existente** y no se utiliza para desarrollo
o pruebas de escritorio.

### Organización del proyecto

| Ruta | Responsabilidad |
| --- | --- |
| `src\App.tsx` | Dashboard, tarjetas, controles y coordinación de las vistas. |
| `src\time.ts`, `src\zones.ts` | Conversión de horarios y búsqueda de zonas. |
| `src\storage.ts`, `src\hooks.ts` | Validación, persistencia y estado compartido. |
| `src\EarthBackdrop.tsx`, `src\earth-renderer.ts` | Tierra animada con texturas locales. |
| `src\CelestialBackdrop.tsx`, `src\celestial-renderer.ts` | Sol y luna procedurales, pausa y ciclo de renderizado. |
| `src\styles.css`, `src\palette.ts`, `src\i18n.ts` | Diseño adaptable, paletas y textos ES/EN. |
| `electron\main.cts` | Ventana nativa, protocolo local y restricciones del renderer. |
| `scripts\` | Inicio, desarrollo y generación de iconos. |
| `tests\`, `src\*.test.ts*` | Pruebas del navegador, Electron y componentes/lógica. |
| `electron-builder.yml` | Configuración del instalador y del portable. |
| `release\` | Distribuciones generadas; no es el código fuente. |

El producto se identifica como **Meridiano Desk App**, con appId estable
`com.meridiano.desk`. El runtime actual es **Electron 44.4.1**. Su actualización
es manual: cambia la versión fijada, verifica la app y genera otra distribución;
no se utiliza una etiqueta `latest` que pueda resolver a una versión preliminar.

## Pruebas

Desde la raíz del proyecto:

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run test:electron -- --project=electron
npm run pack
npm run test:packaged
```

Las pruebas de navegador requieren Edge instalado y arrancan su propio servidor
en **5183**, sin reutilizar servidores existentes. Las pruebas nativas utilizan
Playwright `_electron`, perfiles temporales y la app real; `test:packaged` ejecuta
`release\win-unpacked\Meridiano Desk App.exe` sin devserver.

Se cubren conversión y DST, datos y listas vacías, casos, paletas, idiomas,
importación/exportación, accesibilidad, aislamiento de Node, funcionamiento
offline, animación, pausa y errores visibles. Las comprobaciones de ventana
recorren seis tamaños y páginas con 0, 1, 2, 3 y 30 relojes, sin alterar sus
preferencias. El barrido geométrico usa movimiento reducido; otras pruebas
comprueban los píxeles animados y que pausar el dibujo no detenga los relojes.

El diálogo de exportación usa el manejador nativo; solo su destino se fija desde
las pruebas para evitar interacción humana. No se instala el NSIS automáticamente
ni se accede a la web existente. Los resultados y capturas quedan en
`test-results`.

## Seguridad y límites

El renderer utiliza `nodeIntegration: false`, `contextIsolation: true`,
`sandbox: true` y seguridad web activa, sin preload ni IPC. El proceso principal
solo sirve archivos empaquetados permitidos; no expone acceso genérico al
filesystem. La CSP restringe scripts al origen local y prohíbe conexiones,
frames y objetos. Se bloquean navegación externa, ventanas nuevas, permisos y
solicitudes remotas. Las descargas permitidas son las exportaciones JSON iniciadas
por la app.

No hay bandeja, autoarranque, servicio ni actualizador. Los colores de los
controles nativos siguen la etiqueta `theme-color`, sin exponer capacidades
adicionales al renderer.

El conversor admite **1970–2100** y rechaza horas históricas ambiguas o
inexistentes en CDMX; el comparador distingue las horas repetidas por su desfase
UTC. La precisión depende del reloj de Windows y de las reglas IANA incluidas
con Electron. No hay sincronización NTP propia. El catálogo geográfico local
`src\zone.tab` corresponde a IANA tzdb **2026d** y no se descarga durante el uso.
Las siglas como ET son alias de búsqueda, no desfases fijos.

Las franjas laborales del comparador son orientativas: no representan
disponibilidad real, festivos ni cálculos astronómicos.

## Solución de problemas

| Situación | Qué hacer |
| --- | --- |
| Windows bloquea el archivo por editor desconocido | Consulta el apartado de firma y las políticas de tu organización. No desactives las protecciones. |
| Se abre una ventana con el diseño anterior | Cierra la instancia anterior antes de abrir el ejecutable actualizado. La app mantiene una sola instancia. |
| No aparecen los datos de la web | Es un almacenamiento separado. Utiliza la migración manual mediante JSON. |
| La distribución desempaquetada no abre | Conserva toda la carpeta `win-unpacked`; no muevas únicamente el EXE. |
| Aparece un aviso de preferencias inválidas | No borres el perfil como primer paso. El original se conserva; revisa el aviso y utiliza un respaldo válido para importar. |
| El sol, la luna o la Tierra no se mueven | Revisa su pausa, la opción de reducir movimiento y si estás convirtiendo un horario. Esos estados detienen el dibujo, no los relojes. |
| Hay scroll en un diálogo o en el comparador | Es intencional para mantener accesibles todos los datos. En ventanas muy pequeñas también se permite scroll general. |
| Desarrollo no inicia porque 5183 está ocupado | Identifica qué proceso usa el puerto. No cierres procesos ajenos ni reutilices el servidor web de 5173. |
| El empaquetador espera porque un EXE está bloqueado | Cierra únicamente tu copia de ese ejecutable y espera a que termine cualquier análisis de seguridad. No desactives el antivirus. |

## Licencias

Las texturas de la Tierra proceden de los ejemplos de
[three-globe](https://github.com/vasturiano/three-globe) y
[globe.gl](https://github.com/vasturiano/globe.gl); se conserva su licencia MIT en
`public\earth-textures.LICENSE.txt` y en el build. El sol y la luna se generan
proceduralmente con el código del proyecto, sin texturas descargadas.

`src\zone.tab` conserva el aviso de dominio público de IANA. Electron/Chromium
incluyen sus avisos en la distribución (`LICENSE.electron.txt` y
`LICENSES.chromium.html`). React, Temporal y las otras dependencias conservan
sus licencias de paquete dentro de la distribución.

Los enlaces de esta documentación son referencias; la app no los consulta.
