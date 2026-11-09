CLAUDE.md
Qué es
API REST de CineData (películas, reseñas y usuarios) con Express 5, Mongoose 9 y CommonJS. La consume la web estática del repo hermano ../cinedata-cors, que apunta a http://localhost:3000 (js/config.js).

Comandos
npm run dev: arranca con nodemon (src/index.js; la app de Express está en src/app.js).
npm start: arranca sin recarga.
npm run seed: borra películas, usuarios y reseñas y recarga scripts/peliculas.json. Usuarios de prueba: ana@lab.com/ana123, luis@lab.com/luis123, admin@lab.com/admin123 (admin).
Tests: npx jest · un archivo: npx jest tests/buscar.test.js · un test: npx jest -t "texto".
Entorno
Necesita MongoDB y un .env con MONGODB_URI, DB_NAME, PORT, JWT_SECRET, JWT_EXPIRES_IN y CORS_ORIGIN. Si falta CORS_ORIGIN, el servidor no arranca.

Arquitectura
Capas: routes/ → controller/ → services/ → models/.

routes/: middlewares de cada ruta (validarId, autenticar, autorizar(...roles) y validadores de src/validators/ con express-validator). Las rutas fijas (/top, /buscar) van ANTES de /:id.
controller/: leen req y dan forma a la respuesta. Sin try/catch: Express 5 propaga los errores async a middlewares/manejarErrores.js, que traduce ValidationError → 400 con detalles, CastError → 400 y el código 11000 → 409.
services/: todas las consultas a Mongoose. Devuelven documentos, no JSON.
models/: schema con loadClass y toJSON con transform para la forma pública. En Pelicula, toJSON convierte duracion en texto ("2h 40 min") y director en solo el nombre; resumen() es la forma corta de los listados.
Contratos de respuesta
Errores: siempre {error} o {error, detalles: string[]}.
GET /peliculas: {datos, paginacion}. Filtros genero, anioDesde, notaMin, disponible; orden (nota|anio|titulo), page, limit (máx. 50).
/peliculas/top y /peliculas/buscar?q=: array plano de resúmenes. buscar: pública, regex escapada sin distinguir mayúsculas, 20 por página; q con trim, entre 2 y 30 caracteres. Opcionales: orden (anio|nota, por defecto anio), dir (asc|desc, por defecto desc), page (1-1000). La web usa page para "Cargar más" (si llegan menos de 20, no hay más).
Auth
Login y registro en /auth. JWT en Authorization: Bearer <token>. autenticar deja req.usuario = {id, rol}; roles usuario y admin.

Swagger
Se genera de los comentarios @openapi de src/routes/*.js. Schemas compartidos (PeliculasResumen, Pelicula, Error, ErrorValidacion) en src/config/swagger.js. Se sirve en /api-docs y /api-docs.json. Toda ruta nueva o cambiada actualiza su anotación.

Tests
Sin base de datos: jest.mock("../src/models/Pelicula.js"), solo el router montado en un express() mínimo y supertest. Las cadenas find().sort().limit() se simulan con mockReturnThis.

Subagentes
En .claude/agents/: analista (plan, siempre el primero), back (API), front (cinedata-cors), qa (tests), seguridad y revisor (siempre el último).

Convenciones
Ramas y commits con el ID de la issue: ID-slug y "ID: qué hace".
demo-modulos/ no es parte de la API (está en .gitignore): no se toca.
Prohibido
Leer o modificar .env.
Meter consultas a la BD en el controlador.
Instalar dependencias nuevas sin decirlo.
Hacer commit, push, abrir PR o merge sin que se pida.
