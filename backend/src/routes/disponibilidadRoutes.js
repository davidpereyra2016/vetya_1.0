import express from 'express';
import Prestador from '../models/Prestador.js';
import protectRoute from '../middleware/auth.middleware.js';

const router = express.Router();

// Ruta para obtener todos los prestadores disponibles para emergencias
// GET /api/disponibilidad/disponibles-emergencias
router.get('/', async (req, res) => {
  try {
    console.log('Obteniendo prestadores disponibles para emergencias');
    
    // Buscar todos los prestadores que sean veterinarios y estén disponibles para emergencias
    const prestadoresDisponibles = await Prestador.find({
      tipo: 'Veterinario',
      disponibleEmergencias: true
    }).select('nombre especialidad rating precioEmergencia imagen ubicacion experiencia');
    
    console.log(`Se encontraron ${prestadoresDisponibles.length} prestadores disponibles para emergencias`);
    
    // Transformar la respuesta para incluir distancia (esto sería calculado con la ubicación real)
    const prestadoresConDistancia = prestadoresDisponibles.map(prestador => {
      // En una implementación real, aquí calcularíamos la distancia basada en geolocalización
      const distanciaRandom = Math.floor(Math.random() * 10) + 1; // 1-10 km (simulación)
      
      return {
        _id: prestador._id,
        nombre: prestador.nombre,
        especialidad: prestador.especialidad,
        rating: prestador.rating || 4.5,
        precioEmergencia: prestador.precioEmergencia || 50000,
        imagen: prestador.imagen,
        ubicacion: prestador.ubicacion,
        experiencia: prestador.experiencia || '5 años',
        distancia: `${distanciaRandom} km`,
        tiempoEstimado: `${distanciaRandom * 2} min`
      };
    });
    
    res.json(prestadoresConDistancia);
  } catch (error) {
    console.error('Error al obtener prestadores disponibles:', error);
    res.status(500).json({ 
      message: 'Error al obtener prestadores disponibles para emergencias',
      error: error.message
    });
  }
});

// Ruta para verificar disponibilidad de un prestador específico
// GET /api/disponibilidad/:prestadorId
router.get('/:prestadorId', async (req, res) => {
  try {
    const { prestadorId } = req.params;
    
    const prestador = await Prestador.findById(prestadorId);
    
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    res.json({
      disponibleEmergencias: prestador.disponibleEmergencias,
      precioEmergencia: prestador.precioEmergencia
    });
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({ 
      message: 'Error al verificar disponibilidad',
      error: error.message
    });
  }
});

export default router;
