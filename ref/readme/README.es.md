# Gitty

[English](../../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · **Español** · [Français](README.fr.md) · [Deutsch](README.de.md)

> **Traducido el 2026-08-10.**
> El [README en inglés](../../README.md) es la versión oficial y la única que se
> mantiene al día. Este documento es una instantánea de ese momento; donde
> discrepen, manda el inglés. La interfaz está en inglés, así que los nombres de
> botones y menús se dejan tal cual.

Un navegador de historial de git para escritorio con cuatro paneles, en la línea
de `lazygit` pero con interacción de ratón de verdad: doble clic para abrir un
archivo, clic derecho para copiar su ruta, dos clics en dos commits para
compararlos.

```
┌──────────────────────┬──────────────────────┐
│ Working Tree         │ Diff                 │
│ (or a commit's files)│ (unified, coloured)  │
├──────────────────────┼──────────────────────┤
│ Commits              │ Terminal             │
│ (log, ↑↓, Enter)     │ (a real shell)       │
└──────────────────────┴──────────────────────┘
```

Todos los paneles se redimensionan arrastrando los separadores, y cada uno se
oculta y vuelve — véase [Pantalla completa y ocultar](#full-screen-and-hiding).

Poco habitual en otros navegadores de git:

- **Una shell de verdad acoplada al historial.** No un widget que llama a git,
  sino una shell de inicio de sesión genuina (`$SHELL`) con raíz en el
  repositorio, en la misma ventana que el diff. La mayoría de los navegadores de
  git dejan la terminal fuera, así que comprobar una corazonada significa saltar
  de ventana. Aquí está ahí mismo, y todos los demás paneles se refrescan según
  cambia el repositorio.
- **Dos commits a la vez.** Haz clic en uno, luego <kbd>Ctrl+clic</kbd> /
  <kbd>Shift+clic</kbd> en un segundo, y compara el par en el sitio — la mayoría
  solo compara un commit con su padre o con un árbol elegido en un diálogo.
- **Explora cualquier rama sin hacer checkout.** Elige una rama y tienes todo su
  historial para leer; el árbol de trabajo, los diffs y las terminales se quedan
  exactamente donde git los dejó. Nada del directorio de trabajo se mueve.
- **Vista previa de Markdown integrada.** Al seleccionar un cambio en un `.md` se
  representa el documento — código resaltado, un esquema que sigue tu scroll —
  en la revisión en la que estás, no solo en la copia de trabajo.
- **Un diff completo con el título de cada archivo fijado.** Sin nada
  seleccionado ves todos los cambios a la vez, y el encabezado del archivo que
  estás leyendo se queda pegado arriba hasta que el del siguiente lo desplaza.
- **Selección y copia de texto que simplemente funcionan** — sin modo ratón, sin
  registros, sin gimnasia de teclado; selecciona y copia lo que sea, donde sea.
- **Cada panel redimensionable, ocultable o a pantalla completa** — una
  disposición de cuatro paneles que se encoge hasta dejar solo el diff, o solo el
  log, y vuelve.

![Gitty 0.1.6](../../ref/gitty-0.1.6.png)

## ¿Por qué otro más? <a id="why-another-one"></a>

Porque cada herramienta a la que recurrí fallaba en algo:

- **IDEs** — demasiado pesados y demasiado lentos. (Créeme, he probado todos los
  que he encontrado.)
- **lazygit, grv** — herramientas excelentes, pero poco amables con el ratón y
  con seleccionar texto.
- **gitui** — quiero la lista de commits y el diff en pantalla a la vez.
- **SmartGit, GitKraken** — Java, pesados, anticuados, y quieren tu dinero.
- **gitg** y compañía — otra vez, sin lista de commits y diff en paralelo.
- **tig** — solo diffs, sin árbol de archivos que explorar.
- **gitk** — ¡feo!

Dos cosas más que quería y que casi nadie ofrecía: **vista previa de Markdown** y
**copiar y pegar que funcione** en cualquier parte de la ventana.

## Requisitos <a id="requirements"></a>

- Node.js 20 o posterior
- `git` en el `PATH`
- Linux, macOS o Windows con una sesión de escritorio
- Opcionalmente [gource](https://gource.io/) en el `PATH`, para
  [la animación](#gource); nada cambia si no está

## Ejecución <a id="running"></a>

Instala el comando `gitty` una vez:

```bash
npm install -g gitty-desktop      # installs the gitty command globally
```

o, desde una copia del repositorio, enlázalo a tu PATH con:

```bash
./setup.sh               # symlink into ~/.local/bin (no sudo)
./setup.sh --system      # symlink into /usr/local/bin (needs sudo)
```

La vía de `setup.sh` instala además un lanzador ejecutable, según la plataforma.

En **Linux** el icono se añade al tema hicolor y aparece una entrada
`gitty.desktop` en el menú de aplicaciones (y en el escritorio, cuando la sesión
tiene uno). Después se refrescan la caché de iconos y la base de datos de
escritorio, así que la entrada aparece con su icono de inmediato. Lleva un apaño,
y la aplicación corre con un interruptor de sandbox desactivado — véase
[Integración de escritorio en Linux](#linux-desktop-integration).

En **macOS** se escribe un `Gitty.app` mínimo en `~/Applications` (con un enlace
simbólico en el Escritorio) que envuelve el mismo `run.sh`. Nada está empaquetado:
el bundle existe para darle a Finder y al Dock un nombre y un icono. El Dock no se
toca — arrástralo allí tú mismo si quieres fijarlo. Véase
[Bundle de aplicación macOS](#macos-app-bundle).

Luego abre un repositorio desde donde sea:

```bash
gitty                    # open the repository in the current directory
gitty /path/to/repo      # open another repository
gitty --fg               # keep it attached to the terminal (Ctrl+C quits)
gitty --dev              # hot-reloading development mode
gitty --any              # start even outside a work tree (what the desktop
                         # entry uses), falling back to the last repositories
```

Gitty se separa de la terminal e imprime su pid, así que la shell sigue usable y
cerrarla no se lleva la ventana. La salida va a
`${XDG_STATE_HOME:-~/.local/state}/gitty/gitty.log`, que se recorta a su último
megabyte cuando pasa de 4 MB.

`./run.sh` es el mismo script y funciona igual sin el enlace simbólico. El
lanzador instala dependencias y reconstruye el bundle cuando las fuentes han
cambiado, así que la primera ejecución puede tardar un momento. `npm run dev`,
`npm run build` y `npm start` también están disponibles directamente.

Arrancar Gitty desde un directorio que no está dentro de un árbol de trabajo
recurre al último repositorio abierto, en vez de limitarse a protestar.

## La ventana <a id="the-window"></a>

Cuatro paneles en el centro, una barra de título encima y una barra de pestañas
debajo.

### Barra de título <a id="title-bar"></a>

De izquierda a derecha, describe el repositorio activo y luego actúa sobre él:

- **‹ › ▾** — dónde has estado en este repositorio. Véase
  [Volver atrás](#going-back).
- **La ruta del repositorio** es un botón: abre el menú de
  [repositorios recientes](#recent-repositories).
- **⎇ rama** también es un botón — la rama que git tiene en checkout, y un menú
  con todas las demás para leerlas. Véase
  [explorar otra rama](#browsing-another-branch).
- **`origin/main ↑2 ↓0`** — el upstream de la rama actual y cuánto se adelanta o
  se retrasa. Ausente en una rama que no sigue a ninguna.
- **`3 changed`** — cuántos archivos tiene el árbol de trabajo sin confirmar, el
  mismo recuento que lleva la fila **Working Tree** del panel de commits.
- **Panes ▾** — mostrar u ocultar cada uno de los cuatro; véase
  [Pantalla completa y ocultar](#full-screen-and-hiding).
- **Settings** — el diálogo de preferencias ([Ajustes](#settings)), también con
  <kbd>Ctrl+,</kbd>.
- **Open Repository** — un selector de directorios, que abre en una pestaña nueva
  (<kbd>Ctrl+O</kbd>).
- **Refresh** — releer el estado y el log a mano (<kbd>F5</kbd> /
  <kbd>Ctrl+R</kbd>). Gitty vigila el repositorio y se refresca solo; esto es
  para las veces en que la vigilancia no ve un cambio.

Mientras lees otra rama el botón de rama muestra `⎇ main › other-branch`, y los
errores del último comando de git aparecen en rojo junto a los recuentos.

### Volver atrás <a id="going-back"></a>

Leer historial significa deambular: un commit, un archivo dentro de él, otro
commit dos páginas más abajo en el log, y luego volver al primero. Los tres
botones a la izquierda de la barra de título recuerdan ese deambular, como lo
hace un navegador.

- **‹** (<kbd>Alt+←</kbd>) vuelve al lugar que estabas mirando antes de este, y
  **›** (<kbd>Alt+→</kbd>) regresa al que dejaste atrás. Ambos se atenúan cuando
  no hay adónde ir, y al pasar el ratón por cualquiera de ellos se nombra el
  lugar al que te llevaría.
- **▾** lista los lugares en sí, el más reciente primero, con un punto en el que
  estás. Elige cualquiera para saltar directamente allí.

Un *lugar* es todo lo que los dos paneles superiores estaban mostrando: la vista
— el árbol de trabajo, un commit, un rango de dos, una instantánea — el archivo
seleccionado dentro de ella, y el documento abierto junto al diff. Así que una
parada se lee como `Working tree`, `7bb7787 — Refresh screenshot batches`,
`src/main/git.ts @ 7bb7787` o `blame: src/main/git.ts @ 7bb7787`, y volver a
ella devuelve el mismo archivo a pantalla en la misma revisión en vez de
simplemente volver a seleccionar el commit.

El historial pertenece al repositorio, no a la ventana: cada pestaña recuerda sus
propios cincuenta lugares más recientes, y cambiar de pestaña cambia por cuáles
caminan los botones. No se conserva entre reinicios.

### Pestañas <a id="tabs"></a>

Una barra de pestañas en la parte inferior contiene cada repositorio abierto — su
nombre base, un punto amarillo cuando el árbol de trabajo tiene cambios sin
confirmar, y una **×** para cerrarlo. El punto cuenta todo lo que reporta
`git status`, archivos sin seguimiento incluidos, y se gana su sitio en las
pestañas que *no* estás mirando: el repositorio activo ya dice `3 changed` en la
barra de título, mientras que una pestaña de fondo está oculta por completo, así
que el punto es la única señal de que allí queda trabajo. Al pasar el ratón por
una pestaña se nombra el repositorio y se dice con palabras.

**+** (y <kbd>Ctrl+O</kbd>) abre otro repositorio en una pestaña nueva; la barra
de título siempre muestra el activo. Cada pestaña conserva sus propios paneles y
su terminal, así que el commit que estás leyendo y la shell que dejaste corriendo
siguen exactamente donde estaban cuando te vas y vuelves. Cerrar la última
pestaña deja una ventana vacía con un botón para abrir el siguiente repositorio.
(Las pestañas abiertas no se recuerdan entre reinicios.)

### Repositorios recientes <a id="recent-repositories"></a>

La ruta del repositorio en la barra de título es un menú de los repositorios
abiertos antes — nombre base más su directorio padre — el más reciente primero.

- **Clic** — abrirlo en una pestaña nueva.
- **Ctrl/Cmd+clic** o **clic central** — abrirlo en la pestaña actual,
  reemplazando el repositorio que hubiera allí y conservando el sitio de la
  pestaña en la barra.
- **Clic derecho** — quitar la entrada de la lista. El menú sigue abierto, así
  que se pueden limpiar varias seguidas.

**Open Repository…** y **Clear Recent** están debajo. La lista vive en
`~/.config/Gitty/recent-repos.json`, guarda doce entradas y omite las que se
hayan movido o borrado.

### Pantalla completa y ocultar <a id="full-screen-and-hiding"></a>

La cabecera de cada panel lleva los mismos dos controles: **⤢** a su izquierda
llena la ventana con ese panel, y **×** a su derecha lo oculta.

La pantalla completa cubre todo lo demás, incluidas las barras de título y de
pestañas, y los paneles de debajo siguen funcionando — la terminal continúa
ejecutándose mientras está tapada. **⤡** en la misma esquina, <kbd>Esc</kbd>, un
doble clic en la cabecera, o <kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd>
restauran la disposición. Solo un panel está a pantalla completa a la vez.

Ocultar es la otra dirección — cualquier panel puede guardarse y recuperarse:

- **Panes** en la barra de título lista los cuatro, con un punto junto a los
  visibles; al pulsar uno se alterna, y **Show All Panes** restaura la
  disposición de cuatro paneles.
- <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> alternan Files, Diff, Commits y Terminal,
  en ese orden.
- <kbd>Ctrl+Shift+0</kbd> recupera los cuatro — cero por «todos», una tecla más
  allá de las cuatro que alternan cada uno. Lleva Shift porque
  <kbd>Ctrl+0</kbd> es el restablecer-zoom del motor del navegador, que el menú
  View conserva.

Lo que queda se reparte la ventana, así que ocultar el panel de commits le da al
diff toda la altura. El último panel visible no tiene **×** — una ventana vacía
no dejaría nada donde hacer clic. Los paneles ocultos se recuerdan entre
reinicios, y el panel de la terminal solo se guarda, nunca se cierra: sus shells
siguen corriendo y vuelven con su historial de desplazamiento intacto.

## Los paneles <a id="the-panes"></a>

### Working Tree (arriba a la izquierda) <a id="working-tree-top-left"></a>

Los archivos modificados como un árbol plegable, cada uno con su número de líneas
junto al nombre. Se muestran dos columnas de estado: el del área de preparación
(verde) y el del árbol de trabajo (amarillo / rojo); los archivos sin seguimiento
son `??`. El recuento se lee del disco en el árbol de trabajo y de la revisión en
los demás casos; los archivos binarios, los borrados y los de más de 8 MB
sencillamente no muestran ninguno. Después va la rotación — cuántas líneas añadió
y quitó este cambio en ese archivo, `+12 −3`, contra HEAD en el árbol de trabajo
y contra el padre para un commit o un rango. Una instantánea es un árbol y no un
cambio, así que no tiene rotación; tampoco los archivos binarios ni un merge
commit, cuyo diff combinado no atribuye nada.

- **Clic** — mostrar el diff del archivo a la derecha.
- **Doble clic** — abrir el archivo entero como documento junto al diff, con
  números de línea y resaltado de sintaxis (un documento representado para
  markdown, la propia imagen para una imagen).
- **Clic derecho** — View File, Open in System App, Reveal in File Manager, Copy
  Relative Path, Copy Absolute Path, Copy File Name, Blame File, File History.
- **Clic en una carpeta** — plegarla o desplegarla.

Cuando hay un commit o un rango seleccionado, este panel lista los archivos de
ese commit; **Back to Work Tree** (o <kbd>Esc</kbd>) vuelve al árbol de trabajo.
En una [instantánea](#snapshots) lista el árbol entero en ese commit, no solo lo
que cambió.

### Diff (arriba a la derecha) <a id="diff-top-right"></a>

Diff unificado con números de línea antiguos y nuevos, cabeceras de hunk y color
de añadido/borrado, dispuesto como una lista de archivos: cada ruta es un título
a todo lo ancho, la cabecera de hunk está atenuada — es un rango de líneas, no lo
primero que hay que mirar — y un renombrado se lee `old → new`. Sin archivo
seleccionado lo muestra todo a la vez: cada cambio sin confirmar del árbol de
trabajo, o cada archivo del commit seleccionado.

- **Show Whole Diff** — volver a ese diff combinado tras elegir un archivo. Se
  queda en la cabecera y se ilumina mientras el diff completo es lo que estás
  viendo. La versión del árbol de trabajo cubre a la vez los cambios preparados y
  sin preparar, e inserta los archivos sin seguimiento (hasta 50, luego un
  aviso), que `git diff` por sí solo deja fuera.
- **Wrap** — ajustar las líneas largas en vez de desplazarse en horizontal.
  Activado por defecto.
- **Inline / Side-by-Side** — una columna con marcas `+`/`-`, o antiguo y nuevo
  uno al lado del otro, donde una tirada de borrados se empareja con los añadidos
  que la siguen. Las mitades ajustadas siguen alineadas.
- **Títulos de archivo** — cada título pliega su archivo: el triángulo lo reduce
  al nombre, y **Collapse All** / **Expand All** en la cabecera lo hacen con
  todos. **Ctrl+clic** en un título abre ese archivo en una pestaña de documento
  nueva; con clic derecho salen **Open in a New Tab**, **Select in the File
  List**, las copias de ruta y — en el árbol de trabajo, donde el archivo del
  disco es la versión mostrada — **Open in System App** y **Reveal in File
  Manager**. Un renombrado abre su ruta nueva.
- **Clic derecho** — Copy Selection, Copy Whole Diff y los mismos interruptores.

Las palabras que cambian dentro de una línea modificada se resaltan cuando eso se
lee mejor que la línea entera; es **Word highlight** en [Ajustes](#settings).

Los ajustes se recuerdan entre ejecuciones. Las filas se representan en bloques
de 1500 y se extienden al desplazarse, así que los commits grandes siguen ágiles;
los diffs de más de 2 MB se truncan con un aviso.

### Ver archivos enteros <a id="viewing-files"></a>

Por defecto el panel muestra un diff, pero cualquier archivo puede abrirse
entero: **doble clic** en el árbol, **View File** / **Preview** en la cabecera,
**Ctrl+clic** en un título de archivo dentro del diff, o desde cualquiera de los
dos menús contextuales.

El archivo se abre como documento propio en una tira de pestañas *junto* al diff,
en vez de encima, así que se puede leer sin perder el diff en el que estabas. La
pestaña **Diff** siempre va primera y un solo clic en el árbol sigue navegando
diffs en el sitio. Cada documento recuerda la revisión en la que se abrió, se
cierra con su propia **×** y relee un archivo del árbol de trabajo cuando el
repositorio cambia. Los archivos de código llevan números de línea y resaltado de
sintaxis; markdown se abre [representado](#markdown-preview), con un interruptor
para volver a la fuente; una imagen se abre como [la imagen](#images).

Qué revisión obtienes sigue al panel: el archivo del disco en el árbol de
trabajo, el archivo tal como estaba en el commit seleccionado en los demás casos.
Abrir un documento es una acción y no un modo — seleccionar otro archivo u otro
commit devuelve el diff — así que el panel nunca se queda atascado mostrando
archivos cuando querías cambios.

#### Instantáneas <a id="snapshots"></a>

Haz clic derecho en un commit y elige **Browse Snapshot** para leer el
repositorio tal como estaba en él: el panel superior izquierdo lista el árbol
*entero* en vez de los archivos que ese commit tocó, y cualquier archivo se abre
en esa revisión. Una instantánea no tiene diff que mostrar, así que allí todos
los archivos son documentos.

Los archivos de una instantánea nunca existieron en el disco en esa revisión, y
por eso **Open in System App** entrega una copia temporal y **Reveal in File
Manager** ni se ofrece. **Back to Work Tree** (o <kbd>Esc</kbd>) sale.

#### Vista previa de Markdown <a id="markdown-preview"></a>

Seleccionar un archivo `.md` añade un botón **Preview** — apagado por defecto,
así que un diff sigue siendo un diff hasta que lo pidas. Representa el archivo
entero: la versión del disco en el árbol de trabajo, la versión del commit
seleccionado en los demás casos.

Los bloques de código delimitados se resaltan cuando nombran un lenguaje, el
front matter YAML se extrae y se muestra como su propio bloque resaltado, y los
niveles de encabezado, las marcas de lista, los enlaces y el código en línea
llevan color para que la estructura se lea de un vistazo.

- **Wrap** — el mismo interruptor que el del diff, activado por defecto. La prosa
  siempre se ajusta; en una vista previa esto decide si los bloques de código, las
  tablas anchas y las cadenas largas en línea se ajustan también, en vez de
  desplazarse en horizontal.
- **Outline** — la estructura de encabezados junto al documento, sangrada por
  nivel, siguiendo el encabezado hasta el que has bajado. Haz clic en una entrada
  para saltar.
- **Clic derecho** — Copy Selection, Copy Markdown Source, los interruptores de
  ajuste y esquema, y Show Diff Instead.

El HTML crudo dentro del markdown no se representa, y los enlaces se abren en el
navegador del sistema y no dentro de la aplicación. Las imágenes escritas con
ruta relativa al documento se leen del repositorio — en la misma revisión que el
documento, así que un commit antiguo muestra las capturas con las que se publicó.
Una que el repositorio no tenga ahí deja un marcador de posición punteado con su
texto alternativo. Las imágenes de la web no se descargan en absoluto: leer el
README de un desconocido no debería anunciarte al servidor al que apunte.

#### Imágenes <a id="images"></a>

Un `.png`, `.jpg`, `.gif`, `.webp`, `.bmp`, `.ico`, `.avif` o `.svg` se abre como
la imagen y no como un aviso de que es binario — del disco en el árbol de
trabajo, del commit en los demás casos. Se ajusta al panel sobre un tablero de
ajedrez, para que la transparencia se lea como transparencia; **haz clic** para
verla a tamaño real y desplazarte, y otra vez para ajustarla. Sus dimensiones en
píxeles y su tamaño en disco van debajo. Las imágenes de más de 12 MB no se
insertan.

#### Blame e historial de archivo <a id="blame-and-file-history"></a>

Haz clic derecho en cualquier archivo del árbol y elige **Blame File** o **File
History**; ambos se abren como documentos junto al diff. Blame muestra una fila
por línea de código fuente — el commit, su autor y la línea en sí, con un guion
largo donde una línea aún no está confirmada — en la revisión que estás viendo.
File History lista cada commit que tocó el archivo, sigue los renombrados, y al
hacer clic en un commit lo abre.

### Commits (abajo a la izquierda) <a id="commits-bottom-left"></a>

El log de la rama actual, cargado de 300 en 300 y ampliado al desplazarse. La
primera fila es **Working Tree** — los cambios sin confirmar, con un recuento de
archivos modificados; seleccionarla devuelve los paneles superiores al árbol de
trabajo. Una caja de filtro encima del log reduce la lista a los commits cuyo
mensaje o autor contengan el texto que escribas — con espera, y una ✕ para
limpiar — y la lista pagina de la misma manera.

- **Clic** o <kbd>Enter</kbd> — mostrar ese commit: sus archivos llenan el panel
  superior izquierdo y su diff completo el superior derecho. El asunto, autor,
  fecha y cuerpo completo del commit aparecen en una franja encima de la lista de
  archivos; cuando el cuerpo es largo, un interruptor ▸ lo pliega para que la
  lista de archivos conserve el espacio.
- **Ctrl+clic** (<kbd>Cmd</kbd> en macOS), <kbd>Shift+clic</kbd> o
  <kbd>Space</kbd> — elegir un segundo commit y comparar los dos, el más antiguo
  primero.
- **↑ ↓ / j k / PgUp / PgDn / Home / End** — mover el cursor.
- **Clic derecho** — mostrar el diff, copiar el hash, el hash corto o el asunto,
  [explorar la instantánea](#snapshots), o comparar con el commit seleccionado.
- **Clic derecho → Open in Browser** — representar este commit en el navegador
  del sistema; **Copy Commit URL** copia el enlace. Un servidor web dentro de la
  aplicación (escuchando solo en `127.0.0.1`, para tu propio navegador) sirve cada
  repositorio abierto como una lista de commits navegable — el botón **Open in
  Browser** del panel de commits aterriza ahí — con los metadatos, archivos y diff
  de cada commit, y los diffs por archivo a un clic. Las URLs funcionan mientras
  el repositorio esté abierto.
- Seleccionar un archivo en el panel superior izquierdo estrecha el diff a ese
  archivo; **Show Whole Diff** lo vuelve a ensanchar.

#### Gource <a id="gource"></a>

Si [gource](https://gource.io/) está en el `PATH`, el panel de commits muestra un
botón **Gource** junto a **Open in Browser**: reproduce el historial del
repositorio como una animación — el árbol de directorios creciendo, los archivos
iluminándose al aterrizar cada commit, un autor volando entre ellos por cada
nombre en el log. Gource abre su propia ventana y sigue ejecutándose después de
cerrar Gitty; el botón solo espera lo suficiente para ver que arrancó, y muestra
lo que gource dijo si no lo hizo.

Se inicia con un día de historial por cada medio segundo, los archivos inactivos
se mantienen en pantalla y los huecos largos se saltan, que es lo que hace que un
repositorio real sea legible en vez de un goteo lento. No se instala nada por ti:
donde gource no está en el `PATH`, el botón simplemente no aparece.

#### Explorar otra rama <a id="browsing-another-branch"></a>

La rama de la barra de título abre un menú con todas las ramas locales y de
seguimiento remoto, la del commit más nuevo primero, y al elegir una se muestra
el historial de esa rama. Es una mirada de solo lectura: gitty no ejecuta ningún
`checkout`, así que el árbol de trabajo, sus diffs y las terminales se quedan
exactamente donde git los dejó. Mientras miras otra rama la barra de título dice
`⎇ main › other-branch` y el panel de commits indica qué rama está listando;
**Back to \<branch\>** vuelve. Cada pestaña explora por su cuenta.

#### Push y Pull <a id="push-and-pull"></a>

**Push** y **Pull** están en la cabecera, y ambos actúan sobre la rama en
checkout, apunte el log a la rama que apunte. **Push** cuenta lo que falta por
enviar — **Push 3** — y se apaga cuando no hay nada; en una rama que no sigue a
ninguna, publica la rama en `origin` y fija el upstream. **Pull** avanza en fast
forward desde el upstream, y se apaga cuando no hay upstream del que tirar. Lo
que diga git aparece sobre el log — clic para descartarlo; los fallos se quedan
hasta que lo hagas.

Ninguno puede responder a una petición: no hay terminal detrás, así que un push
que quiere una contraseña o una frase de paso falla con el mensaje de git en vez
de quedarse colgado, y un pull que no puede avanzar lo dice. Ambos se rematan
luego a mano en el panel de la terminal, que está justo ahí.

### Terminal (abajo a la derecha) <a id="terminal-bottom-right"></a>

Una shell de inicio de sesión interactiva de verdad (`$SHELL`) con raíz en el
repositorio, así que cualquier comando de git se ejecuta directamente. Los demás
paneles se refrescan automáticamente cuando el repositorio cambia en el disco.

El panel se divide en tantas shells como quieras: **Split →** pone una nueva al
lado de la terminal enfocada, **Split ↓** debajo, y los separadores entre ellas
se arrastran como los de cualquier otro panel. Al hacer clic en una terminal se
enfoca — la del contorno es donde aterrizan la siguiente división o **Close**.
Dividir dos veces en la misma dirección alarga la fila o la columna en vez de
anidar, así que tres terminales en paralelo se redimensionan entre sí.

**Close** termina la shell enfocada; salir de una shell con `exit` cierra su
división por sí solo. La última terminal siempre se queda: salir de ella deja el
aviso en pantalla en vez de un panel vacío.

## Ajustes <a id="settings"></a>

**Settings** en la barra de título, o <kbd>Ctrl+,</kbd>. Todo lo de aquí se
aplica a todas las pestañas y se recuerda entre reinicios; **Restore Defaults** lo
devuelve todo a su sitio.

| | |
| --- | --- |
| **Theme** | Dark o Light. |
| **Language** | English, 简体中文, 日本語, 한국어, Français, Deutsch, Español, Русский o Português — la interfaz, los menús y los diálogos cambian todos a la vez sin reiniciar. |
| **Font size** | 11 – 16, en medios puntos. Se aplica a todos los paneles, la terminal incluida. |
| **Row height** | 18 – 26 píxeles — la altura de línea sobre la que se construye cada lista: el árbol de archivos, el log y el diff. Más apretado cabe más en pantalla, más suelto se lee mejor. |
| **Diff layout** | Inline o Side-by-Side, el mismo interruptor que lleva la cabecera del diff. |
| **Word wrap** | Ajustar las líneas largas en vez de desplazarse en horizontal. |
| **Word highlight** | Marcar las palabras que cambiaron dentro de una línea modificada, no solo la línea. |
| **Markdown outline** | Mostrar el esquema junto a un documento representado. |

**Word wrap**, **Diff layout** y **Markdown outline** son los mismos
interruptores que lleva la cabecera del diff, así que cambiar uno en cualquiera
de los dos sitios cambia ambos. **Word highlight** solo vive aquí.

## Atajos de teclado <a id="keyboard-shortcuts"></a>

| Tecla | Acción |
| --- | --- |
| <kbd>Enter</kbd> | Mostrar el commit seleccionado |
| <kbd>Space</kbd> / <kbd>Ctrl+Click</kbd> | Marcar un segundo commit y comparar el par |
| <kbd>Ctrl+Click</kbd> en un título de archivo | Abrir ese archivo en una pestaña de documento nueva |
| <kbd>Esc</kbd> | Volver al árbol de trabajo |
| <kbd>Alt+←</kbd> / <kbd>Alt+→</kbd> | Atrás y adelante por los lugares visitados |
| <kbd>F5</kbd> / <kbd>Ctrl+R</kbd> | Refrescar estado y log |
| <kbd>Ctrl+O</kbd> | Abrir otro repositorio en una pestaña nueva |
| <kbd>Ctrl+,</kbd> | Ajustes |
| <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> | Ocultar o mostrar Files, Diff, Commits, Terminal |
| <kbd>Ctrl+Shift+0</kbd> | Mostrar de nuevo los cuatro paneles |
| <kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd> | Llenar la ventana con ese panel |

## Arquitectura <a id="architecture"></a>

```
src/main       Electron main process — git commands, ptys, fs watchers,
               the recent-repository store, IPC
src/preload    contextBridge API exposed to the renderer as window.gitty
src/renderer   React UI — App.tsx manages tabs, RepoTab.tsx owns one
               repository's four panes
src/shared     Types shared by both sides
build          Application icon (SVG source and rendered PNG)
```

git se maneja con `execFile('git', …)` analizando `--porcelain=v2 -z` /
`--name-status -z`, así que las rutas con espacios y los renombrados sobreviven.
No se empaqueta ninguna biblioteca de git; lo que veas es el `git` que haya en el
`PATH`. El renderer corre con `contextIsolation` y sin integración de node.

El renderer se divide en fragmentos de carga diferida para que la ventana se
pinte antes de que se analicen xterm, highlight.js y markdown-it. La división
—los cuatro fragmentos, las reglas para mantener las bibliotecas pesadas fuera de
los fragmentos calientes y cómo añadir una nueva— está especificada en
[ref/spec/lazy-loading.md](../../ref/spec/lazy-loading.md).

### Integración de escritorio en Linux <a id="linux-desktop-integration"></a>

La entrada de escritorio lleva `StartupWMClass=electron`, que es lo que le da a
la ventana en ejecución su icono en la lista de ventanas y en el dock. Una
aplicación Electron que se ejecuta en vez de empaquetarse reporta `electron` como
su clase de ventana se llame como se llame, así que ese es el nombre que la
entrada tiene que hacer coincidir — con el efecto secundario de que otra
aplicación Electron sin empaquetar en la misma sesión tomaría prestado el icono
de Gitty.

La aplicación también corre con el sandbox SUID de Chromium desactivado
(`ELECTRON_DISABLE_SANDBOX=1`). El arreglo habitual —que `chrome-sandbox`
pertenezca a root con modo 4755— no sobrevive dentro de `node_modules`, así que
desactivarlo es la opción pragmática para una herramienta local que solo lee tus
propios repositorios.

### Bundle de aplicación macOS <a id="macos-app-bundle"></a>

`Gitty.app` es un envoltorio, no un paquete: `Contents/MacOS/Gitty` es un script
de dos líneas que ejecuta `run.sh --fg --any`. `--fg` importa — hacer exec todo
el camino significa que el icono del Dock se queda sobre el bundle en vez de
quedar huérfano por un proceso que le sobrevive — y `--any` permite que un
lanzamiento desde Finder, que no tiene directorio de trabajo del que hablar,
recurra a los repositorios abiertos más recientemente.

El nombre es correcto en los tres sitios donde aparece, y solo uno de ellos
proviene del bundle. Finder y el Dock leen `CFBundleName` y `CFBundleIconFile` de
`Info.plist`; la barra de menú es `app.name`, que `app.setName('Gitty')`
establece antes de que exista ventana alguna y `{ role: 'appMenu' }` usa como su
etiqueta. Así que, a diferencia del problema de clase de ventana en Linux, aquí
nada es un apaño — por eso empaquetar (electron-builder) no aportaría nada salvo
la firma.

Un bundle lanzado desde Finder hereda el `PATH` mínimo de launchd, sin nvm ni
Homebrew, y `run.sh` necesita `node` y `npm` para reconstruir cuando el bundle
está desactualizado. `setup.sh` los resuelve en el momento de instalación y los
antepone — un prefijo, para que un lanzamiento desde terminal no se vea afectado.
Cambiar de versión de Node más tarde deja esa ruta obsoleta; vuelve a ejecutar
`setup.sh` para reajustarla.

## Licencia <a id="licence"></a>

MIT
