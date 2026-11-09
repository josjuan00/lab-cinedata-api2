const express = require("express");
const { listar, top, recientes, estadisticas, buscar, obtener, resenas, crear, actualizar, eliminar, crearResena } = require("../controller/pelicula.controller.js");
const { validarEstadisticas, validarBusqueda, validarCrear, validarActualizar, validar } = require("../validators/pelicula.validator.js");
const validarId = require("../middlewares/validarId.js");
const autenticar = require("../middlewares/autenticar.js");
const autorizar = require("../middlewares/autorizar.js");

const router = express.Router(); 

/**
 * @openapi
 * /peliculas:
 *   get:
 *     tags: [Películas]
 *     summary: Lista las películas ordenadas por nota
 *     parameters:
 *       - name: genero
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           example: Drama
 *     responses:
 *       200:
 *         description: Lista de películas en resumen
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PeliculasResumen'
 */
router.get("/", listar);

router.get("/top", top);

/**
 * @openapi
 * /peliculas/recientes:
 *   get:
 *     tags: [Películas]
 *     summary: Las 10 últimas películas añadidas, de la más nueva a la más antigua
 *     responses:
 *       200:
 *         description: Lista de películas en resumen (array vacío si no hay ninguna)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PeliculasResumen'
 */
router.get("/recientes", recientes);

/**
 * @openapi
 * /peliculas/estadisticas:
 *   get:
 *     tags: [Películas]
 *     summary: Estadísticas por género (total y nota media), ordenadas por nota media descendente
 *     parameters:
 *       - name: minimo
 *         in: query
 *         required: false
 *         description: Número mínimo de películas que debe tener un género para aparecer
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           example: 2
 *     responses:
 *       200:
 *         description: Estadísticas por género
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EstadisticaGenero'
 *       400:
 *         description: Parámetro minimo no válido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 */
router.get("/estadisticas", validarEstadisticas, validar, estadisticas);

/**
 * @openapi
 * /peliculas/buscar:
 *   get:
 *     tags: [Películas]
 *     summary: Busca películas cuyo título contiene el texto (sin distinguir mayúsculas)
 *     description: Devuelve como máximo 20 resultados por página. Por defecto ordena por año descendente.
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Texto a buscar (se recorta con trim)
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 30
 *           example: co
 *       - name: orden
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [anio, nota]
 *           default: anio
 *       - name: dir
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - name: page
 *         in: query
 *         required: false
 *         description: Página de 20 resultados (para "cargar más")
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 1
 *     responses:
 *       200:
 *         description: Películas encontradas (array vacío si no hay coincidencias)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PeliculasResumen'
 *       400:
 *         description: Parámetros no válidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 */
router.get("/buscar", validarBusqueda, validar, buscar);

router.post("/:id/resenas",autenticar,  validarId, crearResena);
router.get("/:id", validarId, obtener);
router.get("/:id/resenas", validarId, resenas);

/**
 * @openapi
 * /peliculas:
 *   post:
 *     tags: [Películas]
 *     summary: Crea una película (solo admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, anio, director]
 *             properties:
 *               titulo: { type: string, example: Heat }
 *               anio: { type: integer, minimum: 1900, maximum: 2100, example: 1995 }
 *               generos: { type: array, items: { type: string } }
 *               nota: { type: number, minimum: 0, maximum: 10 }
 *               duracion: { type: integer, minimum: 1, description: Minutos }
 *               director:
 *                 type: object
 *                 required: [nombre]
 *                 properties:
 *                   nombre: { type: string }
 *                   pais: { type: string }
 *               disponible: { type: boolean }
 *     responses:
 *       201:
 *         description: Película creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pelicula'
 *       400:
 *         description: Datos no válidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Solo admin
 */
router.post("/", autenticar, autorizar("admin"), validarCrear, validar, crear);

/**
 * @openapi
 * /peliculas/{id}:
 *   put:
 *     tags: [Películas]
 *     summary: Actualiza una película (solo admin). Todos los campos son opcionales; los no reconocidos se descartan.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo: { type: string }
 *               anio: { type: integer, minimum: 1900, maximum: 2100 }
 *               generos: { type: array, items: { type: string } }
 *               nota: { type: number, minimum: 0, maximum: 10 }
 *               duracion: { type: integer, minimum: 1 }
 *               director:
 *                 type: object
 *                 properties:
 *                   nombre: { type: string }
 *                   pais: { type: string }
 *               disponible: { type: boolean }
 *     responses:
 *       200:
 *         description: Película actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pelicula'
 *       400:
 *         description: Datos no válidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Solo admin
 *       404:
 *         description: Película no encontrada
 */
router.put("/:id", autenticar, autorizar("admin"), validarId, validarActualizar, validar, actualizar);
router.delete("/:id", autenticar, autorizar("admin"),validarId, eliminar);

module.exports = router;
