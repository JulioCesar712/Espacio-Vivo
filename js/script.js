// ============================================================
// EspacioVivo - script.js
// Funciones sencillas que se llaman desde el HTML con onclick,
// onchange u onsubmit. El HTML ya está escrito en las páginas.
// ============================================================

// ----- Datos generales -----
const CLAVE = "espaciovivo_v4";        // nombre con el que se guarda en el navegador
const CODIGO_AUTORIDAD = "1234";       // código fácil para verificar autoridad

// Nombres completos de las categorías
const NOMBRES = {
    Juegos: "Juegos infantiles",
    Bancas: "Bancas",
    Luz: "Iluminación",
    Acceso: "Accesibilidad",
    Caminos: "Caminos",
    Verde: "Áreas verdes"
};

// Datos de las propuestas base (los usa detalle.html y el menú Atendidas)
const propuestas = {
    1: { titulo: "Reparar los columpios", categoria: "Juegos", quien: "Familia, Niños", descripcion: "Los columpios tienen cadenas rotas y son peligrosos para los niños.", motivo: "Muchas familias usan el parque cada tarde.", estado: "En revisión", apoyos: 24 },
    2: { titulo: "Rampa en el camino central", categoria: "Acceso", quien: "Movilidad, Mayores", descripcion: "El camino central tiene un desnivel sin rampa y obliga a rodear por la calle.", motivo: "Las personas en silla de ruedas no pueden cruzar el parque.", estado: "Publicada", apoyos: 3 },
    3: { titulo: "Luz en la cancha", categoria: "Luz", quien: "Jóvenes, Todos", descripcion: "Instalar más luminarias en la cancha y en el sector del fondo.", motivo: "Al anochecer el parque se vacía porque la gente se siente insegura.", estado: "Publicada", apoyos: 11 },
    4: { titulo: "Cambiar las bancas rotas", categoria: "Bancas", quien: "Mayores, Familia", descripcion: "Reemplazar las bancas dañadas cerca de los juegos.", motivo: "Los adultos mayores necesitan lugares seguros para descansar.", estado: "En ejecución", apoyos: 17 },
    5: { titulo: "Podar árboles y cortar el pasto", categoria: "Verde", quien: "Todos", descripcion: "Mantener las áreas verdes limpias y seguras.", motivo: "El pasto alto esconde objetos y se ve descuidado.", estado: "Publicada", apoyos: 8 }
};

// ----- Variables globales -----
let datos = leerDatos();      // usuario, apoyos, inscripciones, propias y atendidas
let accionPendiente = null;   // acción que se hace después de iniciar sesión
let categoriaActiva = "";     // categoría elegida en los filtros
let idActual = null;          // propuesta que se ve en detalle.html

// ============================================================
// GUARDAR Y LEER DATOS (localStorage)
// ============================================================
function leerDatos() {
    try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE));
        if (guardado) {
            if (!guardado.atendidas) guardado.atendidas = [];
            return guardado;
        }
    } catch (e) { }
    return { usuario: null, apoyadas: [], inscritas: [], propias: [], atendidas: [] };
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

function esAutoridad() {
    return !!(datos.usuario && datos.usuario.rol === "autoridad");
}

function estaAtendida(id) {
    return datos.atendidas.some(a => String(a.id) === String(id));
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
    if (!modal) {
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
// SESIÓN Y REGISTRO DE AUTORIDAD
// ============================================================
function alternarCamposAutoridad() {
    const rol = document.getElementById("rolUsuario").value;
    const bloque = document.getElementById("camposAutoridad");
    const esAut = rol === "autoridad";
    bloque.classList.toggle("d-none", !esAut);

    document.getElementById("cargoAutoridad").required = esAut;
    document.getElementById("ciAutoridad").required = esAut;
    document.getElementById("codigoAutoridad").required = esAut;
}

function actualizarSesion() {
    const etiqueta = document.getElementById("etiquetaSesion");
    if (datos.usuario) {
        const prefijo = esAutoridad() ? "Autoridad: " : "";
        etiqueta.textContent = "Salir (" + prefijo + datos.usuario.nombre + ")";
    } else {
        etiqueta.textContent = "Iniciar sesión";
    }

    // Banner y botones exclusivos de autoridad en index.html
    const banner = document.getElementById("bannerAutoridad");
    if (banner) {
        banner.classList.toggle("d-none", !esAutoridad());
        if (esAutoridad()) {
            document.getElementById("infoAutoridadBanner").textContent =
                datos.usuario.nombre + " (" + datos.usuario.cargo + " · CI: " + datos.usuario.ci + ")";
        }
    }

    document.querySelectorAll(".btn-atender").forEach(function (btn) {
        btn.classList.toggle("d-none", !esAutoridad());
    });
}

// Botón de la barra: abre el acceso o cierra la sesión
function manejarSesion() {
    if (datos.usuario) {
        datos.usuario = null;
        guardarDatos();
        actualizarSesion();
        mostrarParticipacion();
        if (document.getElementById("tituloDetalle")) cargarDetalle();
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
    const rol = f.rolUsuario.value;
    const inputCodigo = document.getElementById("codigoAutoridad");

    // Validar código de autoridad si seleccionó rol Autoridad
    if (rol === "autoridad") {
        if (inputCodigo.value.trim() !== CODIGO_AUTORIDAD) {
            inputCodigo.setCustomValidity("Código incorrecto");
        } else {
            inputCodigo.setCustomValidity("");
        }
    } else {
        inputCodigo.setCustomValidity("");
    }

    f.classList.add("was-validated");
    if (!f.checkValidity()) return;

    const correo = f.correo.value.trim();
    const nombre = f.nombre.value.trim() || correo.split("@")[0];

    if (rol === "autoridad") {
        datos.usuario = {
            rol: "autoridad",
            nombre: nombre,
            cargo: f.cargoAutoridad.value.trim(),
            ci: f.ciAutoridad.value.trim(),
            correo: correo
        };
    } else {
        datos.usuario = {
            rol: "vecino",
            nombre: nombre,
            correo: correo
        };
    }

    guardarDatos();
    f.reset();
    alternarCamposAutoridad();
    f.classList.remove("was-validated");
    cerrarModal("modalAcceso");
    actualizarSesion();
    mostrarParticipacion();
    mostrarAviso(rol === "autoridad" ? "Sesión iniciada como Autoridad verificada." : "Sesión iniciada.");

    if (accionPendiente) {
        const accion = accionPendiente;
        accionPendiente = null;
        accion();
    }
}

// ============================================================
// MARCAR COMO ATENDIDA Y MOVER AL MENÚ DE ATENDIDAS
// ============================================================
function marcarComoAtendida(id) {
    id = String(id);
    if (!esAutoridad()) {
        mostrarAviso("Solo una autoridad verificada puede atender propuestas.");
        return;
    }
    if (estaAtendida(id)) {
        mostrarAviso("Esta propuesta ya está en el menú de Atendidas.");
        return;
    }

    const p = buscarPropuesta(id);
    if (!p) return;

    const fechaHoy = new Date().toLocaleDateString("es-BO");
    datos.atendidas.unshift({
        id: id,
        autoridad: datos.usuario.nombre,
        cargo: datos.usuario.cargo,
        ci: datos.usuario.ci,
        fecha: fechaHoy
    });

    // Actualizar estado si es propuesta propia
    const propia = datos.propias.find(item => String(item.id) === id);
    if (propia) propia.estado = "Atendida";

    guardarDatos();
    renderizarAtendidas();
    aplicarFiltros();
    mostrarParticipacion();
    mostrarAviso("Propuesta marcada como atendida y movida al menú Atendidas.");
}

function renderizarAtendidas() {
    const listaAtendidas = document.getElementById("listaAtendidas");
    const sinAtendidas = document.getElementById("sinAtendidas");
    const contadorBadge = document.getElementById("contadorAtendidas");

    if (contadorBadge) contadorBadge.textContent = datos.atendidas.length;
    if (!listaAtendidas) return;

    listaAtendidas.innerHTML = "";
    sinAtendidas.classList.toggle("d-none", datos.atendidas.length > 0);

    datos.atendidas.forEach(function (registro) {
        const p = buscarPropuesta(registro.id);
        if (!p) return;

        const apoyosTotales = Number(p.apoyos) + (datos.apoyadas.includes(String(registro.id)) ? 1 : 0);
        const html = `
        <div class="col-12 col-md-6 col-lg-4">
            <article class="card tarjeta tarjeta-mint h-100">
                <div class="card-body d-flex flex-column gap-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="etiqueta bg-white"><svg class="icono"><use href="#i-${p.categoria.toLowerCase()}" /></svg> ${NOMBRES[p.categoria]}</span>
                        <span class="etiqueta bg-white"><svg class="icono"><use href="#i-check" /></svg> Atendida</span>
                    </div>
                    <h3 class="h6 fw-bold mb-0">${esc(p.titulo)}</h3>
                    <p class="small mb-0">Beneficia a: ${esc(p.quien)}</p>
                    <p class="small mb-0"><b>Atendida por:</b> ${esc(registro.autoridad)} (${esc(registro.cargo)}) · ${esc(registro.fecha)}</p>
                    <p class="fw-bold mb-0"><svg class="icono"><use href="#i-corazon" /></svg> ${apoyosTotales} apoyos</p>
                    <div class="mt-auto pt-2">
                        <a href="./detalle.html?id=${registro.id}" class="btn btn-outline-espacio w-100">Ver detalle</a>
                    </div>
                </div>
            </article>
        </div>`;
        listaAtendidas.insertAdjacentHTML("beforeend", html);
    });
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
    renderizarAtendidas();
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
    categoriaActiva = (categoriaActiva === categoria) ? "" : categoria;
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
        // Si ya fue atendida, se oculta de pendientes porque pasó al menú de Atendidas
        if (estaAtendida(tarjeta.dataset.id)) {
            tarjeta.classList.add("d-none");
            return;
        }
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
        if (orden === "apoyadas") return apoyos(b) - apoyos(a);
        if (orden === "visitas") return a.dataset.visitas - b.dataset.visitas;
        return a.dataset.dias - b.dataset.dias;
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
    if (!f.checkValidity()) {
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
    actualizarSesion();
    aplicarFiltros();
    mostrarParticipacion();

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
    const claseBtnAtender = esAutoridad() ? "" : "d-none";
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
                <button type="button" class="btn btn-espacio w-100 btn-atender ${claseBtnAtender}" onclick="marcarComoAtendida('${p.id}')">
                    <svg class="icono"><use href="#i-check" /></svg> Marcar como atendida
                </button>
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
    if (!aviso) return;
    const hayUsuario = !!datos.usuario;
    aviso.classList.toggle("d-none", hayUsuario);
    document.getElementById("participacionContenido").classList.toggle("d-none", !hayUsuario);
    if (!hayUsuario) return;

    const sufijoRol = esAutoridad() ? " — Autoridad (" + datos.usuario.cargo + ")" : "";
    document.getElementById("saludo").textContent = "Hola, " + datos.usuario.nombre + sufijoRol;
    llenarLista("misPropuestas", datos.propias.map(p => p.titulo + " (Estado: " + (estaAtendida(p.id) ? "Atendida" : p.estado) + ")"), "Todavía no has publicado propuestas.");
    llenarLista("misApoyos", datos.apoyadas.map(buscarPropuesta).filter(Boolean).map(p => p.titulo), "Aún no has apoyado propuestas.");
    llenarLista("misActividades", datos.inscritas.map(function (id) {
        return document.querySelector('.actividad[data-id="' + id + '"] h3').textContent;
    }), "No te has inscrito en actividades.");

    const colabora = datos.propias.length > 0 || datos.inscritas.length > 0 || esAutoridad();
    document.getElementById("insignia").textContent = esAutoridad()
        ? "Autoridad verificada"
        : (colabora ? "Vecino colaborador" : "Aún no tienes insignia");
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

    const regAtendida = datos.atendidas.find(a => String(a.id) === String(idActual));
    document.title = p.titulo + " | EspacioVivo";
    document.getElementById("tituloDetalle").textContent = p.titulo;
    document.getElementById("detalleCategoria").textContent = NOMBRES[p.categoria];
    document.getElementById("detalleEstado").textContent = regAtendida ? "Atendida" : p.estado;
    document.getElementById("detalleQuien").textContent = p.quien;
    document.getElementById("detalleDescripcion").textContent = p.descripcion;
    document.getElementById("detalleMotivo").textContent = p.motivo;
    document.getElementById("iconoDetalle").setAttribute("href", "#i-" + p.categoria.toLowerCase());

    const bloqueAtendida = document.getElementById("bloqueAtendidaDetalle");
    const btnAtenderDet = document.getElementById("botonAtenderDetalle");
    if (regAtendida) {
        bloqueAtendida.classList.remove("d-none");
        document.getElementById("detalleAtendidaPor").textContent =
            "Atendida por " + regAtendida.autoridad + " (" + regAtendida.cargo + " · CI: " + regAtendida.ci + ") el " + regAtendida.fecha + ".";
        btnAtenderDet.classList.add("d-none");
    } else {
        bloqueAtendida.classList.add("d-none");
        btnAtenderDet.classList.toggle("d-none", !esAutoridad());
    }

    marcarApoyoDetalle();
}

function atenderDesdeDetalle() {
    marcarComoAtendida(idActual);
    cargarDetalle();
}

function apoyarDetalle() {
    apoyar(idActual);
}

function marcarApoyoDetalle() {
    const contador = document.getElementById("contadorDetalle");
    if (!contador || !idActual) return;
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
    if (document.getElementById("listaPropuestas")) {
        datos.propias.slice().reverse().forEach(agregarTarjeta);
        actualizarSesion();
        marcarApoyadas();
        marcarInscritas();
        renderizarAtendidas();
        aplicarFiltros();
        mostrarParticipacion();
    }
    if (document.getElementById("tituloDetalle")) {
        cargarDetalle();
    }
});
