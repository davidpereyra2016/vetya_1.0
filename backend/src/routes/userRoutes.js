import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/';
        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

const router = express.Router();

// Middleware para verificar el token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No autorizado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = decoded; // Aquí decoded contiene la información del usuario (el ID)
        next();
    });
};

// Obtener perfil del usuario
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        // Asegúrate de que estamos usando correctamente el ID del token decodificado
        console.log('Token decodificado:', req.user);
        const userId = req.user.userId; // El token contiene { userId } no { id }
        console.log('ID de usuario desde token:', userId);
        
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Actualizar información de perfil
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        // Extraer solo los campos que son enviados para actualizar
        const updateData = {};
        
        if (req.body.username) updateData.username = req.body.username;
        if (req.body.email) updateData.email = req.body.email;
        if (req.body.profilePicture) updateData.profilePicture = req.body.profilePicture;
        
        console.log('Datos a actualizar:', updateData);
        const userId = req.user.userId; // El token contiene { userId } no { id }
        console.log('ID de usuario a actualizar:', userId);
        
        // Verificar si estamos actualizando el email y si ya está en uso
        if (updateData.email) {
            const existingEmail = await User.findOne({ 
                email: updateData.email, 
                _id: { $ne: userId } 
            });
            
            if (existingEmail) {
                return res.status(400).json({ message: 'El correo ya está registrado' });
            }
        }
        
        // Verificar si estamos actualizando el username y si ya está en uso
        if (updateData.username) {
            const existingUsername = await User.findOne({ 
                username: updateData.username, 
                _id: { $ne: userId } 
            });
            
            if (existingUsername) {
                return res.status(400).json({ message: 'El nombre de usuario ya está registrado' });
            }
        }
        
        // Actualizar solo los campos que se enviaron en la solicitud
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        ).select('-password');
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        console.log('Usuario actualizado correctamente:', updatedUser);
        res.json(updatedUser);
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Cambiar contraseña
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Validar la nueva contraseña
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }
        
        const userId = req.user.userId; // El token contiene { userId } no { id }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        // Verificar la contraseña actual
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
        }
        
        // Actualizar la contraseña
        user.password = newPassword;
        await user.save();
        
        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Subir imagen de perfil
router.post('/profile-picture', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha proporcionado ninguna imagen' });
        }
        
        // Subir imagen a Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'profile_pictures',
            transformation: [
                { width: 500, height: 500, crop: 'limit' }
            ]
        });
        
        // Actualizar la URL de la imagen en el usuario
        const userId = req.user.userId; // El token contiene { userId } no { id }
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profilePicture: result.secure_url },
            { new: true }
        ).select('-password');
        
        res.json(updatedUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al subir la imagen' });
    }
});

export default router;
