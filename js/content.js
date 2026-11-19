// Todo el contenido editable de la experiencia.
// Los textos marcados con VERIFICAR son referenciales: reemplázalos con los datos oficiales de la facultad.
window.CONTENT = {
  mascot: {
    name: "Tito",
    welcome:
      "¡Hola! Soy Tito, el mono tocón, mascota de Ingeniería de Sistemas e Informática de la Universidad Nacional de San Martín. Toca una opción del menú y te cuento todo.",
    funFacts: [
      "¿Sabías que el mono tocón vive solo en San Martín? ¡Igual que nuestra facultad, somos únicos!",
      "Un ingeniero de sistemas no solo programa: también diseña redes, protege datos y lidera proyectos.",
      "El primer programador de la historia fue Ada Lovelace, ¡en el siglo diecinueve!",
      "Cada vez que usas una app del celular, detrás hay un ingeniero de sistemas.",
    ],
  },

  sections: [
    {
      id: "universidad",
      icon: "🏛️",
      title: "La UNSM",
      speak:
        "La Universidad Nacional de San Martín es la universidad pública de nuestra región. Su ciudad universitaria está en Morales, junto a Tarapoto, en plena selva alta del Perú.",
      body: [
        { type: "p", text: "La <b>Universidad Nacional de San Martín (UNSM)</b> es la universidad pública de la región San Martín." },
        { type: "p", text: "Su ciudad universitaria se encuentra en <b>Morales</b>, junto a Tarapoto." },
        // VERIFICAR: agrega año de creación, licenciamiento SUNEDU, número de facultades, etc.
        { type: "list", items: ["📍 Sede principal: Morales, Tarapoto", "🌿 Región San Martín, Perú", "🎓 Formación pública y de calidad"] },
      ],
    },
    {
      id: "carrera",
      icon: "💻",
      title: "La carrera",
      speak:
        "Ingeniería de Sistemas e Informática te forma para crear software, administrar redes y bases de datos, proteger la información y liderar proyectos de tecnología.",
      body: [
        { type: "p", text: "La Escuela Profesional de <b>Ingeniería de Sistemas e Informática</b> forma profesionales capaces de:" },
        {
          type: "list",
          items: [
            "⚙️ Desarrollar software y aplicaciones web y móviles",
            "🌐 Diseñar y administrar redes y servidores",
            "🗄️ Gestionar bases de datos y análisis de datos",
            "🔐 Proteger la información (ciberseguridad)",
            "📊 Dirigir proyectos y sistemas de información",
          ],
        },
        // VERIFICAR: grado, título, duración (ej. 10 ciclos) y perfil de egreso oficial
      ],
    },
    {
      id: "malla",
      icon: "📚",
      title: "Malla curricular",
      speak:
        "La carrera se organiza en diez ciclos. Empiezas con matemática y fundamentos, pasas a programación, bases de datos y redes, y terminas con ingeniería de software, inteligencia artificial y tu proyecto de tesis.",
      note: "Referencial: reemplaza con la malla oficial.", // VERIFICAR
      body: [
        {
          type: "ciclos",
          data: [
            ["I", "Matemática básica · Comunicación · Introducción a la Ingeniería de Sistemas · Fundamentos de programación"],
            ["II", "Cálculo · Física · Programación orientada a objetos · Lógica y matemática discreta"],
            ["III", "Estructuras de datos · Estadística · Arquitectura de computadoras · Contabilidad"],
            ["IV", "Base de datos I · Análisis de algoritmos · Sistemas operativos · Teoría de sistemas"],
            ["V", "Base de datos II · Redes de computadoras I · Ingeniería de requisitos · Investigación operativa"],
            ["VI", "Ingeniería de software · Redes II · Desarrollo web · Gestión de procesos"],
            ["VII", "Desarrollo móvil · Seguridad informática · Arquitectura de software · Inteligencia de negocios"],
            ["VIII", "Inteligencia artificial · Gestión de proyectos TI · Sistemas distribuidos · Metodología de la investigación"],
            ["IX", "Auditoría de sistemas · Computación en la nube · Electivos · Proyecto de tesis I"],
            ["X", "Emprendimiento tecnológico · Electivos · Proyecto de tesis II · Prácticas pre profesionales"],
          ],
        },
      ],
    },
    {
      id: "laboratorios",
      icon: "🧪",
      title: "Laboratorios",
      speak:
        "Aquí aprendes haciendo. En los laboratorios practicas programación, armas redes, y pruebas tus proyectos con equipos reales.",
      note: "Referencial: ajusta a los laboratorios reales.", // VERIFICAR
      body: [
        {
          type: "cards",
          items: [
            ["🖥️", "Laboratorio de cómputo", "Programación, bases de datos y desarrollo de software."],
            ["📡", "Redes y comunicaciones", "Configuración de routers, switches y servidores."],
            ["🔧", "Hardware y mantenimiento", "Ensamblaje y diagnóstico de equipos."],
            ["🤖", "Innovación y proyectos", "IoT, robótica, inteligencia artificial y prototipos."],
          ],
        },
      ],
    },
    {
      id: "laboral",
      icon: "🚀",
      title: "Campo laboral",
      speak:
        "Como ingeniero de sistemas puedes trabajar en desarrollo de software, redes, ciberseguridad, datos e inteligencia artificial, gestión de proyectos, o crear tu propia empresa de tecnología.",
      body: [
        {
          type: "cards",
          items: [
            ["👨‍💻", "Desarrollo de software", "Apps web, móviles y sistemas empresariales."],
            ["🌐", "Redes e infraestructura", "Servidores, nube y telecomunicaciones."],
            ["🛡️", "Ciberseguridad", "Protección de datos y sistemas."],
            ["📈", "Datos e IA", "Análisis de datos, machine learning, BI."],
            ["🗂️", "Gestión de TI", "Líder de proyectos y transformación digital."],
            ["💡", "Emprendimiento", "Crea tu startup tecnológica desde San Martín."],
          ],
        },
      ],
    },
    {
      id: "trivia",
      icon: "🎮",
      title: "Trivia",
      speak: "¡Vamos a jugar! Responde las preguntas y demuestra cuánto sabes de informática.",
      body: [
        {
          type: "quiz",
          questions: [
            { q: "¿Qué significan las siglas CPU?", o: ["Unidad Central de Proceso", "Computador Personal Unificado", "Centro de Programas Útiles"], a: 0 },
            { q: "¿Qué lenguaje da estructura a las páginas web?", o: ["Python", "HTML", "SQL"], a: 1 },
            { q: "¿Qué dispositivo conecta redes y dirige paquetes de datos?", o: ["Router", "Monitor", "Teclado"], a: 0 },
            { q: "¿Qué lenguaje se usa para consultar bases de datos?", o: ["CSS", "SQL", "C++"], a: 1 },
            { q: "¿Qué hace la ciberseguridad?", o: ["Acelera el internet", "Protege sistemas y datos", "Diseña logotipos"], a: 1 },
          ],
        },
      ],
    },
    {
      id: "contacto",
      icon: "📞",
      title: "Contacto",
      speak: "¿Te animaste? Visita nuestra página oficial o escríbenos para más información. ¡Te esperamos en Sistemas!",
      body: [
        { type: "p", text: "¿Quieres ser parte de Ingeniería de Sistemas e Informática?" },
        {
          type: "links",
          items: [
            ["🌐 Web de la UNSM", "https://www.unsm.edu.pe"],
            // VERIFICAR / COMPLETAR: Facebook de la facultad, correo, teléfono, admisión
            // ["📘 Facebook de la facultad", "https://facebook.com/..."],
            // ["✉️ Correo", "mailto:..."],
          ],
        },
      ],
    },
  ],
};
