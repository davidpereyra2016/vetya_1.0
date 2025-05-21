import express from "express";
import ConsejoDeSalud from "../models/ConsejoDeSalud.js";
import cloudinary from "../lib/cloudinary.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Obtener todos los consejos de salud
router.get("/", async (req, res) => {
  try {
    // Filtrar por categoría si se proporciona
    const filtro = {};
    if (req.query.categoria) {
      filtro.categoria = req.query.categoria;
    }
    if (req.query.paraTipos) {
      filtro.paraTipos = req.query.paraTipos;
    }
    if (req.query.destacado) {
      filtro.destacado = req.query.destacado === 'true';
    }
    if (req.query.activo !== undefined) {
      filtro.activo = req.query.activo === 'true';
    }
    
    const consejos = await ConsejoDeSalud.find(filtro)
      .sort({ destacado: -1, fechaPublicacion: -1 });
    
    res.status(200).json(consejos);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener los consejos de salud" });
  }
});

// Obtener un consejo de salud por ID
router.get("/:id", async (req, res) => {
  try {
    const consejo = await ConsejoDeSalud.findById(req.params.id);
    
    if (!consejo) {
      return res.status(404).json({ message: "Consejo de salud no encontrado" });
    }
    
    // Incrementar visualizaciones
    consejo.visualizaciones += 1;
    await consejo.save();
    
    res.status(200).json(consejo);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener el consejo de salud" });
  }
});

// Crear un nuevo consejo de salud (protegido)
router.post("/", protectRoute, async (req, res) => {
  try {
    const { titulo, contenido, resumen, categoria, paraTipos, tiempoLectura, autor, fuente, etiquetas, destacado } = req.body;
    
    // Validar campos obligatorios
    if (!titulo || !contenido || !resumen || !categoria) {
      return res.status(400).json({ message: "Título, contenido, resumen y categoría son obligatorios" });
    }
    
    // Procesar la imagen si se proporciona
    let imageUrl = "";
    if (req.body.imagen) {
      const uploadResponse = await cloudinary.uploader.upload(req.body.imagen, {
        folder: "consejos_salud"
      });
      imageUrl = uploadResponse.secure_url;
    } else {
      return res.status(400).json({ message: "La imagen es obligatoria" });
    }
    
    // Crear nuevo consejo de salud
    const nuevoConsejo = new ConsejoDeSalud({
      titulo,
      contenido,
      resumen,
      imagen: imageUrl,
      categoria,
      paraTipos: paraTipos || ["Todos"],
      tiempoLectura: tiempoLectura || 5,
      autor: autor || "Equipo Vetya",
      fuente: fuente || "",
      etiquetas: etiquetas || [],
      destacado: destacado || false,
      fechaPublicacion: new Date()
    });
    
    await nuevoConsejo.save();
    res.status(201).json(nuevoConsejo);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al crear el consejo de salud" });
  }
});

// Actualizar un consejo de salud (protegido)
router.put("/:id", protectRoute, async (req, res) => {
  try {
    const consejo = await ConsejoDeSalud.findById(req.params.id);
    
    if (!consejo) {
      return res.status(404).json({ message: "Consejo de salud no encontrado" });
    }
    
    // Procesar la imagen si se proporciona una nueva
    if (req.body.imagen && req.body.imagen !== consejo.imagen) {
      // Eliminar imagen anterior de Cloudinary si existe
      if (consejo.imagen && consejo.imagen.includes('cloudinary')) {
        const publicId = consejo.imagen.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`consejos_salud/${publicId}`);
      }
      
      // Subir nueva imagen
      const uploadResponse = await cloudinary.uploader.upload(req.body.imagen, {
        folder: "consejos_salud"
      });
      req.body.imagen = uploadResponse.secure_url;
    }
    
    // Actualizar consejo de salud
    const consejoActualizado = await ConsejoDeSalud.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    res.status(200).json(consejoActualizado);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al actualizar el consejo de salud" });
  }
});

// Eliminar un consejo de salud (protegido)
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const consejo = await ConsejoDeSalud.findById(req.params.id);
    
    if (!consejo) {
      return res.status(404).json({ message: "Consejo de salud no encontrado" });
    }
    
    // Eliminar imagen de Cloudinary si existe
    if (consejo.imagen && consejo.imagen.includes('cloudinary')) {
      const publicId = consejo.imagen.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`consejos_salud/${publicId}`);
    }
    
    await ConsejoDeSalud.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Consejo de salud eliminado con éxito" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al eliminar el consejo de salud" });
  }
});

// Obtener consejos por categoría
router.get("/categoria/:categoria", async (req, res) => {
  try {
    const consejos = await ConsejoDeSalud.find({ 
      categoria: req.params.categoria,
      activo: true
    }).sort({ fechaPublicacion: -1 });
    
    res.status(200).json(consejos);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener los consejos de salud" });
  }
});

// Obtener consejos para un tipo de mascota
router.get("/mascota/:tipo", async (req, res) => {
  try {
    const consejos = await ConsejoDeSalud.find({ 
      $or: [
        { paraTipos: req.params.tipo },
        { paraTipos: "Todos" }
      ],
      activo: true
    }).sort({ fechaPublicacion: -1 });
    
    res.status(200).json(consejos);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener los consejos de salud" });
  }
});

// Dar "like" a un consejo de salud
router.post("/:id/like", protectRoute, async (req, res) => {
  try {
    const consejo = await ConsejoDeSalud.findById(req.params.id);
    
    if (!consejo) {
      return res.status(404).json({ message: "Consejo de salud no encontrado" });
    }
    
    consejo.likes += 1;
    await consejo.save();
    
    res.status(200).json({ likes: consejo.likes });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al dar like al consejo de salud" });
  }
});

// Buscar consejos por texto
router.get("/buscar/:texto", async (req, res) => {
  try {
    const consejos = await ConsejoDeSalud.find({
      $text: { $search: req.params.texto },
      activo: true
    }).sort({ score: { $meta: "textScore" } });
    
    res.status(200).json(consejos);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al buscar consejos de salud" });
  }
});

export default router;
