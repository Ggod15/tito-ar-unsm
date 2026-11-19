// Todo lo que Tito dice y muestra. Edita aquí.
// Cada sección tiene "parts": lo que Tito DICE (say) y los puntos que aparecen en su tarjeta holográfica (lines).
// Los textos marcados con VERIFICAR son referenciales: reemplázalos con los datos oficiales de la facultad.
window.CONTENT = {
  ar: {
    qrSizeM: 0.15,  // tamaño IMPRESO del QR en metros (cámbialo si imprimes otro tamaño: define la distancia estimada)
    scale: 0.55,    // tamaño de Tito cuando aparece a refDist metros
    refDist: 2.0,   // distancia "cómoda" a la que Tito se ve con ese tamaño
    minDist: 0.4,
    maxDist: 8,
    camFov: 65,     // campo de visión vertical de la cámara (aprox.)
  },

  mascot: {
    name: "Tito",
    welcome:
      "¡Hola! Soy Tito, el mono tocón, mascota de Ingeniería de Sistemas e Informática de la Universidad Nacional de San Martín. Te voy a contar todo sobre nuestra facultad. ¡Empecemos!",
    outro:
      "¡Eso es todo por ahora! Si quieres jugar, toca Trivia en el menú. ¡Te esperamos en Sistemas!",
    askMore: "¿Qué más quieres saber? Elige otra opción del menú.",
    funFacts: [
      "¿Sabías que el mono tocón vive solo en San Martín? ¡Igual que nuestra facultad, somos únicos!",
      "Un ingeniero de sistemas no solo programa: también diseña redes, protege datos y lidera proyectos.",
      "El primer programador de la historia fue Ada Lovelace, ¡en el siglo diecinueve!",
      "Cada vez que usas una app del celular, detrás hay un ingeniero de sistemas.",
    ],
  },

  sections: [
    {
      id: "universidad", icon: "🏛️", title: "La UNSM",
      parts: [
        { say: "La Universidad Nacional de San Martín es la universidad pública de nuestra región.",
          lines: ["Universidad Nacional de San Martín (UNSM)", "Universidad pública de la región San Martín"] },
        { say: "Su ciudad universitaria está en Morales, junto a Tarapoto, en plena selva alta del Perú.",
          lines: ["📍 Sede principal: Morales, Tarapoto", "🌿 Selva alta del Perú"] },
        // VERIFICAR: agrega año de creación, licenciamiento, número de facultades, etc.
      ],
    },
    {
      id: "carrera", icon: "💻", title: "La carrera",
      parts: [
        { say: "Ingeniería de Sistemas e Informática te forma para crear tecnología que resuelve problemas reales.",
          lines: ["Escuela Profesional de Ingeniería de Sistemas e Informática"] },
        { say: "Aprenderás a desarrollar software y aplicaciones web y móviles, y a diseñar y administrar redes y servidores.",
          lines: ["⚙️ Desarrollo de software web y móvil", "🌐 Redes y servidores"] },
        { say: "También a gestionar bases de datos, proteger la información y dirigir proyectos de tecnología.",
          lines: ["🗄️ Bases de datos y análisis de datos", "🔐 Ciberseguridad", "📊 Gestión de proyectos TI"] },
        // VERIFICAR: grado, título, duración y perfil de egreso oficial
      ],
    },
    {
      id: "malla", icon: "📚", title: "Malla curricular",
      parts: [ // VERIFICAR: reemplaza con la malla oficial
        { say: "La carrera se organiza en diez ciclos.", lines: ["10 ciclos de formación", "(malla referencial)"] },
        { say: "En los primeros ciclos aprendes las bases: matemática, física, programación y estructuras de datos.",
          lines: ["Ciclos I–III", "Matemática · Física · Fundamentos de programación · Estructuras de datos"] },
        { say: "Después llegan las bases de datos, las redes, la ingeniería de software y el desarrollo web.",
          lines: ["Ciclos IV–VI", "Base de datos · Redes · Ingeniería de software · Desarrollo web"] },
        { say: "Más adelante, seguridad informática, inteligencia artificial, gestión de proyectos y computación en la nube.",
          lines: ["Ciclos VII–IX", "Seguridad · Inteligencia artificial · Gestión de proyectos TI · Nube"] },
        { say: "Y terminas con tu tesis, cursos electivos y tus prácticas pre profesionales.",
          lines: ["Ciclo X", "Tesis · Electivos · Prácticas pre profesionales"] },
      ],
    },
    {
      id: "laboratorios", icon: "🧪", title: "Laboratorios",
      parts: [ // VERIFICAR: ajusta a los laboratorios reales
        { say: "Aquí aprendes haciendo. En los laboratorios de cómputo practicas programación y bases de datos.",
          lines: ["🖥️ Laboratorio de cómputo", "Programación y bases de datos"] },
        { say: "En el laboratorio de redes armas y configuras routers, switches y servidores. Y también hay espacio para hardware y proyectos de innovación.",
          lines: ["📡 Redes y comunicaciones", "🔧 Hardware y mantenimiento", "🤖 Innovación: IoT, robótica e IA"] },
      ],
    },
    {
      id: "laboral", icon: "🚀", title: "Campo laboral",
      parts: [
        { say: "Como ingeniero de sistemas puedes trabajar en desarrollo de software, redes e infraestructura, o ciberseguridad.",
          lines: ["👨‍💻 Desarrollo de software", "🌐 Redes e infraestructura", "🛡️ Ciberseguridad"] },
        { say: "También en análisis de datos e inteligencia artificial, en la gestión de proyectos de tecnología, o creando tu propia empresa.",
          lines: ["📈 Datos e inteligencia artificial", "🗂️ Gestión de TI", "💡 Emprendimiento tecnológico"] },
      ],
    },
    {
      id: "contacto", icon: "📞", title: "Contacto",
      parts: [
        { say: "¿Te animaste? Visita la página oficial de la universidad para conocer más y postular.",
          lines: ["🌐 www.unsm.edu.pe"] }, // VERIFICAR / COMPLETAR: Facebook, correo, teléfono, admisión
      ],
    },
    {
      id: "trivia", icon: "🎮", title: "Trivia", quiz: true,
      intro: "¡Vamos a jugar! Te haré cinco preguntas de informática. Toca la respuesta correcta.",
      questions: [
        { q: "¿Qué significan las siglas CPU?", o: ["Unidad Central de Proceso", "Computador Personal Unificado", "Centro de Programas Útiles"], a: 0 },
        { q: "¿Qué lenguaje da estructura a las páginas web?", o: ["Python", "HTML", "SQL"], a: 1 },
        { q: "¿Qué dispositivo conecta redes y dirige paquetes de datos?", o: ["Router", "Monitor", "Teclado"], a: 0 },
        { q: "¿Qué lenguaje se usa para consultar bases de datos?", o: ["CSS", "SQL", "C++"], a: 1 },
        { q: "¿Qué hace la ciberseguridad?", o: ["Acelera el internet", "Protege sistemas y datos", "Diseña logotipos"], a: 1 },
      ],
    },
  ],
};
