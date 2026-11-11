const mongoose = require("mongoose");
const Pelicula = require("../models/Pelicula.js");

function construirFiltro({genero, anioDesde, notaMin, disponible}){
    const filtro = {};
    if (genero) filtro.generos = genero;
    if (anioDesde) filtro.anio = {$gte: anioDesde};
    if (notaMin) filtro.nota = {$gte: notaMin};
    if (disponible !== undefined) {filtro.disponible = disponible === "true";
    console.log(disponible);}
    return filtro; 
}


async function listar(filtros, orden, pagina, limite) {
    /*
    const filtro = genero ? { generos: genero } : {};
    const docs = await coleccion().find(filtro).sort({ nota: -1, titulo: 1 }).toArray();
    return docs.map(doc => new Pelicula(doc));*/

     const filtro = construirFiltro(filtros);
     const [peliculas, total] =  await Promise.all([
        Pelicula.find(filtro).sort(orden).skip((pagina - 1) * limite).limit(limite),
        Pelicula.countDocuments(filtro)
     ]);
     return { peliculas, total}; 
}

async function mejores(n = 3) {
  return Pelicula.find().sort({ nota: -1, titulo: 1}).limit(n);
}

// RECIENTES: las n últimas añadidas (el _id lleva la fecha de creación)
async function recientes(n = 5) {
    return Pelicula.find().sort({ _id: -1, nota: -1 }).limit(n);
}

async function buscarPorId(id) {
    return Pelicula.findById(id);
}

// BUSCAR: título que contiene q (sin distinguir mayúsculas), 20 por página
const TAM_BUSQUEDA = 20;

function escaparRegex(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function buscarPorTitulo(q, { orden = "anio", dir = "desc", pagina = 1 } = {}) {
    return Pelicula.find({ titulo: { $regex: escaparRegex(q), $options: "i" } })
        .sort({ [orden]: dir === "asc" ? 1 : -1, titulo: 1 })
        .skip((pagina - 1) * TAM_BUSQUEDA)
        .limit(TAM_BUSQUEDA);
}

// CREATE
async function crear(datos){
    return Pelicula.create(datos);
}

// UPDATE
async function actualizar(id, datos){
    return Pelicula.findByIdAndUpdate(id, datos, { returnDocument: "after", runValidators: true});
}

//DELETE
async function eliminar(id) {
    return Pelicula.findByIdAndDelete(id);
}

// ESTADISTICAS: minimo = nº mínimo de películas que debe tener un género
async function estadisticasPorGenero(minimo = 1) {
    return Pelicula.aggregate([
        { $unwind: "$generos" },
        { $group: { _id: "$generos", total: { $sum: 1 }, notaMedia: { $avg: "$nota" } } },
        { $match: { total: { $gte: minimo } } },
        { $sort: { notaMedia: -1, _id: 1 } }
    ]);
}

// FUNCIONES AUXILIARES
function esIdValido(id) {
    return mongoose.isValidObjectId(id);
}



module.exports = { listar, mejores, recientes, buscarPorId, buscarPorTitulo, esIdValido, crear, actualizar, eliminar, estadisticasPorGenero };
