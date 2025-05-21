import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();

const protectRoute = async(req,res,next)=>{
    try {
        const token = req.header("Authorization").replace("Bearer ","");
        if(!token){
            return res.status(401).json({message: "No se proporciono un token"});
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decodificado:', decoded);
        console.log('ID de usuario desde token:', decoded.userId);
        
        const user = await User.findById(decoded.userId).select("-password");
        if(!user){
            return res.status(401).json({message: "token invalido"});
        }
        req.user = user;
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({message: "Por favor autentíquese"});
    }
}

export default protectRoute;