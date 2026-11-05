process.env.CORS_ORIGIN = "http://localhost:3000";

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../src/app");
const Pelicula = require("../src/models/Pelicula");
const servicio = require("../src/services/pelicula.service");

let mongod;

const peli = (titulo, generos, nota) => ({
  titulo,
  anio: 2000,
  generos,
  ...(nota !== undefined && { nota }),
  director: { nombre: "Dir" },
});

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  // runtimeAdapters: dentro de Jest el import() dinámico de 'os' del driver falla,
  // así que se le pasa el módulo explícitamente.
  await mongoose.connect(mongod.getUri(), { runtimeAdapters: { os: require("os") } });
  jest.spyOn(console, "log").mockImplementation(() => {});
}, 120000);

afterAll(async () => {
  jest.restoreAllMocks();
  await mongoose.disconnect();
  await mongod.stop();
}, 60000);

describe("GET /peliculas/estadisticas (integración con BD en memoria)", () => {
  beforeEach(async () => {
    await Pelicula.deleteMany({});
    await Pelicula.insertMany([
      peli("A", ["Drama", "Crimen"], 9),
      peli("B", ["Drama"], 8),
      peli("C", ["Drama", "Comedia"], 7.5),
      peli("D", ["Accion"], 8.5),
      peli("E", ["Comedia"], 8.5),
      peli("F", ["Terror"]),
      peli("G", ["Terror", "Crimen"]),
      peli("H", ["Musical"], 6.666),
    ]);
  });

  test("sin query usa minimo 1 y devuelve totales, medias, orden, desempate y null al final", async () => {
    // Arrange: datos sembrados en beforeEach
    // Act
    const res = await request(app).get("/peliculas/estadisticas");
    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { genero: "Crimen", total: 2, notaMedia: 9 },
      { genero: "Accion", total: 1, notaMedia: 8.5 },
      { genero: "Drama", total: 3, notaMedia: 8.17 },
      { genero: "Comedia", total: 2, notaMedia: 8 },
      { genero: "Musical", total: 1, notaMedia: 6.67 },
      { genero: "Terror", total: 2, notaMedia: null },
    ]);
  });

  test("una película con 2 géneros cuenta en ambos", async () => {
    const res = await request(app).get("/peliculas/estadisticas");
    const porGenero = Object.fromEntries(res.body.map((g) => [g.genero, g.total]));
    expect(porGenero.Drama).toBe(3);
    expect(porGenero.Crimen).toBe(2);
    expect(porGenero.Comedia).toBe(2);
  });

  test("desempate por género ascendente con igual notaMedia", async () => {
    await Pelicula.deleteMany({});
    await Pelicula.insertMany([peli("X", ["Zeta"], 5), peli("Y", ["Alfa"], 5), peli("Z", ["Medio"], 5)]);
    const res = await request(app).get("/peliculas/estadisticas");
    expect(res.body.map((g) => g.genero)).toEqual(["Alfa", "Medio", "Zeta"]);
  });

  test("minimo=3 filtra los géneros con menos de 3 películas", async () => {
    const res = await request(app).get("/peliculas/estadisticas?minimo=3");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ genero: "Drama", total: 3, notaMedia: 8.17 }]);
  });

  test("minimo=50 sin géneros suficientes devuelve [] y 200", async () => {
    const res = await request(app).get("/peliculas/estadisticas?minimo=50");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("minimo=1 (límite inferior) devuelve 200", async () => {
    const res = await request(app).get("/peliculas/estadisticas?minimo=1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(6);
  });
});

describe("GET /peliculas/estadisticas validación", () => {
  const MSG = "minimo debe ser un entero entre 1 y 50";

  test.each(["0", "51", "abc", "2.5", "-1", ""])("minimo='%s' devuelve 400", async (valor) => {
    // Arrange
    const spy = jest.spyOn(servicio, "estadisticasPorGenero");
    // Act
    const res = await request(app).get(`/peliculas/estadisticas?minimo=${valor}`);
    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Datos no válidos", detalles: [MSG] });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test.each(["1", "50"])("minimo=%s (límite) devuelve 200", async (valor) => {
    const spy = jest.spyOn(servicio, "estadisticasPorGenero").mockResolvedValue([]);
    const res = await request(app).get(`/peliculas/estadisticas?minimo=${valor}`);
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(Number(valor));
    spy.mockRestore();
  });
});

describe("GET /peliculas/estadisticas enrutado", () => {
  test("no es capturada por /:id (ni 400 de id inválido ni 404)", async () => {
    const spy = jest.spyOn(servicio, "estadisticasPorGenero").mockResolvedValue([]);
    const res = await request(app).get("/peliculas/estadisticas");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(res.body.error).toBeUndefined();
    spy.mockRestore();
  });
});

describe("GET /peliculas/estadisticas errores", () => {
  test("error del servicio devuelve 500", async () => {
    const spy = jest.spyOn(servicio, "estadisticasPorGenero").mockRejectedValue(new Error("fallo"));
    const err = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app).get("/peliculas/estadisticas");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error de servidor interno" });
    spy.mockRestore();
    err.mockRestore();
  });
});
