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

// Simula Pelicula.find().sort().limit() y devuelve la cadena para inspeccionarla
function simularCadena(resultado = []) {
  const cadena = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue(resultado) };
  Pelicula.find.mockReturnValue(cadena);
  return cadena;
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe("GET /peliculas/recientes", () => {
  test("devuelve 200 con los resúmenes de las últimas películas", async () => {
    // Arrange
    simularCadena([{ resumen: () => ({ id: "2", titulo: "B" }) }, { resumen: () => ({ id: "1", titulo: "A" }) }]);
    // Act
    const res = await request(app).get("/peliculas/recientes");
    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "2", titulo: "B" }, { id: "1", titulo: "A" }]);
  });

  test("ordena por _id descendente y limita a 10", async () => {
    // Arrange
    const cadena = simularCadena();
    // Act
    await request(app).get("/peliculas/recientes");
    // Assert
    expect(cadena.sort).toHaveBeenCalledWith({ _id: -1 });
    expect(cadena.limit).toHaveBeenCalledWith(10);
  });

  test("no es capturada por /:id", async () => {
    // Arrange
    simularCadena();
    // Act
    const res = await request(app).get("/peliculas/recientes");
    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(Pelicula.findById).not.toHaveBeenCalled();
  });

  test("un error de la BD devuelve 500", async () => {
    // Arrange
    Pelicula.find.mockImplementation(() => {
      throw new Error("fallo");
    });
    jest.spyOn(console, "error").mockImplementation(() => {});
    // Act
    const res = await request(app).get("/peliculas/recientes");
    // Assert
    expect(res.status).toBe(500);
  });
});
