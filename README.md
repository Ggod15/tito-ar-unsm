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
- Personaje: `js/mascot.js` (o cambia por un modelo `.glb` con `gltf-model`).
- Colores: variables en `css/style.css`.

## Cómo funciona el "AR"
La cámara trasera se muestra como fondo y el personaje 3D se dibuja encima; el giroscopio mueve la vista, así que Tito parece
quedarse fijo en el espacio al mover el celular. Es AR sin marcadores, compatible con Android e iOS.
