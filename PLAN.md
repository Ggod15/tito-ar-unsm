# Plan de implementación — "Tito, guía AR de Ingeniería de Sistemas e Informática (UNSM)"

## Objetivo
Al escanear un código QR ubicado en la facultad, el celular abre una página web que activa la cámara y hace
aparecer un personaje 3D (Tito, un mono tocón, fauna endémica de San Martín) que **habla** y explica la
Escuela de Ingeniería de Sistemas e Informática de la UNSM (Morales, Tarapoto).

## Decisiones técnicas
| Tema | Decisión | Motivo |
|---|---|---|
| Plataforma | Web (HTML + JS) | El QR abre un enlace; no se instala nada. Funciona en Android e iOS |
| Motor 3D/AR | A-Frame 1.5 + cámara como fondo + giroscopio | Sin marcadores ni archivos pesados; el personaje queda "anclado" al mundo al mover el celular |
| Personaje | Modelado con primitivas A-Frame (código) | Sin descargar modelos, carga instantánea, fácil de cambiar por un .glb |
| Voz | Web Speech API (`speechSynthesis`, es-PE/es-*) | Gratis, sin servidor, con subtítulos de respaldo |
| Contenido | `js/content.js` | Se edita sin tocar la lógica |
| QR | `qr.html` genera un QR por zona (`?s=laboratorios`) | Cada punto del campus abre directo su explicación |
| Hosting | GitHub Pages / Netlify / Vercel (HTTPS) | La cámara del celular exige HTTPS |

## Fases
1. **Base**: estructura de carpetas, pantalla de inicio, estilos.
2. **Mascota**: modelo 3D procedural con animaciones (flotar, parpadeo, saludo, boca al hablar).
3. **Lógica AR**: cámara, permiso de giroscopio (iOS), HUD, subtítulos, voz.
4. **Contenido**: universidad, carrera, malla curricular, laboratorios, campo laboral, trivia, contacto.
5. **QR por zonas**: generador imprimible.
6. **Pruebas**: navegador de escritorio, móvil (emulado), luego en celular real tras publicar.
7. **Entrega**: publicar, imprimir QR, preparar video de respaldo para la exposición.

## Estructura
```
index.html        experiencia AR
qr.html           generador de QR imprimibles
css/style.css
js/content.js     TODO el texto editable
js/mascot.js      componente A-Frame del personaje
js/app.js         cámara, voz, menú, paneles, trivia
```

## Pendiente por tu parte (datos reales)
Revisar en `js/content.js` lo marcado con `VERIFICAR`: historia, malla curricular oficial, nombres de laboratorios,
docentes/contacto. Los puse como referencia genérica para no inventar datos de la facultad.
