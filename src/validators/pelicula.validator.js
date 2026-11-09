const { query, body, validationResult } = require("express-validator");

const validarEstadisticas = [
    query("minimo")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("minimo debe ser un entero entre 1 y 50")
        .toInt()
];

const validarBusqueda = [
    query("q")
        .exists().withMessage("q es obligatorio").bail()
        .isString().withMessage("q debe ser un texto").bail()
        .trim()
        .isLength({ min: 2, max: 30 })
        .withMessage("q debe tener entre 2 y 30 caracteres"),
    query("orden")
        .optional()
        .isIn(["anio", "nota"])
        .withMessage("orden debe ser anio o nota"),
    query("dir")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("dir debe ser asc o desc"),
    query("page")
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage("page debe ser un entero entre 1 y 1000")
        .toInt()
];

// Reglas de body coherentes con src/models/Pelicula.js. Con obligatorios=true se exigen los requeridos del schema.
function reglasPelicula(obligatorios) {
    const campo = (nombre) => {
        const c = body(nombre);
        return obligatorios ? c.exists({ values: "falsy" }).withMessage(`${nombre} es obligatorio`).bail() : c.optional();
    };
    return [
        campo("titulo")
            .isString().withMessage("titulo debe ser un texto").bail()
            .trim()
            .notEmpty().withMessage("titulo no puede estar vacío"),
        campo("anio")
            .isInt({ min: 1900, max: 2100 }).withMessage("anio debe ser un entero entre 1900 y 2100")
            .toInt(),
        body("generos").optional()
            .isArray().withMessage("generos debe ser un array de textos"),
        body("generos.*")
            .isString().withMessage("cada género debe ser un texto").bail()
            .trim()
            .notEmpty().withMessage("los géneros no pueden estar vacíos"),
        body("nota").optional()
            .isFloat({ min: 0, max: 10 }).withMessage("nota debe ser un número entre 0 y 10")
            .toFloat(),
        body("duracion").optional()
            .isInt({ min: 1 }).withMessage("duracion debe ser un entero mayor o igual que 1")
            .toInt(),
        body("director").if(() => obligatorios)
            .exists().withMessage("director es obligatorio").bail()
            .isObject().withMessage("director debe ser un objeto"),
        body("director").if(() => !obligatorios).optional()
            .isObject().withMessage("director debe ser un objeto"),
        body("director.nombre").optional()
            .isString().withMessage("director.nombre debe ser un texto").bail()
            .trim()
            .notEmpty().withMessage("director.nombre no puede estar vacío"),
        body("director.pais").optional()
            .isString().withMessage("director.pais debe ser un texto")
            .trim(),
        // Si llega director, debe traer nombre (el schema lo exige)
        body("director").optional()
            .custom(d => d === null || typeof d !== "object" || (typeof d.nombre === "string" && d.nombre.trim() !== ""))
            .withMessage("director.nombre es obligatorio"),
        // Solo pasan nombre y pais del director; el resto se descarta
        body("director").optional()
            .customSanitizer(d => {
                if (d === null || typeof d !== "object") return d;
                const limpio = {};
                if (d.nombre !== undefined) limpio.nombre = d.nombre;
                if (d.pais !== undefined) limpio.pais = d.pais;
                return limpio;
            }),
        body("disponible").optional()
            .isBoolean().withMessage("disponible debe ser true o false")
            .toBoolean()
    ];
}

const validarCrear = reglasPelicula(true);
const validarActualizar = reglasPelicula(false);

function validar(req, res, next) {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({
            error: "Datos no válidos",
            detalles: errores.array().map(e => e.msg)
        });
    }
    next();
}

module.exports = { validarEstadisticas, validarBusqueda, validarCrear, validarActualizar, validar };
