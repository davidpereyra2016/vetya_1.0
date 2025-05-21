import express from "express";
import Veterinario from "../models/Veterinario.js";
import cloudinary from "../lib/cloudinary.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Obtener todos los veterinarios
router.get("/", async (req, res) => {
  try {
    const veterinarios = await Veterinario.find().sort({ rating: -1 }); // Ordenados por rating
    res.status(200).json(veterinarios);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener los veterinarios" });
  }
});

// Obtener un veterinario por ID
router.get("/:id", async (req, res) => {
  try {
    const veterinario = await Veterinario.findById(req.params.id);
    if (!veterinario) {
      return res.status(404).json({ message: "Veterinario no encontrado" });
    }
    res.status(200).json(veterinario);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener el veterinario" });
  }
});

// Crear un nuevo veterinario (protegido)
router.post("/", protectRoute, async (req, res) => {
  try {
    const { nombre, especialidad, experiencia, educacion, matricula, idiomas, ubicacion, email, descripcion, especialidades } = req.body;
    
    // Validar campos obligatorios
    if (!nombre || !especialidad || !experiencia || !educacion || !matricula || !ubicacion || !email) {
      return res.status(400).json({ message: "Por favor completa todos los campos obligatorios" });
    }

    // Verificar si ya existe un veterinario con esa matrícula
    const existingVet = await Veterinario.findOne({ matricula });
    if (existingVet) {
      return res.status(400).json({ message: "Ya existe un veterinario con esa matrícula" });
    }

    // Procesar la imagen si se proporciona
    let imageUrl = "";
    if (req.body.imagen) {
      const uploadResponse = await cloudinary.uploader.upload(req.body.imagen, {
        folder: "veterinarios"
      });
      imageUrl = uploadResponse.secure_url;
    }

    // Crear nuevo veterinario
    const nuevoVeterinario = new Veterinario({
      nombre,
      especialidad,
      especialidades: especialidades || [],
      experiencia,
      imagen: imageUrl,
      educacion,
      matricula,
      idiomas: idiomas || [],
      ubicacion,
      email,
      descripcion,
      user: req.user._id // Asociar al usuario que lo crea
    });

    await nuevoVeterinario.save();
    res.status(201).json(nuevoVeterinario);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al crear el veterinario" });
  }
});

// Actualizar un veterinario (protegido)
router.put("/:id", protectRoute, async (req, res) => {
  try {
    const veterinario = await Veterinario.findById(req.params.id);
    
    if (!veterinario) {
      return res.status(404).json({ message: "Veterinario no encontrado" });
    }
    
    // Verificar si el usuario actual es el propietario o administrador
    if (veterinario.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para actualizar este veterinario" });
    }
    
    // Procesar la imagen si se proporciona una nueva
    if (req.body.imagen && req.body.imagen !== veterinario.imagen) {
      // Eliminar imagen anterior de Cloudinary si existe
      if (veterinario.imagen && veterinario.imagen.includes('cloudinary')) {
        const publicId = veterinario.imagen.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`veterinarios/${publicId}`);
      }
      
      // Subir nueva imagen
      const uploadResponse = await cloudinary.uploader.upload(req.body.imagen, {
        folder: "veterinarios"
      });
      req.body.imagen = uploadResponse.secure_url;
    }
    
    // Actualizar veterinario
    const veterinarioActualizado = await Veterinario.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    res.status(200).json(veterinarioActualizado);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al actualizar el veterinario" });
  }
});

// Eliminar un veterinario (protegido)
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const veterinario = await Veterinario.findById(req.params.id);
    
    if (!veterinario) {
      return res.status(404).json({ message: "Veterinario no encontrado" });
    }
    
    // Verificar si el usuario actual es el propietario o administrador
    if (veterinario.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para eliminar este veterinario" });
    }
    
    // Eliminar imagen de Cloudinary si existe
    if (veterinario.imagen && veterinario.imagen.includes('cloudinary')) {
      const publicId = veterinario.imagen.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`veterinarios/${publicId}`);
    }
    
    await Veterinario.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Veterinario eliminado con éxito" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al eliminar el veterinario" });
  }
});

// Buscar veterinarios por especialidad
router.get("/especialidad/:especialidad", async (req, res) => {
  try {
    const veterinarios = await Veterinario.find({ 
      $or: [
        { especialidad: req.params.especialidad },
        { especialidades: req.params.especialidad }
      ]
    }).sort({ rating: -1 });
    
    if (veterinarios.length === 0) {
      return res.status(404).json({ message: "No se encontraron veterinarios con esa especialidad" });
    }
    
    res.status(200).json(veterinarios);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al buscar veterinarios por especialidad" });
  }
});

// Actualizar disponibilidad de un veterinario
router.patch("/:id/disponibilidad", protectRoute, async (req, res) => {
  try {
    const { disponible } = req.body;
    
    if (disponible === undefined) {
      return res.status(400).json({ message: "El estado de disponibilidad es requerido" });
    }
    
    const veterinario = await Veterinario.findById(req.params.id);
    
    if (!veterinario) {
      return res.status(404).json({ message: "Veterinario no encontrado" });
    }
    
    if (veterinario.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para actualizar este veterinario" });
    }
    
    veterinario.disponible = disponible;
    await veterinario.save();
    
    res.status(200).json(veterinario);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al actualizar la disponibilidad" });
  }
});

export default router;
