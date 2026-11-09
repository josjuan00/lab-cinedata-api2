process.env.JWT_SECRET = "test";

jest.mock("../src/models/Pelicula.js");

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const Pelicula = require("../src/models/Pelicula.js");
const router = require("../src/routes/pelicula.routes.js");
const manejarErrores = require("../src/middlewares/manejarErrores.js");

const app = express();
app.use(express.json());
app.use("/peliculas", router);
app.use(manejarErrores);

const ID = "507f1f77bcf86cd799439011";
const token = (rol) => "Bearer " + jwt.sign({ id: "u1", rol }, process.env.JWT_SECRET);
const admin = () => token("admin");
const usuario = () => token("usuario");

const valida = () => ({
  titulo: "Coco",
  anio: 2017,
  director: { nombre: "Lee Unkrich", pais: "USA" },
});

beforeEach(() => {
  jest.resetAllMocks();
  Pelicula.create.mockImplementation(async (d) => ({ ...d }));
  Pelicula.findByIdAndUpdate.mockImplementation(async (id, d) => ({ id, ...d }));
});

describe("PUT /peliculas/:id - autorización", () => {
  test("sin token devuelve 401", async () => {
    // Arrange / Act
    const res = await request(app).put(`/peliculas/${ID}`).send(valida());
    // Assert
    expect(res.status).toBe(401);
    expect(Pelicula.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("rol usuario devuelve 403 y no actualiza", async () => {
    // Arrange / Act
    const res = await request(app).put(`/peliculas/${ID}`).set("Authorization", usuario()).send(valida());
    // Assert
    expect(res.status).toBe(403);
    expect(Pelicula.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("admin con body válido devuelve 200", async () => {
    // Arrange / Act
    const res = await request(app).put(`/peliculas/${ID}`).set("Authorization", admin()).send(valida());
    // Assert
    expect(res.status).toBe(200);
    expect(Pelicula.findByIdAndUpdate).toHaveBeenCalledTimes(1);
  });

  test("admin con id inválido devuelve 400", async () => {
    // Arrange / Act
    const res = await request(app).put("/peliculas/xyz").set("Authorization", admin()).send(valida());
    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(Pelicula.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /peliculas - autorización", () => {
  test("rol usuario devuelve 403 y no crea", async () => {
    // Arrange / Act
    const res = await request(app).post("/peliculas").set("Authorization", usuario()).send(valida());
    // Assert
    expect(res.status).toBe(403);
    expect(Pelicula.create).not.toHaveBeenCalled();
  });

  test("admin con body válido devuelve 201", async () => {
    // Arrange / Act
    const res = await request(app).post("/peliculas").set("Authorization", admin()).send(valida());
    // Assert
    expect(res.status).toBe(201);
    expect(Pelicula.create).toHaveBeenCalledTimes(1);
  });
});

describe("Validación del body devuelve 400 con {error, detalles}", () => {
  const sin = (fn) => { const b = valida(); fn(b); return b; };
  const casosPost = {
    "sin titulo": sin((b) => delete b.titulo),
    "sin anio": sin((b) => delete b.anio),
    "sin director": sin((b) => delete b.director),
    "sin director.nombre": sin((b) => { b.director = { pais: "USA" }; }),
    "anio 1899": { ...valida(), anio: 1899 },
    "anio 2101": { ...valida(), anio: 2101 },
    "nota -1": { ...valida(), nota: -1 },
    "nota 11": { ...valida(), nota: 11 },
    "duracion 0": { ...valida(), duracion: 0 },
    "generos no array": { ...valida(), generos: "Drama" },
    "disponible no booleano": { ...valida(), disponible: "quizas" },
  };

  test.each(Object.entries(casosPost))("POST %s", async (_n, body) => {
    // Arrange / Act
    const res = await request(app).post("/peliculas").set("Authorization", admin()).send(body);
    // Assert
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
    expect(Array.isArray(res.body.detalles)).toBe(true);
    expect(res.body.detalles.length).toBeGreaterThan(0);
    res.body.detalles.forEach((d) => expect(typeof d).toBe("string"));
    expect(Pelicula.create).not.toHaveBeenCalled();
  });

  test("PUT con director sin nombre", async () => {
    // Arrange / Act
    const res = await request(app).put(`/peliculas/${ID}`).set("Authorization", admin()).send({ director: { pais: "USA" } });
    // Assert
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.detalles)).toBe(true);
    expect(Pelicula.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("PUT con anio fuera de rango", async () => {
    // Arrange / Act
    const res = await request(app).put(`/peliculas/${ID}`).set("Authorization", admin()).send({ anio: 1800 });
    // Assert
    expect(res.status).toBe(400);
  });
});

describe("Mass assignment", () => {
  const sucio = () => ({
    ...valida(),
    _id: "507f1f77bcf86cd799439099",
    __v: 7,
    esAdmin: true,
    director: { nombre: "Lee Unkrich", pais: "USA", extra: "x", _id: "abc" },
  });

  function comprobar(datos) {
    expect(datos).not.toHaveProperty("_id");
    expect(datos).not.toHaveProperty("__v");
    expect(datos).not.toHaveProperty("esAdmin");
    expect(datos.titulo).toBe("Coco");
    expect(datos.anio).toBe(2017);
    expect(datos.director).toEqual({ nombre: "Lee Unkrich", pais: "USA" });
  }

  test("POST descarta _id, __v, campos extra y extra del director", async () => {
    // Arrange / Act
    const res = await request(app).post("/peliculas").set("Authorization", admin()).send(sucio());
    // Assert
    expect(res.status).toBe(201);
    comprobar(Pelicula.create.mock.calls[0][0]);
  });

  test("PUT descarta _id, __v, campos extra y extra del director", async () => {
    // Arrange / Act
    const res = await request(app).put(`/peliculas/${ID}`).set("Authorization", admin()).send(sucio());
    // Assert
    expect(res.status).toBe(200);
    expect(Pelicula.findByIdAndUpdate.mock.calls[0][0]).toBe(ID);
    comprobar(Pelicula.findByIdAndUpdate.mock.calls[0][1]);
  });
});
