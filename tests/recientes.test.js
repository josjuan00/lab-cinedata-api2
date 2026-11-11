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

const docs = (n) => Array.from({ length: n }, (_, i) => ({ resumen: () => ({ id: String(i), titulo: "P" + i }) }));

describe("GET /peliculas/recientes", () => {
  test("sin limite devuelve 200, ordena por _id y nota desc y limita a 5", async () => {
    // Arrange
    const cadena = simularCadena(docs(5));
    // Act
    const res = await request(app).get("/peliculas/recientes");
    // Assert
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(5);
    expect(cadena.sort).toHaveBeenCalledWith({ _id: -1, nota: -1 });
    expect(cadena.limit).toHaveBeenCalledWith(5);
  });

  test("?limite=3 limita a 3 y devuelve 3 elementos", async () => {
    // Arrange
    const cadena = simularCadena(docs(3));
    // Act
    const res = await request(app).get("/peliculas/recientes?limite=3");
    // Assert
    expect(res.status).toBe(200);
    expect(cadena.limit).toHaveBeenCalledWith(3);
    expect(res.body).toHaveLength(3);
  });

  test.each([["%E2%88%9E"], ["0"], ["6"], ["abc"], ["2.5"]])("?limite=%s devuelve 400 sin consultar", async (valor) => {
    // Arrange
    simularCadena();
    // Act
    const res = await request(app).get("/peliculas/recientes?limite=" + valor);
    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(Array.isArray(res.body.detalles)).toBe(true);
    expect(res.body.detalles.length).toBeGreaterThan(0);
    expect(Pelicula.find).not.toHaveBeenCalled();
  });

  test("?limite repetido devuelve 400 con mensaje de valor único", async () => {
    // Arrange
    simularCadena();
    // Act
    const res = await request(app).get("/peliculas/recientes?limite=1&limite=2");
    // Assert
    expect(res.status).toBe(400);
    expect(res.body.detalles).toContain("limite debe ser un único valor");
    expect(Pelicula.find).not.toHaveBeenCalled();
  });

  test("?limite[$gt]=1 no llega como objeto: se ignora y se usa el límite por defecto", async () => {
    // Arrange (Express 5 usa query parser simple: la clave es literal "limite[$gt]")
    const cadena = simularCadena();
    // Act
    const res = await request(app).get("/peliculas/recientes?limite[$gt]=1");
    // Assert
    expect(res.status).toBe(200);
    expect(cadena.limit).toHaveBeenCalledWith(5);
  });

  test("es pública (sin token) y no es capturada por /:id", async () => {
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
