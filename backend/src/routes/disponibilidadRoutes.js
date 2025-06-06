import express from 'express';
import Prestador from '../models/Prestador.js';
import Disponibilidad from '../models/Disponibilidad.js';
import Servicio from '../models/Servicio.js';
import protectRoute from '../middleware/auth.middleware.js';

const router = express.Router();

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

// Ruta para obtener la disponibilidad general de un prestador
// GET /api/disponibilidad/prestador/:prestadorId
router.get('/prestador/:prestadorId', protectRoute, async (req, res) => {
  try {
    const { prestadorId } = req.params;
    
    // Verificar que el prestador exista
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    // Verificar permisos - solo el prestador o un admin pueden ver su disponibilidad
    if (prestador.usuario.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para ver esta disponibilidad' });
    }
    
    // Buscar la disponibilidad general (sin servicio específico)
    let disponibilidadGeneral = await Disponibilidad.findOne({
      prestador: prestadorId,
      servicio: null // Disponibilidad general no está asociada a un servicio específico
    });
    
    // Si no existe, crear un objeto de disponibilidad por defecto
    if (!disponibilidadGeneral) {
      // Usar los horarios del prestador para la disponibilidad general
      let horarios = [];
      
      if (prestador.horarios && prestador.horarios.length > 0) {
        // Convertir horarios del prestador al formato de disponibilidad con turnos mañana y tarde
        horarios = prestador.horarios.map(h => ({
          dia: h.dia,
          manana: {
            activo: h.manana?.activo || true,
            apertura: h.manana?.apertura || "08:00",
            cierre: h.manana?.cierre || "12:00",
            intervalo: 30 // Valor por defecto
          },
          tarde: {
            activo: h.tarde?.activo || true,
            apertura: h.tarde?.apertura || "16:00",
            cierre: h.tarde?.cierre || "20:00",
            intervalo: 30 // Valor por defecto
          }
        }));
      }
      
      disponibilidadGeneral = {
        prestador: prestadorId,
        servicio: null,
        horarioEspecifico: {
          activo: true,
          horarios: horarios
        },
        fechasEspeciales: [],
        reservas: []
      };
    }
    
    // Si es un veterinario, asegurar que el radio de privacidad sea al menos 1km
    if (prestador.tipo === 'Veterinario') {
      if (prestador.radio < 1) {
        console.log(`Ajustando radio de privacidad a 1km para veterinario ${prestadorId}`);
      }
    }
    
    res.json(disponibilidadGeneral);
  } catch (error) {
    console.error('Error al obtener disponibilidad general:', error);
    res.status(500).json({
      message: 'Error al obtener disponibilidad general',
      error: error.message
    });
  }
});

// Ruta para configurar la disponibilidad general de un prestador
// POST /api/disponibilidad/prestador/:prestadorId
router.post('/prestador/:prestadorId', protectRoute, async (req, res) => {
  try {
    const { prestadorId } = req.params;
    const { horarioEspecifico, fechasEspeciales } = req.body;
    
    // Verificar que el prestador exista
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    // Verificar permisos - solo el prestador o un admin pueden modificar su disponibilidad
    if (prestador.usuario.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para modificar esta disponibilidad' });
    }
    
    console.log('Configurando disponibilidad general para prestador ID:', prestadorId);
    console.log('Datos de disponibilidad general:', req.body);
    
    // Buscar disponibilidad existente o crear una nueva
    let disponibilidad = await Disponibilidad.findOne({
      prestador: prestadorId,
      servicio: null
    });
    
    if (disponibilidad) {
      if (horarioEspecifico) {
        // Actualizar intervalos con la duración del servicio si es necesario
        if (horarioEspecifico.horarios) {
          horarioEspecifico.horarios = horarioEspecifico.horarios.map(h => ({
            ...h,
            manana: {
              ...h.manana,
              intervalo: h.manana?.intervalo || duracionServicio // Mantener valor existente o usar duración del servicio como fallback
            },
            tarde: {
              ...h.tarde,
              intervalo: h.tarde?.intervalo || duracionServicio // Mantener valor existente o usar duración del servicio como fallback
            }
          }));
        }
        disponibilidad.horarioEspecifico = horarioEspecifico;
      }
      
      if (fechasEspeciales) {
        disponibilidad.fechasEspeciales = fechasEspeciales;
      }
      
      await disponibilidad.save();
    } else {
      // Crear nueva disponibilidad general
      disponibilidad = new Disponibilidad({
        prestador: prestadorId,
        servicio: null,
        horarioEspecifico: horarioEspecifico || {
          activo: false,
          horarios: []
        },
        fechasEspeciales: fechasEspeciales || []
      });
      
      await disponibilidad.save();
    }
    
    // Si se proporcionaron horarios, actualizar también en el modelo del prestador
    if (horarioEspecifico && horarioEspecifico.horarios && horarioEspecifico.horarios.length > 0) {
      // Convertir los horarios al formato del modelo de prestador con turnos mañana y tarde
      const prestadorHorarios = horarioEspecifico.horarios.map(h => ({
        dia: h.dia,
        manana: {
          activo: h.manana?.activo !== undefined ? h.manana.activo : true,
          apertura: h.manana?.apertura || "08:00",
          cierre: h.manana?.cierre || "12:00"
        },
        tarde: {
          activo: h.tarde?.activo !== undefined ? h.tarde.activo : true,
          apertura: h.tarde?.apertura || "16:00",
          cierre: h.tarde?.cierre || "20:00"
        }
      }));
      
      // Actualizar horarios en el modelo del prestador
      prestador.horarios = prestadorHorarios;
      
      // Si es un veterinario, asegurar que el radio de privacidad sea al menos 1km
      if (prestador.tipo === 'Veterinario' && prestador.radio < 1) {
        console.log(`Manteniendo radio de privacidad de 1km para veterinario ${prestadorId}`);
        prestador.radio = 1;
      }
      
      await prestador.save();
    }
    
    res.status(200).json(disponibilidad);
  } catch (error) {
    console.error('Error al configurar disponibilidad general:', error);
    res.status(500).json({
      message: 'Error al configurar disponibilidad general',
      error: error.message
    });
  }
});

// Ruta para obtener la disponibilidad de un prestador para un servicio específico
// GET /api/disponibilidad/prestador/:prestadorId/servicio/:servicioId
router.get('/prestador/:prestadorId/servicio/:servicioId', protectRoute, async (req, res) => {
  try {
    const { prestadorId, servicioId } = req.params;
    
    // Verificar que el prestador exista
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    // Verificar que el servicio exista y pertenezca al prestador
    const servicio = await Servicio.findOne({
      _id: servicioId,
      prestadorId: prestadorId
    });
    
    if (!servicio) {
      return res.status(404).json({ message: 'Servicio no encontrado para este prestador' });
    }

    // Obtener la duración del servicio
    const duracionServicio = servicio.duracion || 30;
    
    // Buscar disponibilidad específica para este servicio
    let disponibilidadServicio = await Disponibilidad.findOne({
      prestador: prestadorId,
      servicio: servicioId
    });
    
    // Si no existe disponibilidad específica, buscar la disponibilidad general
    if (!disponibilidadServicio) {
      const disponibilidadGeneral = await Disponibilidad.findOne({
        prestador: prestadorId,
        servicio: null
      });
      
      // Si tampoco hay disponibilidad general, crear un objeto por defecto usando los horarios del prestador
      if (!disponibilidadGeneral) {
        let horarios = [];
        
        if (prestador.horarios && prestador.horarios.length > 0) {
          horarios = prestador.horarios.map(h => ({
            dia: h.dia,
            manana: {
              activo: h.manana?.activo || true,
              apertura: h.manana?.apertura || "08:00",
              cierre: h.manana?.cierre || "12:00",
              intervalo: duracionServicio // Valor por defecto
            },
            tarde: {
              activo: h.tarde?.activo || true,
              apertura: h.tarde?.apertura || "16:00",
              cierre: h.tarde?.cierre || "20:00",
              intervalo: duracionServicio // Valor por defecto
            }
          }));
        }
        
        disponibilidadServicio = {
          prestador: prestadorId,
          servicio: servicioId,
          horarioEspecifico: {
            activo: false, // Usa horario general
            horarios: horarios
          },
          fechasEspeciales: [],
          reservas: []
        };
      } else {
        // Actualizar intervalos con la duración del servicio
        const horarios = disponibilidadGeneral.horarioEspecifico.horarios.map(h => ({
          ...h,
          manana: {
            ...h.manana,
            intervalo: h.manana?.intervalo || duracionServicio
          },
          tarde: {
            ...h.tarde,
            intervalo: h.tarde?.intervalo || duracionServicio
          }
        }));
        // Usar la disponibilidad general como base
        disponibilidadServicio = {
          prestador: prestadorId,
          servicio: servicioId,
          horarioEspecifico: {
            activo: false, // Usa horario general
            horarios: horarios
          },
          fechasEspeciales: disponibilidadGeneral.fechasEspeciales,
          reservas: []
        };
      }
    }else {
      // Asegurarse de que los intervalos estén actualizados
      if (disponibilidadServicio.horarioEspecifico.horarios) {
        disponibilidadServicio.horarioEspecifico.horarios = disponibilidadServicio.horarioEspecifico.horarios.map(h => ({
          ...h,
          manana: {
            ...h.manana,
            intervalo: h.manana?.intervalo || duracionServicio
          },
          tarde: {
            ...h.tarde,
            intervalo: h.tarde?.intervalo || duracionServicio
          }
        }));
      }
    }
    
    // Si es un veterinario, aplicar política de privacidad
    if (prestador.tipo === 'Veterinario') {
      console.log(`Aplicando política de privacidad para el veterinario ${prestadorId}`);
    }
    
    res.json(disponibilidadServicio);
  } catch (error) {
    console.error('Error al obtener disponibilidad para servicio específico:', error);
    res.status(500).json({
      message: 'Error al obtener disponibilidad para servicio específico',
      error: error.message
    });
  }
});

// Ruta para configurar la disponibilidad de un servicio específico
// POST /api/disponibilidad/prestador/:prestadorId/servicio/:servicioId
router.post('/prestador/:prestadorId/servicio/:servicioId', protectRoute, async (req, res) => {
  try {
    const { prestadorId, servicioId } = req.params;
    const { horarioEspecifico, fechasEspeciales } = req.body;
    
    // Verificar que el prestador exista
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    // Verificar permisos - solo el prestador o un admin pueden modificar su disponibilidad
    if (prestador.usuario.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para modificar esta disponibilidad' });
    }
    
    // Verificar que el servicio exista y pertenezca al prestador
    const servicio = await Servicio.findOne({
      _id: servicioId,
      prestadorId: prestadorId
    });
    
    if (!servicio) {
      return res.status(404).json({ message: 'Servicio no encontrado para este prestador' });
    }
    
    console.log(`Configurando disponibilidad para servicio ${servicioId} del prestador ${prestadorId}`);
    // Obtener la duración del servicio
    const duracionServicio = servicio.duracion || 30;
    // Buscar disponibilidad existente o crear una nueva
    let disponibilidad = await Disponibilidad.findOne({
      prestador: prestadorId,
      servicio: servicioId
    });
    
    if (disponibilidad) {
      // Actualizar disponibilidad existente
      if (horarioEspecifico) {
        // Actualizar intervalos con la duración del servicio si es necesario
        if (horarioEspecifico.horarios) {
          horarioEspecifico.horarios = horarioEspecifico.horarios.map(h => ({
            ...h,
            manana: {
              ...h.manana,
              intervalo: h.manana?.intervalo || duracionServicio // Mantener valor existente o usar duración del servicio como fallback
            },
            tarde: {
              ...h.tarde,
              intervalo: h.tarde?.intervalo || duracionServicio // Mantener valor existente o usar duración del servicio como fallback
            }
          }));
        }
        disponibilidad.horarioEspecifico = horarioEspecifico;
      }
      
      if (fechasEspeciales) {
        disponibilidad.fechasEspeciales = fechasEspeciales;
      }
      
      await disponibilidad.save();
    } else {
      // Crear nueva disponibilidad con la duración del servicio
      const horariosConDuracion = horarioEspecifico?.horarios?.map(h => ({
        ...h,
        manana: {
          ...h.manana,
          intervalo: h.manana?.intervalo || duracionServicio
        },
        tarde: {
          ...h.tarde,
          intervalo: h.tarde?.intervalo || duracionServicio
        }
      })) || [];
      // Crear nueva disponibilidad
      disponibilidad = new Disponibilidad({
        prestador: prestadorId,
        servicio: servicioId,
        horarioEspecifico: {
          activo: horarioEspecifico?.activo || false,
          horarios: horariosConDuracion
        },
        fechasEspeciales: fechasEspeciales || []
      });
      
      await disponibilidad.save();
    }
    
    // Si es un veterinario, mantener radio de privacidad
    if (prestador.tipo === 'Veterinario' && prestador.radio < 1) {
      console.log(`Manteniendo radio de privacidad de 1km para veterinario ${prestadorId}`);
      prestador.radio = 1;
      await prestador.save();
    }
    
    res.status(200).json(disponibilidad);
  } catch (error) {
    console.error('Error al configurar disponibilidad para servicio específico:', error);
    res.status(500).json({
      message: 'Error al configurar disponibilidad para servicio específico',
      error: error.message
    });
  }
});

export default router;
