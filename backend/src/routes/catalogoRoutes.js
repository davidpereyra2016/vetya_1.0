import express from "express";
import Servicio from "../models/Servicio.js";
import { serviciosPorTipo } from "../data/serviciosPredefinidos.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Endpoint para obtener todos los servicios predefinidos por tipo de prestador
 * Si es la primera vez que se solicitan, se cargan en la base de datos
 */
router.get("/servicios/:tipoPrestador", async (req, res) => {
  try {
    const { tipoPrestador } = req.params;
    
    // Verificar que exista el tipo de prestador en el catálogo
    if (!serviciosPorTipo[tipoPrestador]) {
      return res.status(404).json({ 
        message: `No se encontró catálogo para el tipo ${tipoPrestador}` 
      });
    }
    
    // Buscar si ya existen servicios predefinidos para este tipo de prestador
    const serviciosExistentes = await Servicio.find({ 
      tipoPrestador: tipoPrestador,
      esServicioPredefinido: true
    });
    
    // Si ya existen servicios predefinidos, devolverlos
    if (serviciosExistentes.length > 0) {
      console.log(`Devolviendo ${serviciosExistentes.length} servicios predefinidos para ${tipoPrestador}`);
      return res.json(serviciosExistentes);
    }
    
    // Si no existen, crearlos a partir de los predefinidos
    console.log(`Cargando servicios predefinidos para ${tipoPrestador}`);
    const serviciosParaCrear = serviciosPorTipo[tipoPrestador].map(servicio => ({
      ...servicio,
      tipoPrestador: tipoPrestador,
      esServicioPredefinido: true,
      // Asegurarse de que tengan los campos requeridos
      disponibleParaTipos: servicio.disponibleParaTipos || ['Perro', 'Gato'],
      activo: true
    }));
    
    // Guardar los servicios predefinidos en la base de datos
    const serviciosCreados = await Servicio.insertMany(serviciosParaCrear);
    
    res.status(201).json(serviciosCreados);
  } catch (error) {
    console.log('Error al obtener catálogo de servicios:', error);
    res.status(500).json({ message: "Error al obtener el catálogo de servicios" });
  }
});

/**
 * Endpoint para obtener los servicios de un prestador específico
 */
router.get("/prestador/:prestadorId", async (req, res) => {
  try {
    const { prestadorId } = req.params;
    console.log('Buscando servicios para el prestador ID:', prestadorId);
    
    // Importar el modelo Prestador (evitamos circular imports)
    const Prestador = (await import('../models/Prestador.js')).default;
    
    // Buscar prestador para verificar que existe
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      console.log('Prestador no encontrado:', prestadorId);
      return res.status(404).json({ message: "Prestador no encontrado" });
    }
    
    console.log('Prestador encontrado:', prestador._id);
    
    // Obtener los servicios asociados al prestador
    const servicios = await Servicio.find({ 
      prestadorId: prestadorId,
      activo: true
    });
    
    console.log(`Se encontraron ${servicios.length} servicios para el prestador`);
    res.json(servicios);
  } catch (error) {
    console.log('Error al obtener servicios del prestador:', error.message);
    res.status(500).json({ message: "Error al obtener los servicios del prestador" });
  }
});

export default router;
