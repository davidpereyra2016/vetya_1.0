import express from "express";
import Servicio from "../models/Servicio.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Obtener todos los servicios
router.get("/", async (req, res) => {
  try {
    // Filtrar por categoría si se proporciona
    const filtro = {};
    if (req.query.categoria) {
      filtro.categoria = req.query.categoria;
    }
    if (req.query.activo !== undefined) {
      filtro.activo = req.query.activo === 'true';
    }
    
    const servicios = await Servicio.find(filtro).sort({ nombre: 1 });
    res.status(200).json(servicios);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener los servicios" });
  }
});

// Obtener un servicio por ID
router.get("/:id", async (req, res) => {
  try {
    const servicio = await Servicio.findById(req.params.id);
    
    if (!servicio) {
      return res.status(404).json({ message: "Servicio no encontrado" });
    }
    
    res.status(200).json(servicio);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener el servicio" });
  }
});

// Crear un nuevo servicio (protegido)
router.post("/", protectRoute, async (req, res) => {
  try {
    const { nombre, descripcion, icono, color, precio, duracion, categoria, disponibleParaTipos, requiereAprobacion } = req.body;
    
    // Validar campos obligatorios
    if (!nombre || !descripcion) {
      return res.status(400).json({ message: "El nombre y la descripción son obligatorios" });
    }
    
    // Verificar si ya existe un servicio con ese nombre
    const existingServicio = await Servicio.findOne({ nombre });
    if (existingServicio) {
      return res.status(400).json({ message: "Ya existe un servicio con ese nombre" });
    }
    
    // Crear nuevo servicio
    const nuevoServicio = new Servicio({
      nombre,
      descripcion,
      icono: icono || "medkit-outline",
      color: color || "#1E88E5",
      precio: precio || 0,
      duracion: duracion || 30,
      categoria: categoria || "Consulta",
      disponibleParaTipos: disponibleParaTipos || ["Perro", "Gato", "Ave", "Reptil", "Roedor", "Otro"],
      requiereAprobacion: requiereAprobacion || false
    });
    
    await nuevoServicio.save();
    res.status(201).json(nuevoServicio);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al crear el servicio" });
  }
});

// Actualizar un servicio (protegido)
router.put("/:id", protectRoute, async (req, res) => {
  try {
    const servicio = await Servicio.findById(req.params.id);
    
    if (!servicio) {
      return res.status(404).json({ message: "Servicio no encontrado" });
    }
    
    // Si se cambia el nombre, verificar que no exista otro servicio con ese nombre
    if (req.body.nombre && req.body.nombre !== servicio.nombre) {
      const existingServicio = await Servicio.findOne({ nombre: req.body.nombre });
      if (existingServicio) {
        return res.status(400).json({ message: "Ya existe un servicio con ese nombre" });
      }
    }
    
    // Actualizar servicio
    const servicioActualizado = await Servicio.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    res.status(200).json(servicioActualizado);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al actualizar el servicio" });
  }
});

// Eliminar un servicio (protegido)
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const servicio = await Servicio.findById(req.params.id);
    
    if (!servicio) {
      return res.status(404).json({ message: "Servicio no encontrado" });
    }
    
    await Servicio.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Servicio eliminado con éxito" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al eliminar el servicio" });
  }
});

// Obtener servicios por tipo de mascota
router.get("/tipo/:tipo", async (req, res) => {
  try {
    const servicios = await Servicio.find({ 
      disponibleParaTipos: req.params.tipo,
      activo: true
    }).sort({ nombre: 1 });
    
    res.status(200).json(servicios);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener los servicios" });
  }
});

// Actualizar estado de un servicio (activo/inactivo)
router.patch("/:id/estado", protectRoute, async (req, res) => {
  try {
    const { activo } = req.body;
    
    if (activo === undefined) {
      return res.status(400).json({ message: "El estado es requerido" });
    }
    
    const servicio = await Servicio.findById(req.params.id);
    
    if (!servicio) {
      return res.status(404).json({ message: "Servicio no encontrado" });
    }
    
    servicio.activo = activo;
    await servicio.save();
    
    res.status(200).json(servicio);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al actualizar el estado del servicio" });
  }
});

export default router;
