import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const router = express.Router();

const generateToken = (userId) => {
    return jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn: "15d"});
}
// ruta de registro
router.post("/register", async (req,res)=>{
    try {
        const {email, username, password, confirmPassword} = req.body;
        if(!email || !username || !password || !confirmPassword){
            return res.status(400).json({message: "Todos los campos son obligatorios"});
        }
        if(password.length < 6){
            return res.status(400).json({message: "La contraseña debe tener al menos 6 caracteres"});
        }
        if(password !== confirmPassword){
            return res.status(400).json({message: "Las contraseñas no coinciden"});
        }
        if(username.length < 3){
            return res.status(400).json({message: "El nombre de usuario debe tener al menos 3 caracteres"});
        }
        
        const existingEmail = await User.findOne({email});
        if(existingEmail){
            return res.status(400).json({message: "El correo ya esta registrado"});
        }
        const existingUsername = await User.findOne({username});
        if(existingUsername){
            return res.status(400).json({message: "El nombre de usuario ya esta registrado"});
        }
        //get random profile picture
        const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        const newUser = new User({
            email, 
            username, 
            password, 
            profilePicture,
            confirmPassword: password // Opcional: puedes poner esto para pasar validación
        });
        await newUser.save();
        const token = generateToken(newUser._id);
        res.status(201).json({token, user: {id: newUser._id, email: newUser.email, username: newUser.username, profilePicture: newUser.profilePicture}});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Error al registrar el usuario"});
    }
});
// ruta de login
router.post("/login", async (req,res)=>{
    try {
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({message: "Todos los campos son obligatorios"});
        }
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({message: "El correo no esta registrado"});
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(400).json({message: "Contraseña incorrecta"});
        }
        const token = generateToken(user._id);
        res.status(200).json({token, user: {id: user._id, email: user.email, username: user.username, profilePicture: user.profilePicture}});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Error al iniciar sesión"});
    }
});

export default router;
