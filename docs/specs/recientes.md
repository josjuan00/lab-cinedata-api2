# Spec. Últimas peliculas añadidas
## Objetivos
GET /peliculas/recientes devuelve las 5 ultimas películas añadidas en mismo formaro que peliculas/top.

## Restricciones
- Pública: no necesita token.
- La ruta va antes de /:id. Documentada con @openapi como el resto.
- No hagas commits. Ni instales paquetes o librerías.
- Acepta ?limite=N opcional, entero de entre 1 y 5 validado con express-validator
- En caso de que haya empate en el SORT al ordenar, utiliza la nota como referencia de segundo parámetro.

# Hecho cuando 
GET peliculas/recientes => array de 5 elemento con un 200.
GET peliculas/recientes?limite=∞ => 400.
GET peliculas/recientes?limite=3 = 200 un array con 3 elementos.
En swagger (/api-docs) aparece el endpoint y se puede probar con "try it out"
