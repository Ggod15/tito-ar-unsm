# Tito · Guía AR de Ingeniería de Sistemas e Informática (UNSM)

Experiencia de realidad aumentada web: escaneas un QR, se abre la cámara y **Tito** (mono tocón) te explica la facultad con voz y subtítulos.
Ver el plan completo en [PLAN.md](PLAN.md).

## Probar en tu PC
```powershell
cd "C:\Proyectos\realidad aumentada"
python -m http.server 8080
```
Abre http://localhost:8080 (sin cámara en escritorio se muestra un fondo degradado; arrastra con el mouse para girar la vista y toca a Tito para un dato curioso).

## Probar en el celular (necesita HTTPS por la cámara)
Opciones gratis: arrastra la carpeta a **Netlify Drop**, o sube a **GitHub Pages / Vercel**. Luego abre `qr.html` en esa URL (o en local),
pega la URL pública y pulsa **Generar**: obtienes un QR por zona (`?s=laboratorios`, `?s=malla`, …). Imprímelos.

## Personalizar
- Todo el texto: `js/content.js` (revisa lo marcado `VERIFICAR`).
- Personaje (robot Byte): `js/mascot.js` (construido en código; logo en `assets/logo.png`).
- Colores: variables en `css/style.css`.

## Cómo funciona
1. El QR abre la página. Pulsas **Iniciar** y se abre la cámara en modo escaneo (Tito NO aparece todavía).
2. Al apuntar al QR (se lee con jsQR en el propio navegador), Tito **sale disparado** del código con portal, rayo de luz, chispas y sonido.
3. Tito explica todo con **voz y subtítulos**; los puntos clave aparecen en una **tarjeta holográfica 3D** sobre él. Hace un recorrido guiado automático (⏭ para saltar tema, menú para elegir uno).
4. Mientras ves el QR, Tito lo sigue; al apartar la cámara **se queda fijo** en el lugar donde apareció (giroscopio). 🔄 vuelve a escanear.

Limitación: el tamaño cambia mientras la cámara VEA el QR (mide su tamaño aparente = distancia). Si lo pierdes de vista, Tito se queda en el último punto (giroscopio). Para verlo desde más lejos imprime el QR más grande (qr.html) y ajusta `ar.qrSizeM` en js/content.js.
Ajustes en `js/content.js` → `ar` (tamaño impreso del QR, tamaño y distancia de Tito).

## AR real en Android (WebXR)
En Android con Chrome y ARCore, la pantalla de inicio muestra **"✨ Iniciar AR real"**: se detecta el piso, un toque coloca a Byte
y queda anclado en el espacio (al caminar se ve más grande o más chico de verdad). Flujo: escaneas el QR con la cámara normal del
teléfono (abre la página con `?s=zona`) → AR real → apuntas al piso → tocas. En iPhone y otros se usa el modo "escanear el QR".
Para probar la lógica en PC sin teléfono: añade `?xrmock=1` a la dirección.

## Acercar/alejar en cualquier celular (sin ARCore)
`js/motion.js` sigue pequeños parches de la imagen de la cámara: al acercarte, los puntos se "abren" desde el centro; al alejarte se "cierran".
Con eso se mueve una cámara virtual hacia adelante/atrás, así Byte se ve más grande o más chico aunque el QR ya no esté a la vista.
Cuando el QR vuelve a verse, se corrige la deriva. Limitaciones: necesita una escena con algo de textura (no una pared lisa), y solo estima el
avance hacia adelante/atrás (no el desplazamiento lateral).

## Interacción y escenas 3D
- **Escenas 3D por zona** (`js/scenes.js`): logo girando (UNSM y contacto), íconos de carreras/áreas orbitando (carrera y campo laboral; Byte resalta los que nombra),
  torre de 10 pisos para la malla (resalta los ciclos que nombra) y laboratorio (PC que se desarma + red con paquetes viajando).
  Qué escena usa cada zona y qué se resalta se configura al final de `js/content.js`.
- **Trivia con botones 3D**: al terminar el recorrido Byte ofrece jugar; las respuestas son botones que flotan a su lado y se tocan.
  También se puede entrar directo con el QR `?s=trivia`. Acertar -> salta; fallar -> niega con la cabeza.
- **Gestos sobre Byte** (`js/mascot-extras.js` + `js/app.js`): tocarlo -> salto, baile o giro; arrastrar sobre él -> lo giras (vuelve a mirarte solo);
  pellizcar con dos dedos (o rueda del mouse en PC) -> lo agrandas o achicas.
- **Vista previa para ensayar**: `?demo=malla&stage=2`, `?demo=laboratorios&stage=1`, `?demo=carrera`, `?demo=trivia`... muestra una escena fija sin voz ni recorrido.
