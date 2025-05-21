import express from "express";
import Mascota from "../models/Mascota.js";
import cloudinary from "../lib/cloudinary.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Obtener todas las mascotas del usuario autenticado
router.get("/", protectRoute, async (req, res) => {
  try {
    const mascotas = await Mascota.find({ propietario: req.user._id });
    res.status(200).json(mascotas);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener las mascotas" });
  }
});

// Obtener una mascota por ID
router.get("/:id", protectRoute, async (req, res) => {
  try {
    const mascota = await Mascota.findById(req.params.id);
    
    if (!mascota) {
      return res.status(404).json({ message: "Mascota no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (mascota.propietario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para ver esta mascota" });
    }
    
    res.status(200).json(mascota);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener la mascota" });
  }
});

// Crear una nueva mascota
router.post("/", protectRoute, async (req, res) => {
  try {
    const { nombre, tipo, raza, edad, genero, color, peso, vacunado, necesidadesEspeciales, fechaNacimiento } = req.body;
    
    // Validar campos obligatorios
    if (!nombre || !tipo || !raza || !edad || !genero) {
      return res.status(400).json({ message: "Por favor completa todos los campos obligatorios" });
    }
    
    // Procesar la imagen si se proporciona
    let imageUrl = "";
    if (req.body.imagen) {
      const uploadResponse = await cloudinary.uploader.upload(req.body.imagen, {
        folder: "mascotas"
      });
      imageUrl = uploadResponse.secure_url;
    }
    
    // Crear nueva mascota
    const nuevaMascota = new Mascota({
      nombre,
      tipo,
      raza,
      edad,
      genero,
      color: color || "",
      peso: peso || "",
      vacunado: vacunado || false,
      necesidadesEspeciales: necesidadesEspeciales || "",
      imagen: imageUrl,
      fechaNacimiento: fechaNacimiento || null,
      propietario: req.user._id
    });
    
    await nuevaMascota.save();
    res.status(201).json(nuevaMascota);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al crear la mascota" });
  }
});

// Actualizar una mascota
router.put("/:id", protectRoute, async (req, res) => {
  try {
    const mascota = await Mascota.findById(req.params.id);
    
    if (!mascota) {
      return res.status(404).json({ message: "Mascota no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (mascota.propietario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para actualizar esta mascota" });
    }
    
    // Procesar la imagen si se proporciona una nueva
    if (req.body.imagen && req.body.imagen !== mascota.imagen) {
      // Eliminar imagen anterior de Cloudinary si existe
      if (mascota.imagen && mascota.imagen.includes('cloudinary')) {
        const publicId = mascota.imagen.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`mascotas/${publicId}`);
      }
      
      // Subir nueva imagen
      const uploadResponse = await cloudinary.uploader.upload(req.body.imagen, {
        folder: "mascotas"
      });
      req.body.imagen = uploadResponse.secure_url;
    }
    
    // Actualizar mascota
    const mascotaActualizada = await Mascota.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    res.status(200).json(mascotaActualizada);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al actualizar la mascota" });
  }
});

// Eliminar una mascota
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const mascota = await Mascota.findById(req.params.id);
    
    if (!mascota) {
      return res.status(404).json({ message: "Mascota no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (mascota.propietario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para eliminar esta mascota" });
    }
    
    // Eliminar imagen de Cloudinary si existe
    if (mascota.imagen && mascota.imagen.includes('cloudinary')) {
      const publicId = mascota.imagen.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`mascotas/${publicId}`);
    }
    
    await Mascota.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Mascota eliminada con éxito" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al eliminar la mascota" });
  }
});

// Agregar entrada al historial médico de una mascota
router.post("/:id/historial", protectRoute, async (req, res) => {
  try {
    const { fecha, descripcion, veterinario, tipoVisita } = req.body;
    
    // Validar campos obligatorios
    if (!descripcion || !tipoVisita) {
      return res.status(400).json({ message: "La descripción y el tipo de visita son obligatorios" });
    }
    
    const mascota = await Mascota.findById(req.params.id);
    
    if (!mascota) {
      return res.status(404).json({ message: "Mascota no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (mascota.propietario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para modificar esta mascota" });
    }
    
    // Agregar entrada al historial
    const nuevaEntrada = {
      fecha: fecha || new Date(),
      descripcion,
      veterinario,
      tipoVisita
    };
    
    mascota.historialMedico.push(nuevaEntrada);
    mascota.ultimaVisita = nuevaEntrada.fecha;
    
    await mascota.save();
    res.status(201).json(mascota);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al agregar entrada al historial" });
  }
});

// Obtener todas las mascotas de un tipo específico
router.get("/tipo/:tipo", protectRoute, async (req, res) => {
  try {
    const mascotas = await Mascota.find({ 
      propietario: req.user._id,
      tipo: req.params.tipo
    });
    
    res.status(200).json(mascotas);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener las mascotas" });
  }
});

export default router;
