// ============================================================
// EspacioVivo - script.js
// Funciones sencillas que se llaman desde el HTML con onclick,
// onchange u onsubmit. El HTML ya está escrito en las páginas.
// ============================================================

// ----- Datos generales -----
const CLAVE = "espaciovivo_v3"; // nombre con el que se guarda en el navegador
const CODIGO_AUTORIDAD = "AUT-2026"; // código SIMULADO de acreditación (demostración)

// Nombres completos de las categorías
const NOMBRES = {
    Juegos: "Juegos infantiles",
    Bancas: "Bancas",
    Luz: "Iluminación",
    Acceso: "Accesibilidad",
    Caminos: "Caminos",
    Verde: "Áreas verdes"
};

// Datos de las propuestas base (los usa detalle.html)
const propuestas = {
    1: { titulo: "Reparar los columpios", categoria: "Juegos", quien: "Familia, Niños", descripcion: "Los columpios tienen cadenas rotas y son peligrosos para los niños.", motivo: "Muchas familias usan el parque cada tarde.", estado: "En revisión", apoyos: 24 },
    2: { titulo: "Rampa en el camino central", categoria: "Acceso", quien: "Movilidad, Mayores", descripcion: "El camino central tiene un desnivel sin rampa y obliga a rodear por la calle.", motivo: "Las personas en silla de ruedas no pueden cruzar el parque.", estado: "Publicada", apoyos: 3 },
    3: { titulo: "Luz en la cancha", categoria: "Luz", quien: "Jóvenes, Todos", descripcion: "Instalar más luminarias en la cancha y en el sector del fondo.", motivo: "Al anochecer el parque se vacía porque la gente se siente insegura.", estado: "Publicada", apoyos: 11 },
    4: { titulo: "Cambiar las bancas rotas", categoria: "Bancas", quien: "Mayores, Familia", descripcion: "Reemplazar las bancas dañadas cerca de los juegos.", motivo: "Los adultos mayores necesitan lugares seguros para descansar.", estado: "En ejecución", apoyos: 17 },
    5: { titulo: "Podar árboles y cortar el pasto", categoria: "Verde", quien: "Todos", descripcion: "Mantener las áreas verdes limpias y seguras.", motivo: "El pasto alto esconde objetos y se ve descuidado.", estado: "Publicada", apoyos: 8 }
};

// ----- Variables globales -----
let datos = leerDatos();      // usuario, apoyos, inscripciones y propuestas creadas
let accionPendiente = null;   // acción que se hace después de iniciar sesión
let categoriaActiva = "";     // categoría elegida en los filtros
let idActual = null;          // propuesta que se ve en detalle.html
let idAtencion = null;        // propuesta que la Autoridad está atendiendo

// ============================================================
// GUARDAR Y LEER DATOS (localStorage)
// ============================================================
function leerDatos() {
    try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE));
        if (guardado) {
            guardado.atenciones = guardado.atenciones || {};
            return guardado;
        }
    } catch (e) { }
    return { usuario: null, apoyadas: [], inscritas: [], propias: [], atenciones: {} };
}

function guardarDatos() {
    try {
        localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch (e) { }
}

// Busca una propuesta base o una creada por el usuario
function buscarPropuesta(id) {
    return propuestas[id] || datos.propias.find(p => String(p.id) === String(id));
}

// Evita que el texto escrito por el usuario rompa el HTML
function esc(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

// ============================================================
// AVISOS Y VENTANAS
// ============================================================
function mostrarAviso(texto) {
    document.getElementById("textoAviso").textContent = texto;
    bootstrap.Toast.getOrCreateInstance(document.getElementById("aviso")).show();
}

function abrirModal(id) {
    const modal = document.getElementById(id);
    if (!modal) {            // en detalle.html no existen las ventanas: volvemos al inicio
        location.href = "./index.html";
        return;
    }
    bootstrap.Modal.getOrCreateInstance(modal).show();
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();
}

// ============================================================
// SESIÓN (solo se pide para crear propuesta e inscribirse)
// ============================================================
function actualizarSesion() {
    const etiqueta = document.getElementById("etiquetaSesion");
    const rol = esAutoridad() ? " · Autoridad" : "";
    etiqueta.textContent = datos.usuario ? "Salir (" + datos.usuario.nombre + rol + ")" : "Iniciar sesión";
}

// Botón de la barra: abre el acceso o cierra la sesión
function manejarSesion() {
    if (datos.usuario) {
        datos.usuario = null;
        guardarDatos();
        actualizarSesion();
        mostrarParticipacion();
        marcarEstados();
        mostrarAviso("Cerraste sesión.");
        return;
    }
    abrirModal("modalAcceso");
}

// Si no hay sesión, abre el acceso y recuerda qué quería hacer el usuario
function pedirSesion(accion) {
    if (datos.usuario) return true;
    accionPendiente = accion;
    abrirModal("modalAcceso");
    mostrarAviso("Ingresa o crea tu cuenta para continuar.");
    return false;
}

function iniciarSesion(event) {
    event.preventDefault();
    const f = event.target;
    // Si eligió Autoridad, el código de acreditación debe ser el correcto (simulación)
    const rol = f.rol.value;
    f.codigo.setCustomValidity(rol !== "autoridad" || f.codigo.value.trim() === CODIGO_AUTORIDAD ? "" : "Código inválido");
    f.classList.add("was-validated");
    if (!f.checkValidity()) {          // muestra los mensajes de error
        f.querySelector(":invalid").focus();
        return;
    }

    const correo = f.correo.value.trim();
    datos.usuario = { nombre: f.nombre.value.trim() || correo.split("@")[0], correo: correo, rol: rol };
    guardarDatos();
    f.reset();
    cambiarRol();
    f.classList.remove("was-validated");
    cerrarModal("modalAcceso");
    actualizarSesion();
    mostrarParticipacion();
    marcarEstados();
    mostrarAviso("Sesión iniciada.");

    // Continúa con lo que el usuario quería hacer
    if (accionPendiente) {
        const accion = accionPendiente;
        accionPendiente = null;
        accion();
    }
}

// ============================================================
// APOYAR PROPUESTAS (no requiere sesión, un apoyo por dispositivo)
// ============================================================
function apoyar(id) {
    id = String(id);
    if (datos.apoyadas.includes(id)) {
        mostrarAviso("Ya apoyaste esta propuesta desde este dispositivo.");
        return;
    }
    datos.apoyadas.push(id);
    guardarDatos();
    marcarApoyadas();
    marcarApoyoDetalle();
    mostrarParticipacion();
    mostrarAviso("¡Gracias por apoyar esta propuesta!");
}

// Actualiza contadores y botones de las tarjetas de index.html
function marcarApoyadas() {
    document.querySelectorAll(".propuesta").forEach(function (tarjeta) {
        const ya = datos.apoyadas.includes(tarjeta.dataset.id);
        tarjeta.querySelector(".contador").textContent = Number(tarjeta.dataset.apoyos) + (ya ? 1 : 0);
        const boton = tarjeta.querySelector(".btn-apoyar");
        boton.textContent = ya ? "Apoyada ✓" : "Apoyar";
        boton.setAttribute("aria-pressed", ya);
    });
}

// ============================================================
// FILTROS Y ORDEN
// ============================================================
function filtrarCategoria(boton) {
    const categoria = boton.dataset.categoria;
    categoriaActiva = (categoriaActiva === categoria) ? "" : categoria; // clic otra vez = quitar filtro
    document.querySelectorAll(".filtro-cat").forEach(function (b) {
        const activo = b.dataset.categoria === categoriaActiva;
        b.classList.toggle("activo", activo);
        b.setAttribute("aria-pressed", activo);
    });
    aplicarFiltros();
}

function aplicarFiltros() {
    const quien = document.getElementById("filtroQuien").value;
    let visibles = 0;
    document.querySelectorAll(".propuesta").forEach(function (tarjeta) {
        const okCategoria = !categoriaActiva || tarjeta.dataset.categoria === categoriaActiva;
        const beneficiarios = tarjeta.dataset.quien;
        const okQuien = quien === "Todos" || beneficiarios.includes(quien) || beneficiarios.includes("Todos");
        const mostrar = okCategoria && okQuien;
        tarjeta.classList.toggle("d-none", !mostrar);
        if (mostrar) visibles++;
    });
    document.getElementById("sinResultados").classList.toggle("d-none", visibles > 0);
}

function ordenarPropuestas() {
    const lista = document.getElementById("listaPropuestas");
    const orden = document.getElementById("orden").value;
    const tarjetas = Array.from(lista.querySelectorAll(".propuesta"));
    const apoyos = t => Number(t.querySelector(".contador").textContent);

    tarjetas.sort(function (a, b) {
        if (orden === "apoyadas") return apoyos(b) - apoyos(a);               // más apoyos primero
        if (orden === "visitas") return a.dataset.visitas - b.dataset.visitas; // menos visitas primero
        return a.dataset.dias - b.dataset.dias;                                // más recientes primero
    });
    tarjetas.forEach(t => lista.appendChild(t));
}

// ============================================================
// CREAR PROPUESTA (requiere sesión)
// ============================================================
function abrirCrear() {
    if (pedirSesion(abrirCrear)) abrirModal("modalCrear");
}

function publicarPropuesta(event) {
    event.preventDefault();
    const f = event.target;
    f.classList.add("was-validated");
    if (!f.checkValidity()) {                         // faltan campos obligatorios
        const primero = f.querySelector(":invalid");
        if (primero) primero.focus();
        return;
    }
    const quien = Array.from(f.querySelectorAll('input[name="quien"]:checked')).map(i => i.value);
    const p = {
        id: "u" + Date.now(),
        titulo: f.titulo.value.trim(),
        categoria: f.categoria.value,
        quien: quien.length ? quien.join(", ") : "Sin indicar",
        descripcion: f.descripcion.value.trim(),
        motivo: f.motivo.value.trim(),
        estado: "Publicada",
        apoyos: 0
    };
    datos.propias.unshift(p);
    guardarDatos();
    agregarTarjeta(p);
    marcarEstados();
    aplicarFiltros();
    mostrarParticipacion();

    // Datos de la ventana de confirmación
    document.getElementById("resumenTitulo").textContent = p.titulo;
    document.getElementById("resumenCategoria").textContent = NOMBRES[p.categoria];
    document.getElementById("resumenQuien").textContent = p.quien;

    f.reset();
    f.classList.remove("was-validated");
    cerrarModal("modalCrear");
    abrirModal("modalConfirmacion");
}

// Agrega al inicio de la lista la tarjeta de una propuesta nueva
function agregarTarjeta(p) {
    const html = `
    <div class="col-12 col-md-6 col-lg-4 propuesta" data-id="${p.id}" data-categoria="${p.categoria}" data-quien="${esc(p.quien)}" data-dias="0" data-apoyos="${p.apoyos}" data-visitas="0">
        <article class="card tarjeta h-100">
            <div class="card-body d-flex flex-column gap-2">
                <h3 class="h6 fw-bold">${esc(p.titulo)}</h3>
                <span class="etiqueta"><svg class="icono"><use href="#i-${p.categoria.toLowerCase()}" /></svg> ${NOMBRES[p.categoria]}</span>
                <p class="small mb-0">Beneficia a: ${esc(p.quien)}</p>
                <p class="fw-bold mb-0"><svg class="icono"><use href="#i-corazon" /></svg> <span class="contador">${p.apoyos}</span> apoyos</p>
                <div class="d-flex gap-2 mt-auto">
                    <button type="button" class="btn btn-apoyar w-100" onclick="apoyar('${p.id}')">Apoyar</button>
                    <a href="./detalle.html?id=${p.id}" class="btn btn-outline-espacio w-100">Ver detalle</a>
                </div>
            </div>
        </article>
    </div>`;
    document.getElementById("listaPropuestas").insertAdjacentHTML("afterbegin", html);
}

// ============================================================
// ACTIVIDADES (inscribirse requiere sesión)
// ============================================================
function inscribirse(id) {
    id = String(id);
    if (!pedirSesion(function () { inscribirse(id); })) return;

    const actividad = document.querySelector('.actividad[data-id="' + id + '"]');
    if (datos.inscritas.includes(id)) {
        mostrarAviso("Ya estás inscrito en esta actividad.");
        return;
    }
    if (Number(actividad.dataset.cupo) < 1) {
        mostrarAviso("Esta actividad ya no tiene cupos.");
        return;
    }
    datos.inscritas.push(id);
    guardarDatos();
    marcarInscritas();
    mostrarParticipacion();
    mostrarAviso("¡Te inscribiste! Gracias por colaborar.");
}

function marcarInscritas() {
    document.querySelectorAll(".actividad").forEach(function (a) {
        const ya = datos.inscritas.includes(a.dataset.id);
        a.querySelector(".cupo").textContent = Number(a.dataset.cupo) - (ya ? 1 : 0);
        const boton = a.querySelector("button");
        boton.textContent = ya ? "Inscrito ✓" : "Inscribirme";
        boton.setAttribute("aria-pressed", ya);
    });
}

// ============================================================
// MI PARTICIPACIÓN
// ============================================================
function llenarLista(id, items, vacio) {
    document.getElementById(id).innerHTML = items.length
        ? items.map(t => "<li>" + esc(t) + "</li>").join("")
        : "<li>" + vacio + "</li>";
}

function mostrarParticipacion() {
    const aviso = document.getElementById("participacionAviso");
    if (!aviso) return; // esta sección solo existe en index.html
    const hayUsuario = !!datos.usuario;
    aviso.classList.toggle("d-none", hayUsuario);
    document.getElementById("participacionContenido").classList.toggle("d-none", !hayUsuario);
    if (!hayUsuario) return;

    document.getElementById("saludo").textContent = "Hola, " + datos.usuario.nombre;
    llenarLista("misPropuestas", datos.propias.map(p => p.titulo + " (Estado: " + p.estado + ")"), "Todavía no has publicado propuestas.");
    llenarLista("misApoyos", datos.apoyadas.map(buscarPropuesta).filter(Boolean).map(p => p.titulo), "Aún no has apoyado propuestas.");
    llenarLista("misActividades", datos.inscritas.map(function (id) {
        return document.querySelector('.actividad[data-id="' + id + '"] h3').textContent;
    }), "No te has inscrito en actividades.");

    // Insignia por aportar (no por votos)
    const colabora = datos.propias.length > 0 || datos.inscritas.length > 0;
    document.getElementById("insignia").textContent = colabora ? "Vecino colaborador" : "Aún no tienes insignia";
}

// ============================================================
// ROL AUTORIDAD: ATENDER PROPUESTAS (simulación)
// ============================================================
function esAutoridad() {
    return !!datos.usuario && datos.usuario.rol === "autoridad";
}

// Muestra u oculta el campo del código según el rol elegido en el acceso
function cambiarRol() {
    const esAut = document.getElementById("rol-autoridad").checked;
    document.getElementById("campoCodigo").classList.toggle("d-none", !esAut);
    document.getElementById("codigo").required = esAut;
}

// Pone en cada tarjeta la etiqueta "Atendida" o, si es Autoridad, el botón para atender
function marcarEstados() {
    document.querySelectorAll(".propuesta").forEach(function (tarjeta) {
        const id = tarjeta.dataset.id;
        let espacio = tarjeta.querySelector(".espacio-atencion");
        if (!espacio) {
            tarjeta.querySelector(".contador").parentElement.insertAdjacentHTML("afterend", '<div class="espacio-atencion"></div>');
            espacio = tarjeta.querySelector(".espacio-atencion");
        }
        const atendida = datos.atenciones[id];
        tarjeta.querySelector(".tarjeta").classList.toggle("atendida", !!atendida);
        if (atendida) {
            espacio.innerHTML = '<span class="etiqueta bg-white"><svg class="icono"><use href="#i-check" /></svg> Atendida</span>';
        } else if (esAutoridad()) {
            espacio.innerHTML = '<button type="button" class="btn btn-outline-espacio w-100" onclick="abrirAtencion(\'' + id + '\')">Marcar como atendida</button>';
        } else {
            espacio.innerHTML = "";
        }
    });
}

function abrirAtencion(id) {
    if (!esAutoridad()) {
        mostrarAviso("Solo la Autoridad verificada puede atender propuestas.");
        return;
    }
    idAtencion = String(id);
    document.getElementById("atencionTitulo").textContent = buscarPropuesta(id).titulo;
    abrirModal("modalAtencion");
}

function guardarAtencion(event) {
    event.preventDefault();
    if (!esAutoridad()) {
        mostrarAviso("Solo la Autoridad verificada puede atender propuestas.");
        return;
    }
    const f = event.target;
    f.classList.add("was-validated");
    if (!f.checkValidity()) {            // la respuesta oficial es obligatoria
        f.respuesta.focus();
        return;
    }
    datos.atenciones[idAtencion] = { estado: "Atendida", respuesta: f.respuesta.value.trim(), autoridad: datos.usuario.nombre };
    guardarDatos();
    f.reset();
    f.classList.remove("was-validated");
    cerrarModal("modalAtencion");
    marcarEstados();
    mostrarAviso("Propuesta marcada como atendida.");
}

// ============================================================
// PÁGINA DE DETALLE (detalle.html?id=1)
// ============================================================
function cargarDetalle() {
    idActual = new URLSearchParams(location.search).get("id") || "1";
    const p = buscarPropuesta(idActual);
    if (!p) {
        document.getElementById("tituloDetalle").textContent = "No encontramos esta propuesta.";
        return;
    }
    document.title = p.titulo + " | EspacioVivo";
    document.getElementById("tituloDetalle").textContent = p.titulo;
    document.getElementById("detalleCategoria").textContent = NOMBRES[p.categoria];
    // Si la Autoridad atendió la propuesta, se muestra su estado y su respuesta oficial
    const atencion = datos.atenciones[idActual];
    document.getElementById("detalleEstado").textContent = atencion ? atencion.estado : p.estado;
    if (atencion) {
        document.getElementById("detalleRespuesta").textContent = atencion.respuesta;
        document.getElementById("detalleAutoridad").textContent = atencion.autoridad;
        document.getElementById("bloqueRespuesta").classList.remove("d-none");
    }
    document.getElementById("detalleQuien").textContent = p.quien;
    document.getElementById("detalleDescripcion").textContent = p.descripcion;
    document.getElementById("detalleMotivo").textContent = p.motivo;
    document.getElementById("iconoDetalle").setAttribute("href", "#i-" + p.categoria.toLowerCase());
    marcarApoyoDetalle();
}

function apoyarDetalle() {
    apoyar(idActual);
}

function marcarApoyoDetalle() {
    const contador = document.getElementById("contadorDetalle");
    if (!contador || !idActual) return; // solo existe en detalle.html
    const p = buscarPropuesta(idActual);
    const ya = datos.apoyadas.includes(String(idActual));
    contador.textContent = p.apoyos + (ya ? 1 : 0);
    document.getElementById("botonApoyarDetalle").textContent = ya ? "PROPUESTA APOYADA ✓" : "APOYAR ESTA PROPUESTA";
}

// ============================================================
// AL CARGAR LA PÁGINA
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
    actualizarSesion();
    if (document.getElementById("listaPropuestas")) {          // index.html
        datos.propias.slice().reverse().forEach(agregarTarjeta);
        marcarApoyadas();
        marcarEstados();
        marcarInscritas();
        mostrarParticipacion();
    }
    if (document.getElementById("tituloDetalle")) {            // detalle.html
        cargarDetalle();
    }
});
