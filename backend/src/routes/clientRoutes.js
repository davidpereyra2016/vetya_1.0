import express from "express";
import User from "../models/User.js";
import { protectRoute, checkRole } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Endpoint para actualizar la ubicación del cliente
 * Requiere autenticación y rol de cliente
 */
router.patch('/:id/ubicacion', protectRoute, checkRole(['client']), async (req, res) => {
  try {
    const clientId = req.params.id;
    const { lat, lng } = req.body;
    
    // Verificar que sea el propio usuario
    if (req.user.id.toString() !== clientId) {
      return res.status(403).json({ message: 'No autorizado para actualizar este usuario' });
    }
    
    // Validar coordenadas
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: 'Coordenadas inválidas' });
    }
    
    // Actualizar ubicación
    const updatedUser = await User.findByIdAndUpdate(
      clientId,
      {
        ubicacionActual: {
          coordinates: { lat, lng },
          lastUpdated: new Date()
        }
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Ubicación actualizada con éxito',
      data: {
        ubicacion: updatedUser.ubicacionActual
      }
    });
  } catch (error) {
    console.error('Error al actualizar ubicación:', error);
    res.status(500).json({ message: 'Error al actualizar la ubicación' });
  }
});

/**
 * Obtener la ubicación actual del cliente
 */
router.get('/:id/ubicacion', protectRoute, async (req, res) => {
  try {
    const clientId = req.params.id;
    
    // Verificar permisos (solo el propio usuario o un prestador pueden ver la ubicación)
    if (req.user.id.toString() !== clientId && req.user.role !== 'provider') {
      return res.status(403).json({ message: 'No autorizado para ver esta ubicación' });
    }
    
    const user = await User.findById(clientId).select('ubicacionActual');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    if (!user.ubicacionActual || !user.ubicacionActual.coordinates) {
      return res.status(404).json({ message: 'El usuario no tiene ubicación registrada' });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ubicacion: user.ubicacionActual
      }
    });
  } catch (error) {
    console.error('Error al obtener ubicación:', error);
    res.status(500).json({ message: 'Error al obtener la ubicación' });
  }
});

export default router;
