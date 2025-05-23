import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();

/**
 * Middleware para proteger rutas que requieren autenticación
 * Verifica el token JWT y añade los datos del usuario a req.user
 */
const protectRoute = async(req, res, next) => {
    try {
        // Verificar si existe el encabezado Authorization
        const authHeader = req.header("Authorization");
        if (!authHeader) {
            return res.status(401).json({message: "No se proporcionó un token"});
        }
        
        // Extraer el token
        const token = authHeader.startsWith("Bearer ") ? 
            authHeader.replace("Bearer ", "") : authHeader;
        
        if(!token){
            return res.status(401).json({message: "No se proporcionó un token válido"});
        }
        
        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar al usuario en la base de datos
        const user = await User.findById(decoded.userId).select("-password");
        if(!user){
            return res.status(401).json({message: "Token inválido o usuario no encontrado"});
        }
        
        // Añadir datos del usuario a la solicitud
        req.user = user;
        next();
    } catch (error) {
        console.error('Error de autenticación:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({message: "Token inválido"});
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({message: "Sesión expirada, por favor inicie sesión nuevamente"});
        }
        
        return res.status(401).json({message: "Por favor autentíquese"});
    }
};

/**
 * Middleware para verificar roles de usuario
 * Permite acceso solo a usuarios con los roles especificados
 * @param {Array} roles - Array de roles permitidos (ej: ['client', 'provider', 'admin'])
 * @returns {Function} Middleware
 */
const checkRole = (roles) => {
    return (req, res, next) => {
        // Verificar que existe el usuario (deberia ser añadido por protectRoute)
        if (!req.user) {
            return res.status(401).json({message: "No autorizado"});
        }
        
        // Verificar si el rol del usuario está en la lista de roles permitidos
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Acceso denegado: no tiene los permisos necesarios"
            });
        }
        
        // Si el rol es permitido, continuar
        next();
    };
};

// Exportar middlewares
export { protectRoute, checkRole };
// Exportación predeterminada para compatibilidad con código existente
export default protectRoute;