import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique: true
    },
    username:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true,
        minLength: 6
    },
    profilePicture:{
        type: String,
        default: ""
    },
    // Campo de rol para diferenciar tipos de usuarios
    role: {
        type: String,
        enum: ['client', 'provider', 'admin'],
        default: 'client'
    },
    // Ubicación actual del cliente (para emergencias)
    ubicacionActual: {
        coordinates: {
            lat: Number,
            lng: Number
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true
});
// hashear la contraseña despues de guardar en la base de datos
userSchema.pre("save", async function(next){
    if(!this.isModified("password")){
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare(password, this.password);
}

const User = mongoose.model("User", userSchema);
export default User;
