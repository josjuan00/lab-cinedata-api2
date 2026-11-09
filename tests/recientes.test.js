process.env.CORS_ORIGIN = "http://localhost:3000";

const request = require("supertest");
const app = require("../src/app");
const Pelicula = require("../src/models/Pelicula");
const servicio = require("../src/services/pelicula.service");

afterEach(() => jest.restoreAllMocks());

describe("GET /peliculas/recientes", () => {
  test("devuelve 200 con los resúmenes de las últimas películas", async () => {
    // Arrange
    const docs = [{ resumen: () => ({ id: "2", titulo: "B" }) }, { resumen: () => ({ id: "1", titulo: "A" }) }];
    const spy = jest.spyOn(servicio, "recientes").mockResolvedValue(docs);
    // Act
    const res = await request(app).get("/peliculas/recientes");
    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "2", titulo: "B" }, { id: "1", titulo: "A" }]);
    expect(spy).toHaveBeenCalledWith(10);
  });

  test("no es capturada por /:id", async () => {
    jest.spyOn(servicio, "recientes").mockResolvedValue([]);
    const res = await request(app).get("/peliculas/recientes");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("el servicio ordena por _id descendente y limita a n", async () => {
    const cadena = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    jest.spyOn(Pelicula, "find").mockReturnValue(cadena);
    await servicio.recientes(10);
    expect(cadena.sort).toHaveBeenCalledWith({ _id: -1 });
    expect(cadena.limit).toHaveBeenCalledWith(10);
  });

  test("error del servicio devuelve 500", async () => {
    jest.spyOn(servicio, "recientes").mockRejectedValue(new Error("fallo"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app).get("/peliculas/recientes");
    expect(res.status).toBe(500);
  });
});
