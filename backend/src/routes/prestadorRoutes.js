import express from 'express';
const router = express.Router();
import Prestador from '../models/Prestador.js';
import Servicio from '../models/Servicio.js';
import User from '../models/User.js';
import { protectRoute, checkRole } from '../middleware/auth.middleware.js';

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} Distancia en kilómetros
 */
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distancia en km
}

/**
 * Convierte grados a radianes
 * @param {number} value - Valor en grados
 * @returns {number} Valor en radianes
 */
function toRad(value) {
  return value * Math.PI / 180;
}

// Obtener todos los prestadores
router.get('/', async (req, res) => {
  try {
    const prestadores = await Prestador.find({ activo: true })
      .select('nombre tipo especialidades imagen direccion rating disponibleEmergencias precioEmergencia');
    res.json(prestadores);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error al obtener los prestadores' });
  }
});

// Obtener prestadores por tipo
router.get('/tipo/:tipo', async (req, res) => {
  try {
    const tiposValidos = ['Veterinario', 'Centro Veterinario', 'Otro'];
    if (!tiposValidos.includes(req.params.tipo)) {
      return res.status(400).json({ message: 'Tipo de prestador inválido' });
    }

    const prestadores = await Prestador.find({
      tipo: req.params.tipo,
      activo: true
    }).select('nombre tipo especialidades imagen direccion rating disponibleEmergencias');
    
    res.json(prestadores);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error al obtener los prestadores por tipo' });
  }
});

// Obtener prestadores disponibles para emergencias
router.get('/emergencias', async (req, res) => {
  try {
    const prestadores = await Prestador.find({
      disponibleEmergencias: true,
      activo: true
    }).select('nombre tipo especialidades imagen direccion rating disponibleEmergencias precioEmergencia');
    
    res.json(prestadores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los prestadores para emergencias' });
  }
});

// Obtener prestadores disponibles para emergencias con cálculo de distancia
router.get('/emergencias/disponibles', protectRoute, async (req, res) => {
  try {
    let { clientLat, clientLng } = req.query;
    
    // Si el cliente no proporciona ubicación, intentar obtenerla de su perfil
    if (!clientLat || !clientLng) {
      // Intentar obtener la ubicación del usuario autenticado
      if (req.user && req.user._id) {
        const client = await User.findById(req.user._id);
        if (client && client.ubicacionActual && client.ubicacionActual.coordinates) {
          clientLat = client.ubicacionActual.coordinates.lat;
          clientLng = client.ubicacionActual.coordinates.lng;
          console.log('Usando ubicación guardada del cliente:', { clientLat, clientLng });
        }
      }
      
      // Si aún no tenemos ubicación, retornar error
      if (!clientLat || !clientLng) {
        return res.status(400).json({ 
          message: 'Se requiere la ubicación del cliente. Por favor, activa tu GPS o ingresa una ubicación manual.'
        });
      }
    }
    
    // Convertir a números
    clientLat = parseFloat(clientLat);
    clientLng = parseFloat(clientLng);
    
    // Buscar veterinarios disponibles
    const prestadores = await Prestador.find({
      disponibleEmergencias: true,
      activo: true
    }).populate('usuario', 'email username');
    
    // Calcular distancias y tiempos
    const prestadoresConDistancia = prestadores.map(prestador => {
      // Usar ubicación actual o fija del prestador
      const prestadorLat = prestador.ubicacionActual?.coordenadas?.lat || prestador.direccion?.coordenadas?.lat;
      const prestadorLng = prestador.ubicacionActual?.coordenadas?.lng || prestador.direccion?.coordenadas?.lng;
      
      // Si no hay coordenadas, asignar una distancia muy grande
      if (!prestadorLat || !prestadorLng) {
        return {
          ...prestador.toObject(),
          distancia: 9999,
          distanciaTexto: 'Desconocida',
          tiempoEstimado: 'Desconocido'
        };
      }
      
      // Calcular distancia usando Haversine
      const distancia = calcularDistancia(
        clientLat, clientLng, 
        prestadorLat, prestadorLng
      );
      
      // Calcular tiempo estimado (asumiendo 30 km/h promedio en ciudad)
      const tiempoEstimadoMinutos = Math.ceil(distancia / 30 * 60);
      
      return {
        ...prestador.toObject(),
        distancia: distancia, // valor numérico para ordenar
        distanciaTexto: `${distancia.toFixed(1)} km`,
        tiempoEstimado: tiempoEstimadoMinutos,
        tiempoEstimadoTexto: tiempoEstimadoMinutos < 60 ? 
          `${tiempoEstimadoMinutos} min` : 
          `${Math.floor(tiempoEstimadoMinutos/60)} h ${tiempoEstimadoMinutos%60} min`
      };
    });
    
    // Ordenar por cercanía
    prestadoresConDistancia.sort((a, b) => a.distancia - b.distancia);
    
    res.status(200).json({
      success: true,
      count: prestadoresConDistancia.length,
      data: prestadoresConDistancia
    });
  } catch (error) {
    console.error('Error al obtener prestadores con distancia:', error);
    res.status(500).json({ message: 'Error al obtener prestadores disponibles' });
  }
});

// Obtener prestadores disponibles para emergencias con ubicación en tiempo real
router.get('/emergencias/ubicacion', async (req, res) => {
  try {
    // Obtener las coordenadas del cliente (si se proporcionan)
    const { lat, lng } = req.query;
    
    // Buscar prestadores disponibles para emergencias
    const prestadores = await Prestador.find({
      disponibleEmergencias: true,
      activo: true,
      'ubicacionActual.coordenadas': { $exists: true } // Solo los que tienen ubicación actual
    }).select(
      'nombre tipo especialidades imagen direccion rating disponibleEmergencias precioEmergencia radio ubicacionActual'
    );
    
    // Si no hay prestadores disponibles, devolver array vacío
    if (!prestadores || prestadores.length === 0) {
      return res.json([]);
    }
    
    // Si se proporcionaron coordenadas del cliente, calcular distancia y tiempo estimado
    let resultado = prestadores;
    if (lat && lng) {
      const clientLocation = {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      };
      
      // Calcular distancia y tiempo estimado para cada prestador
      resultado = prestadores.map(prestador => {
        const prestadorObj = prestador.toObject();
        
        if (prestadorObj.ubicacionActual && prestadorObj.ubicacionActual.coordenadas) {
          // Calcular distancia en km usando la fórmula de Haversine
          const distance = calcularDistancia(
            clientLocation.lat, 
            clientLocation.lng, 
            prestadorObj.ubicacionActual.coordenadas.lat, 
            prestadorObj.ubicacionActual.coordenadas.lng
          );
          
          // Calcular tiempo estimado (asumiendo velocidad promedio de 30 km/h en ciudad)
          // Convertir a minutos y redondear
          const tiempoEstimadoMinutos = Math.round(distance / 30 * 60);
          
          // Añadir información de distancia y tiempo estimado
          prestadorObj.distancia = {
            valor: distance,
            texto: `${distance.toFixed(1)} km`
          };
          
          prestadorObj.tiempoEstimado = {
            valor: tiempoEstimadoMinutos,
            texto: tiempoEstimadoMinutos < 60 
              ? `${tiempoEstimadoMinutos} min` 
              : `${Math.floor(tiempoEstimadoMinutos/60)} h ${tiempoEstimadoMinutos % 60} min`
          };
        }
        
        return prestadorObj;
      });
      
      // Ordenar por distancia (más cercanos primero)
      resultado.sort((a, b) => {
        const distanciaA = a.distancia?.valor || Infinity;
        const distanciaB = b.distancia?.valor || Infinity;
        return distanciaA - distanciaB;
      });
    }
    
    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener prestadores con ubicación:', error);
    res.status(500).json({ message: 'Error al obtener los prestadores con ubicación' });
  }
});

// Nota: Usamos la función calcularDistancia definida al inicio del archivo

// Obtener prestadores cercanos por coordenadas
router.get('/cercanos', async (req, res) => {
  try {
    const { lat, lng, distancia = 5 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Se requieren las coordenadas (lat, lng)' });
    }

    const prestadores = await Prestador.find({
      activo: true,
      'direccion.coordenadas': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(distancia) * 1000 // Convertir a metros
        }
      }
    }).select('nombre tipo especialidades imagen direccion rating disponibleEmergencias');
    
    res.json(prestadores);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error al obtener los prestadores cercanos' });
  }
});

// Obtener un prestador por ID
router.get('/:id', async (req, res) => {
  try {
    const prestador = await Prestador.findById(req.params.id)
      .populate('usuario', 'nombre email')
      .populate('opiniones.usuario', 'nombre imagen');
    
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    res.json(prestador);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error al obtener el prestador' });
  }
});

// Crear un nuevo prestador (solo para usuarios autenticados)
router.post('/', protectRoute, async (req, res) => {
  try {
    const nuevoPrestador = new Prestador({
      usuario: req.user._id,
      nombre: req.body.nombre,
      tipo: req.body.tipo,
      especialidades: req.body.especialidades || [],
      servicios: req.body.servicios || [],
      imagen: req.body.imagen,
      direccion: req.body.direccion,
      horarios: req.body.horarios || [],
      telefono: req.body.telefono,
      email: req.body.email,
      sitioWeb: req.body.sitioWeb,
      disponibleEmergencias: req.body.disponibleEmergencias || false,
      radio: req.body.radio || 5
    });
    
    // Guardar el prestador
    const prestadorGuardado = await nuevoPrestador.save();
    
    // Ya no se asocian servicios predefinidos automáticamente
    // El prestador deberá elegir sus servicios desde el catálogo
    console.log(`Prestador creado correctamente con ID: ${prestadorGuardado._id}`);
    console.log(`Tipo de prestador: ${prestadorGuardado.tipo} - No se asignaron servicios automáticamente`);
    
    
    res.status(201).json(prestadorGuardado);
  } catch (error) {
    console.log('Error al crear el prestador:', error);
    res.status(500).json({ message: 'Error al crear el prestador' });
  }
});

// Actualizar ubicación del prestador en tiempo real
router.patch('/:id/ubicacion', protectRoute, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    // Validar que las coordenadas sean números válidos
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requieren coordenadas válidas (lat, lng)' 
      });
    }
    
    // Buscar prestador
    const prestador = await Prestador.findById(req.params.id);
    
    if (!prestador) {
      return res.status(404).json({ 
        success: false, 
        message: 'Prestador no encontrado' 
      });
    }
    
    // Verificar si el usuario autenticado es dueño del prestador
    if (prestador.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autorizado para modificar este prestador' 
      });
    }
    
    // Verificar que el prestador sea veterinario y esté disponible para emergencias
    if (prestador.tipo !== 'Veterinario') {
      return res.status(400).json({ 
        success: false, 
        message: 'Solo los veterinarios pueden actualizar su ubicación para emergencias' 
      });
    }
    
    if (!prestador.disponibleEmergencias) {
      return res.status(400).json({ 
        success: false, 
        message: 'El prestador debe estar disponible para emergencias para actualizar su ubicación' 
      });
    }
    
    // Actualizar la ubicación actual
    prestador.ubicacionActual = {
      coordenadas: {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      },
      ultimaActualizacion: new Date()
    };
    
    await prestador.save();
    
    res.json({ 
      success: true, 
      message: 'Ubicación actualizada correctamente',
      ubicacion: prestador.ubicacionActual 
    });
  } catch (error) {
    console.error('Error al actualizar ubicación del prestador:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar la ubicación', 
      error: error.message 
    });
  }
});

// Actualizar precio de emergencia del prestador
router.patch('/:id/precio-emergencia', protectRoute, async (req, res) => {
  try {
    const { precioEmergencia, disponibleEmergencias } = req.body;
    
    // Validar que el precio sea un número
    if (precioEmergencia !== undefined && (isNaN(precioEmergencia) || precioEmergencia < 0)) {
      return res.status(400).json({ message: 'El precio de emergencia debe ser un número válido y no negativo' });
    }
    
    // Buscar prestador
    const prestador = await Prestador.findById(req.params.id);
    
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    // Verificar si el usuario autenticado es dueño del prestador
    if (prestador.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'No autorizado para modificar este prestador' });
    }
    
    // Verificar que el prestador sea veterinario para poder configurar servicio de emergencia
    if (prestador.tipo !== 'Veterinario') {
      return res.status(400).json({ message: 'Solo los veterinarios pueden configurar servicios de emergencia' });
    }
    
    // Actualizar los campos
    if (precioEmergencia !== undefined) {
      prestador.precioEmergencia = precioEmergencia;
    }
    
    if (disponibleEmergencias !== undefined) {
      prestador.disponibleEmergencias = disponibleEmergencias;
      
      // Si el prestador está desactivando su disponibilidad, limpiar ubicación actual
      if (!disponibleEmergencias && prestador.ubicacionActual) {
        prestador.ubicacionActual = undefined;
      }
    }
    
    await prestador.save();
    
    res.json({
      message: 'Precio de emergencia actualizado correctamente',
      prestador: {
        _id: prestador._id,
        precioEmergencia: prestador.precioEmergencia,
        disponibleEmergencias: prestador.disponibleEmergencias
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error al actualizar el precio de emergencia' });
  }
});

// Actualizar prestador (solo el dueño)
router.put('/:id', protectRoute, async (req, res) => {
  try {
    const prestador = await Prestador.findById(req.params.id);
    
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    // Verificar que el usuario logueado sea dueño del prestador
    if (prestador.usuario.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No tienes permisos para actualizar este prestador' });
    }
    
    const prestadorActualizado = await Prestador.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json(prestadorActualizado);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error al actualizar el prestador' });
  }
});

// Agregar opinión a un prestador
router.post('/:id/opiniones', protectRoute, async (req, res) => {
  try {
    const { texto, calificacion } = req.body;
    
    if (!texto || !calificacion) {
      return res.status(400).json({ message: 'Se requiere texto y calificación' });
    }
    
    const prestador = await Prestador.findById(req.params.id);
    
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    // Verificar si el usuario ya dejó una opinión
    const opinionExistente = prestador.opiniones.find(
      opinion => opinion.usuario.toString() === req.user._id.toString()
    );
    
    if (opinionExistente) {
      return res.status(400).json({ message: 'Ya has dejado una opinión para este prestador' });
    }
    
    // Agregar nueva opinión
    prestador.opiniones.push({
      usuario: req.user._id,
      texto,
      calificacion
    });
    
    // Actualizar rating promedio
    const totalOpiniones = prestador.opiniones.length;
    const sumaCalificaciones = prestador.opiniones.reduce(
      (sum, opinion) => sum + opinion.calificacion, 0
    );
    
    prestador.rating = sumaCalificaciones / totalOpiniones;
    
    await prestador.save();
    
    res.status(201).json(prestador);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error al agregar opinión' });
  }
});

// Eliminar prestador (solo el dueño)
router.delete('/:id', protectRoute, async (req, res) => {
  try {
    const prestador = await Prestador.findById(req.params.id);
    
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    // Verificar que el usuario logueado sea dueño del prestador
    if (prestador.usuario.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No tienes permisos para eliminar este prestador' });
    }
    
    // Eliminar completamente el prestador
    // Esto activa el middleware pre('deleteOne') que eliminaá todos los registros relacionados
    console.log(`Eliminando completamente el prestador con ID: ${prestador._id}`);
    await prestador.deleteOne();
    
    res.json({ message: 'Prestador y todos sus datos relacionados eliminados correctamente' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error al eliminar el prestador' });
  }
});

// ver perfil de prestador por ID de usuario
router.get('/usuario/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.log('Se intentó buscar un prestador con ID de usuario inválido:', userId);
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }
    
    console.log('Buscando prestador para el usuario con ID:', userId);
    
    // Intentar encontrar el prestador relacionado al usuario
    const prestador = await Prestador.findOne({ usuario: userId });
    
    if (!prestador) {
      console.log('No se encontró ningún prestador para el usuario:', userId);
      return res.status(404).json({ message: 'No se encontró el perfil de prestador' });
    }
    
    console.log('Prestador encontrado:', prestador._id);
    res.json(prestador);
  } catch (error) {
    console.log('Error al buscar prestador por ID de usuario:', error.message);
    res.status(500).json({ message: 'Error al obtener el prestador' });
  }
});

// Obtener servicios del prestador
router.get('/:prestadorId/servicios', async (req, res) => {
  try {
    const { prestadorId } = req.params;
    console.log('Obteniendo servicios para prestador ID:', prestadorId);
    
    // Importar el modelo Servicio
    const Servicio = (await import('../models/Servicio.js')).default;
    
    // Verificar que el prestador existe
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      console.log('Prestador no encontrado:', prestadorId);
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    console.log('Prestador encontrado:', prestador._id);
    
    // Obtener los servicios del prestador
    const servicios = await Servicio.find({ 
      prestadorId: prestadorId,
      activo: true
    });
    
    console.log(`Se encontraron ${servicios.length} servicios para el prestador`);
    res.json(servicios);
  } catch (error) {
    console.log('Error al obtener servicios del prestador:', error.message);
    res.status(500).json({ message: 'Error al obtener los servicios del prestador' });
  }
});

// Añadir servicio al prestador
router.post('/:prestadorId/servicios', protectRoute, async (req, res) => {
  try {
    const { prestadorId } = req.params;
    console.log('Añadiendo servicio para prestador ID:', prestadorId);
    
    // Verificar que el prestador existe
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    // Verificar que el usuario autenticado sea el dueño del perfil
    console.log('ID usuario del prestador:', prestador.usuario.toString());
    console.log('ID usuario autenticado:', req.user._id.toString());
    
    // Comparar los IDs como strings para evitar problemas de tipo
    const prestadorUserId = prestador.usuario.toString();
    const authUserId = req.user._id.toString();
    
    if (prestadorUserId !== authUserId) {
      console.log('Error de permisos: El usuario no es el dueño del perfil ni un admin');
      return res.status(403).json({ message: 'No tienes permiso para añadir servicios a este prestador' });
    }
    
    // Si se proporciona un servicioId, significa que se está añadiendo un servicio existente
    if (req.body.servicioId) {
      console.log('Añadiendo servicio existente:', req.body.servicioId);
      
      // Buscar el servicio en el catálogo
      const servicioCatalogo = await Servicio.findById(req.body.servicioId);
      if (!servicioCatalogo) {
        return res.status(404).json({ message: 'Servicio no encontrado en el catálogo' });
      }
      
      // Crear una copia personalizada del servicio para este prestador con nombre único
      // Agregando un sufijo único al nombre para evitar duplicados con el índice existente
      const nombreUnico = `${servicioCatalogo.nombre} (${prestadorId.substring(0, 6)})`;
      
      const servicioNuevo = new Servicio({
        nombre: nombreUnico,
        descripcion: servicioCatalogo.descripcion,
        icono: servicioCatalogo.icono,
        color: servicioCatalogo.color,
        precio: req.body.precio || servicioCatalogo.precio,
        duracion: req.body.duracion || servicioCatalogo.duracion,
        categoria: servicioCatalogo.categoria,
        tipoPrestador: prestador.tipo,
        disponibleParaTipos: req.body.disponibleParaTipos || servicioCatalogo.disponibleParaTipos,
        prestadorId: prestadorId,
        activo: true,
        esServicioPredefinido: false
      });
      
      // Guardar el nuevo servicio personalizado
      const servicioGuardado = await servicioNuevo.save();
      console.log('Servicio añadido correctamente:', servicioGuardado._id);
      
      res.status(201).json(servicioGuardado);
    } 
    // Si no hay servicioId, se está creando un servicio completamente nuevo
    else {
      console.log('Creando nuevo servicio personalizado');
      const { nombre, descripcion, precio, duracion, categoria, disponibleParaTipos, icono, color } = req.body;
      
      // Validar campos obligatorios
      if (!nombre || !descripcion) {
        return res.status(400).json({ message: 'El nombre y la descripción son obligatorios' });
      }
      
      // Crear el nuevo servicio
      const servicioNuevo = new Servicio({
        nombre,
        descripcion,
        icono: icono || 'medkit-outline',
        color: color || '#1E88E5',
        precio: precio || 0,
        duracion: duracion || 30,
        categoria: categoria || 'Otros',
        tipoPrestador: prestador.tipo,
        disponibleParaTipos: disponibleParaTipos || ['Perro', 'Gato'],
        prestadorId: prestadorId,
        activo: true,
        esServicioPredefinido: false
      });
      
      // Guardar el nuevo servicio
      const servicioGuardado = await servicioNuevo.save();
      console.log('Servicio personalizado creado correctamente:', servicioGuardado._id);
      
      res.status(201).json(servicioGuardado);
    }
  } catch (error) {
    console.log('Error al añadir servicio al prestador:', error);
    
    // Manejar errores específicos
    if (error.code === 11000) {
      // Error de clave duplicada
      return res.status(400).json({ 
        message: 'Ya existe un servicio con ese nombre asociado a este prestador'
      });
    }
    
    // Otros errores
    res.status(500).json({ 
      message: 'Error al añadir servicio al prestador',
      error: error.message 
    });
  }
});

// Actualizar un servicio del prestador
router.put('/:prestadorId/servicios/:servicioId', protectRoute, async (req, res) => {
  try {
    const { prestadorId, servicioId } = req.params;
    
    // Verificar que el prestador existe
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    // Verificar que el usuario autenticado sea el dueño del perfil o un administrador
    if (prestador.usuario.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No tienes permiso para modificar servicios de este prestador' });
    }
    
    // Buscar el servicio
    const servicio = await Servicio.findOne({ _id: servicioId, prestadorId: prestadorId });
    if (!servicio) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    
    // Actualizar los campos permitidos
    const { nombre, descripcion, precio, duracion, disponibleParaTipos, activo } = req.body;
    
    if (nombre) servicio.nombre = nombre;
    if (descripcion) servicio.descripcion = descripcion;
    if (precio !== undefined) servicio.precio = precio;
    if (duracion) servicio.duracion = duracion;
    if (disponibleParaTipos) servicio.disponibleParaTipos = disponibleParaTipos;
    if (activo !== undefined) servicio.activo = activo;
    
    // Guardar los cambios
    const servicioActualizado = await servicio.save();
    
    res.json(servicioActualizado);
  } catch (error) {
    console.log('Error al actualizar servicio:', error.message);
    res.status(500).json({ message: 'Error al actualizar el servicio' });
  }
});

// Eliminar servicio del prestador (desactivar)
router.delete('/:prestadorId/servicios/:servicioId', protectRoute, async (req, res) => {
  try {
    const { prestadorId, servicioId } = req.params;
    
    // Verificar que el prestador existe
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      return res.status(404).json({ message: 'Prestador no encontrado' });
    }
    
    // Verificar que el usuario autenticado sea el dueño del perfil o un administrador
    if (prestador.usuario.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No tienes permiso para eliminar servicios de este prestador' });
    }
    
    // Buscar el servicio
    const servicio = await Servicio.findOne({ _id: servicioId, prestadorId: prestadorId });
    if (!servicio) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    
    // En lugar de eliminar, desactivamos el servicio
    servicio.activo = false;
    await servicio.save();
    
    res.json({ message: 'Servicio eliminado correctamente' });
  } catch (error) {
    console.log('Error al eliminar servicio:', error.message);
    res.status(500).json({ message: 'Error al eliminar el servicio' });
  }
});

export default router;
