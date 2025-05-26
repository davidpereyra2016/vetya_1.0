import express from "express";
import User from "../models/User.js";
import Prestador from "../models/Prestador.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const router = express.Router();

/**
 * Genera un token JWT para un usuario
 * @param {string} userId - ID del usuario
 * @returns {string} Token JWT
 */
const generateToken = (userId) => {
    return jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn: "15d"});
};

/**
 * Ruta para registrar clientes
 * Solo crea usuarios con role="client"
 */
router.post("/register/client", async (req, res) => {
    try {
        const {email, username, password, confirmPassword} = req.body;
        
        // Validaciones básicas
        if(!email || !username || !password || !confirmPassword){
            return res.status(400).json({message: "Todos los campos son obligatorios"});
        }
        if(password.length < 6){
            return res.status(400).json({message: "La contraseña debe tener al menos 6 caracteres"});
        }
        if(password !== confirmPassword){
            return res.status(400).json({message: "Las contraseñas no coinciden"});
        }
        if(username.length < 3){
            return res.status(400).json({message: "El nombre de usuario debe tener al menos 3 caracteres"});
        }
        
        // Verificar email y username únicos
        const existingEmail = await User.findOne({email});
        if(existingEmail){
            return res.status(400).json({message: "El correo ya está registrado"});
        }
        const existingUsername = await User.findOne({username});
        if(existingUsername){
            return res.status(400).json({message: "El nombre de usuario ya está registrado"});
        }
        
        // Crear foto de perfil aleatoria
        const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        
        // Crear usuario con role=client
        const newUser = new User({
            email, 
            username, 
            password, 
            profilePicture,
            role: 'client' // Asignar rol de cliente
        });
        
        await newUser.save();
        
        // Generar token y responder
        const token = generateToken(newUser._id);
        res.status(201).json({
            token, 
            user: {
                id: newUser._id, 
                email: newUser.email, 
                username: newUser.username, 
                profilePicture: newUser.profilePicture,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error("Error en registro de cliente:", error);
        res.status(500).json({message: "Error al registrar el usuario"});
    }
});

/**
 * Ruta para registrar prestadores de servicios
 * Crea usuario con role="provider" y su documento asociado en la colección Prestador
 */
router.post("/register/provider", async (req, res) => {
    try {
        const {
            email, 
            username, 
            password, 
            confirmPassword, 
            nombre,
            especialidad,
            telefono
        } = req.body;
        
        // Validaciones básicas
        if(!email || !username || !password || !confirmPassword || !nombre || !especialidad){
            return res.status(400).json({message: "Todos los campos son obligatorios"});
        }
        if(password.length < 6){
            return res.status(400).json({message: "La contraseña debe tener al menos 6 caracteres"});
        }
        if(password !== confirmPassword){
            return res.status(400).json({message: "Las contraseñas no coinciden"});
        }
        if(username.length < 3){
            return res.status(400).json({message: "El nombre de usuario debe tener al menos 3 caracteres"});
        }
        
        // Verificar email y username únicos
        const existingEmail = await User.findOne({email});
        if(existingEmail){
            return res.status(400).json({message: "El correo ya está registrado"});
        }
        const existingUsername = await User.findOne({username});
        if(existingUsername){
            return res.status(400).json({message: "El nombre de usuario ya está registrado"});
        }
        
        // Crear foto de perfil aleatoria
        const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        
        // Crear usuario con role=provider
        const newUser = new User({
            email, 
            username, 
            password, 
            profilePicture,
            role: 'provider' // Asignar rol de prestador
        });
        
        await newUser.save();
        
        // Crear prestador asociado
        const newPrestador = new Prestador({
            usuario: newUser._id,
            nombre,
            especialidad,
            telefono,
            email,
            disponibleEmergencias: false, // Por defecto no disponible para emergencias
            activo: true
        });
        
        await newPrestador.save();
        
        // Generar token y responder
        const token = generateToken(newUser._id);
        res.status(201).json({
            token, 
            user: {
                id: newUser._id, 
                email: newUser.email, 
                username: newUser.username, 
                profilePicture: newUser.profilePicture,
                role: newUser.role
            },
            prestador: {
                id: newPrestador._id,
                nombre: newPrestador.nombre,
                especialidad: newPrestador.especialidad
            }
        });
    } catch (error) {
        console.error("Error en registro de prestador:", error);
        res.status(500).json({message: "Error al registrar el prestador"});
    }
});

/**
 * Mantener la ruta original para compatibilidad, pero registrando como cliente
 */
router.post("/register", async (req, res) => {
    try {
        const {email, username, password, confirmPassword} = req.body;
        
        // Validaciones básicas
        if(!email || !username || !password || !confirmPassword){
            return res.status(400).json({message: "Todos los campos son obligatorios"});
        }
        if(password.length < 6){
            return res.status(400).json({message: "La contraseña debe tener al menos 6 caracteres"});
        }
        if(password !== confirmPassword){
            return res.status(400).json({message: "Las contraseñas no coinciden"});
        }
        if(username.length < 3){
            return res.status(400).json({message: "El nombre de usuario debe tener al menos 3 caracteres"});
        }
        
        // Verificar email y username únicos
        const existingEmail = await User.findOne({email});
        if(existingEmail){
            return res.status(400).json({message: "El correo ya está registrado"});
        }
        const existingUsername = await User.findOne({username});
        if(existingUsername){
            return res.status(400).json({message: "El nombre de usuario ya está registrado"});
        }
        
        // Crear foto de perfil aleatoria
        const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        
        // Crear usuario con role=client por defecto
        const newUser = new User({
            email, 
            username, 
            password, 
            profilePicture,
            role: 'client' // Por defecto, es un cliente
        });
        
        await newUser.save();
        
        // Generar token y responder
        const token = generateToken(newUser._id);
        res.status(201).json({
            token, 
            user: {
                id: newUser._id, 
                email: newUser.email, 
                username: newUser.username, 
                profilePicture: newUser.profilePicture,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({message: "Error al registrar el usuario"});
    }
});

/**
 * Ruta de login compartida que verifica el tipo de aplicación
 * y asegura que solo los usuarios del rol correcto puedan iniciar sesión
 */
router.post("/login", async (req, res) => {
    try {
        const {email, password, appType} = req.body;
        
        // Validar campos obligatorios
        if(!email || !password){
            return res.status(400).json({message: "Email y contraseña son obligatorios"});
        }
        
        // Añadir validación de appType - solo es necesario para aplicaciones cliente y proveedor
        // Para el panel admin no se requiere appType
        if(appType && !['client', 'provider', 'admin'].includes(appType)){
            return res.status(400).json({message: "Tipo de aplicación inválido"});
        }
        
        // Buscar usuario por email
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({message: "Credenciales inválidas"});
        }
        
        // Verificar contraseña
        const isMatch = await user.comparePassword(password);
        if(!isMatch){
            return res.status(400).json({message: "Credenciales inválidas"});
        }
        
        // Verificar que el rol del usuario coincida con el tipo de aplicación
        // Esta es la clave para prevenir acceso no autorizado entre apps
        // Pero permitimos acceso a administradores desde el panel admin
        if (appType && 
            ((appType === 'client' && user.role !== 'client') || 
             (appType === 'provider' && user.role !== 'provider') ||
             (appType === 'admin' && user.role !== 'admin'))) {
            return res.status(403).json({
                message: `No tiene permiso para acceder como ${appType === 'client' ? 'cliente' : (appType === 'provider' ? 'prestador' : 'administrador')}`
            });
        }
        
        // Si todo está correcto, generar token
        const token = generateToken(user._id);
        
        // Datos básicos de usuario para la respuesta
        const userData = {
            id: user._id, 
            email: user.email, 
            username: user.username, 
            profilePicture: user.profilePicture,
            role: user.role
        };
        
        // Si es un prestador, obtener datos adicionales
        if (user.role === 'provider') {
            const prestador = await Prestador.findOne({ usuario: user._id });
            if (prestador) {
                return res.status(200).json({
                    token, 
                    user: userData,
                    prestador: {
                        id: prestador._id,
                        nombre: prestador.nombre,
                        especialidad: prestador.especialidad,
                        disponibleEmergencias: prestador.disponibleEmergencias
                    }
                });
            }
        }
        
        // Respuesta para clientes o si no se encuentra el prestador
        res.status(200).json({ token, user: userData });
        
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({message: "Error al iniciar sesión"});
    }
});

export default router;
