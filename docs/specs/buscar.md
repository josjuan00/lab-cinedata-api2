# Spec. Buscar por título

## Objetivo
GET /películas/buscar?q=texto para que devuelva los títulos que contienen el texto, sin distinguir mayus, minusc, ordenadas por año desc y máximo 20, boton para cargar más. Botón de filtro, desplegable, con opción ascen y descen, y por valoración.
Coherencia visual (overflow) para pantalla de ordenador y telefono.


## Restricciones
- query obligatorio, se recorta con trim, entre 2 y 30 caracteres, valido con express-validator 
- Público: no necesita token.
- route antes de /:id. Documenrada con @openapi como hacen los demás.
- No hacer commit, no install ni librerias sin consultar.


## Hecho cuando 
- GET /películas/buscar?q=co => 200 con un array
 - GET /películas/buscar?q=cooo => 200 con un array vacío
- GET /películas/buscar => 400 
- GET /películas/buscar?q=c => 400