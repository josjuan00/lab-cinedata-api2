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

const doc = (titulo, anio = 2000) => ({ resumen: () => ({ id: titulo, titulo, anio }) });

// Simula Pelicula.find().sort().skip().limit() y devuelve la cadena para inspeccionarla
function simularCadena(resultado = []) {
  const cadena = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resultado),
  };
  Pelicula.find.mockReturnValue(cadena);
  return cadena;
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe("GET /peliculas/buscar - caso bueno (spec)", () => {
  test("q=co devuelve 200 con un array de resúmenes", async () => {
    // Arrange
    simularCadena([doc("Coco", 2017), doc("Cocodrilo Dundee", 1986)]);
    // Act
    const res = await request(app).get("/peliculas/buscar?q=co");
    // Assert
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.map((p) => p.titulo)).toEqual(["Coco", "Cocodrilo Dundee"]);
  });

  test("q=cooo sin coincidencias devuelve 200 con un array vacío", async () => {
    // Arrange
    simularCadena([]);
    // Act
    const res = await request(app).get("/peliculas/buscar?q=cooo");
    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("no necesita token (pública)", async () => {
    // Arrange
    simularCadena([]);
    // Act
    const res = await request(app).get("/peliculas/buscar?q=co");
    // Assert
    expect(res.status).toBe(200);
  });

  test("no es capturada por /:id (no hay 400 de id ni 404)", async () => {
    // Arrange
    simularCadena([]);
    // Act
    const res = await request(app).get("/peliculas/buscar?q=co");
    // Assert
    expect(res.status).toBe(200);
    expect(Pelicula.findById).not.toHaveBeenCalled();
  });
});

describe("GET /peliculas/buscar - consulta al modelo", () => {
  test("usa regex escapada, sin distinguir mayúsculas, máx. 20 y orden por año desc por defecto", async () => {
    // Arrange
    const cadena = simularCadena([]);
    // Act
    await request(app).get("/peliculas/buscar?q=co");
    // Assert
    expect(Pelicula.find).toHaveBeenCalledWith({ titulo: { $regex: "co", $options: "i" } });
    expect(cadena.sort).toHaveBeenCalledWith({ anio: -1, titulo: 1 });
    expect(cadena.skip).toHaveBeenCalledWith(0);
    expect(cadena.limit).toHaveBeenCalledWith(20);
  });

  test("escapa los caracteres especiales de regex", async () => {
    // Arrange
    simularCadena([]);
    // Act
    await request(app).get(`/peliculas/buscar?q=${encodeURIComponent("a.*(b)")}`);
    // Assert
    expect(Pelicula.find).toHaveBeenCalledWith({ titulo: { $regex: "a\\.\\*\\(b\\)", $options: "i" } });
  });

  test("q se recorta con trim", async () => {
    // Arrange
    simularCadena([]);
    // Act
    const res = await request(app).get(`/peliculas/buscar?q=${encodeURIComponent("  co  ")}`);
    // Assert
    expect(res.status).toBe(200);
    expect(Pelicula.find).toHaveBeenCalledWith({ titulo: { $regex: "co", $options: "i" } });
  });

  test("dir=asc ordena por año ascendente", async () => {
    const cadena = simularCadena([]);
    await request(app).get("/peliculas/buscar?q=co&dir=asc");
    expect(cadena.sort).toHaveBeenCalledWith({ anio: 1, titulo: 1 });
  });

  test("orden=nota ordena por valoración (desc por defecto)", async () => {
    const cadena = simularCadena([]);
    await request(app).get("/peliculas/buscar?q=co&orden=nota");
    expect(cadena.sort).toHaveBeenCalledWith({ nota: -1, titulo: 1 });
  });

  test("orden=nota&dir=asc ordena por valoración ascendente", async () => {
    const cadena = simularCadena([]);
    await request(app).get("/peliculas/buscar?q=co&orden=nota&dir=asc");
    expect(cadena.sort).toHaveBeenCalledWith({ nota: 1, titulo: 1 });
  });

  test("page=3 salta 40 resultados (cargar más)", async () => {
    const cadena = simularCadena([]);
    await request(app).get("/peliculas/buscar?q=co&page=3");
    expect(cadena.skip).toHaveBeenCalledWith(40);
    expect(cadena.limit).toHaveBeenCalledWith(20);
  });
});

describe("GET /peliculas/buscar - validación (400)", () => {
  const casos = [
    ["sin q (spec)", ""],
    ["q=c, un carácter (spec)", "?q=c"],
    ["q vacío", "?q="],
    ["q de 1 carácter con espacios", `?q=${encodeURIComponent("  c  ")}`],
    ["q de 31 caracteres", `?q=${"a".repeat(31)}`],
    ["q repetido (array)", "?q=co&q=ma"],
    ["orden no válido", "?q=co&orden=x"],
    ["dir no válido", "?q=co&dir=x"],
    ["page=0", "?q=co&page=0"],
    ["page=1001", "?q=co&page=1001"],
    ["page no numérico", "?q=co&page=abc"],
  ];

  test.each(casos)("%s devuelve 400 con {error, detalles} y no consulta la BD", async (_nombre, qs) => {
    // Arrange
    simularCadena([]);
    // Act
    const res = await request(app).get(`/peliculas/buscar${qs}`);
    // Assert
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
    expect(Array.isArray(res.body.detalles)).toBe(true);
    expect(res.body.detalles.length).toBeGreaterThan(0);
    expect(Pelicula.find).not.toHaveBeenCalled();
  });

  test.each([2, 30])("q de %i caracteres (límite) es válido", async (n) => {
    // Arrange
    simularCadena([]);
    // Act
    const res = await request(app).get(`/peliculas/buscar?q=${"a".repeat(n)}`);
    // Assert
    expect(res.status).toBe(200);
  });
});

describe("GET /peliculas/buscar - errores", () => {
  test("un fallo de la BD devuelve 500 con {error}", async () => {
    // Arrange
    Pelicula.find.mockImplementation(() => {
      throw new Error("fallo");
    });
    jest.spyOn(console, "error").mockImplementation(() => {});
    // Act
    const res = await request(app).get("/peliculas/buscar?q=co");
    // Assert
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error de servidor interno" });
    console.error.mockRestore();
  });
});
