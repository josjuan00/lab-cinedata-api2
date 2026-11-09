jest.mock("../src/models/Pelicula.js");

const express = require("express");
const request = require("supertest");
const Pelicula = require("../src/models/Pelicula.js");
const router = require("../src/routes/pelicula.routes.js");
const manejarErrores = require("../src/middlewares/manejarErrores.js");

const app = express();
app.use(express.json());
app.use("/peliculas", router);
app.use(manejarErrores);

beforeEach(() => {
  jest.resetAllMocks();
});

describe("GET /peliculas/estadisticas - respuesta", () => {
  test("devuelve 200 con genero, total y notaMedia redondeada a 2 decimales", async () => {
    // Arrange: lo que devolvería la agregación de MongoDB, ya ordenado
    Pelicula.aggregate.mockResolvedValue([
      { _id: "Crimen", total: 2, notaMedia: 9 },
      { _id: "Drama", total: 3, notaMedia: 8.1666 },
      { _id: "Musical", total: 1, notaMedia: 6.666 },
    ]);
    // Act
    const res = await request(app).get("/peliculas/estadisticas");
    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { genero: "Crimen", total: 2, notaMedia: 9 },
      { genero: "Drama", total: 3, notaMedia: 8.17 },
      { genero: "Musical", total: 1, notaMedia: 6.67 },
    ]);
  });

  test("un género sin notas devuelve notaMedia null", async () => {
    // Arrange
    Pelicula.aggregate.mockResolvedValue([{ _id: "Terror", total: 2, notaMedia: null }]);
    // Act
    const res = await request(app).get("/peliculas/estadisticas");
    // Assert
    expect(res.body).toEqual([{ genero: "Terror", total: 2, notaMedia: null }]);
  });

  test("sin resultados devuelve [] y 200", async () => {
    // Arrange
    Pelicula.aggregate.mockResolvedValue([]);
    // Act
    const res = await request(app).get("/peliculas/estadisticas?minimo=50");
    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /peliculas/estadisticas - agregación", () => {
  test("sin query usa minimo 1 y separa, agrupa, filtra y ordena por notaMedia desc y género asc", async () => {
    // Arrange
    Pelicula.aggregate.mockResolvedValue([]);
    // Act
    await request(app).get("/peliculas/estadisticas");
    // Assert
    expect(Pelicula.aggregate).toHaveBeenCalledWith([
      { $unwind: "$generos" },
      { $group: { _id: "$generos", total: { $sum: 1 }, notaMedia: { $avg: "$nota" } } },
      { $match: { total: { $gte: 1 } } },
      { $sort: { notaMedia: -1, _id: 1 } },
    ]);
  });

  test("minimo=3 llega como número al filtro de la agregación", async () => {
    // Arrange
    Pelicula.aggregate.mockResolvedValue([]);
    // Act
    await request(app).get("/peliculas/estadisticas?minimo=3");
    // Assert
    const pipeline = Pelicula.aggregate.mock.calls[0][0];
    expect(pipeline).toContainEqual({ $match: { total: { $gte: 3 } } });
  });
});

describe("GET /peliculas/estadisticas - validación", () => {
  const MSG = "minimo debe ser un entero entre 1 y 50";

  test.each(["0", "51", "abc", "2.5", "-1", ""])("minimo='%s' devuelve 400", async (valor) => {
    // Act
    const res = await request(app).get(`/peliculas/estadisticas?minimo=${valor}`);
    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Datos no válidos", detalles: [MSG] });
    expect(Pelicula.aggregate).not.toHaveBeenCalled();
  });

  test.each(["1", "50"])("minimo=%s (límite) devuelve 200", async (valor) => {
    // Arrange
    Pelicula.aggregate.mockResolvedValue([]);
    // Act
    const res = await request(app).get(`/peliculas/estadisticas?minimo=${valor}`);
    // Assert
    expect(res.status).toBe(200);
  });
});

describe("GET /peliculas/estadisticas - enrutado y errores", () => {
  test("no es capturada por /:id", async () => {
    // Arrange
    Pelicula.aggregate.mockResolvedValue([]);
    // Act
    const res = await request(app).get("/peliculas/estadisticas");
    // Assert
    expect(res.status).toBe(200);
    expect(Pelicula.findById).not.toHaveBeenCalled();
  });

  test("un error de la BD devuelve 500", async () => {
    // Arrange
    Pelicula.aggregate.mockRejectedValue(new Error("fallo"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    // Act
    const res = await request(app).get("/peliculas/estadisticas");
    // Assert
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error de servidor interno" });
  });
});
