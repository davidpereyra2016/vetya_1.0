import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configuración del entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Definición del esquema de usuario (simplificado para el script)
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minLength: 6
    },
    profilePicture: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ['client', 'provider', 'admin'],
        default: 'client'
    },
    ubicacionActual: {
        coordinates: {
            lat: Number,
            lng: Number
        },
        direccion: String
    },
    telefono: String,
    fechaRegistro: {
        type: Date,
        default: Date.now
    }
});

// Método para encriptar la contraseña antes de guardar
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Crear el modelo
const User = mongoose.model('User', userSchema);

// Función principal para crear un administrador
async function createAdmin() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Conectado a MongoDB');

        // Datos del administrador
        const adminData = {
            username: 'admin',
            email: 'admin@vetya.com',
            password: 'admin123',
            role: 'admin',
            profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            telefono: '+1234567890'
        };

        // Verificar si ya existe un admin con ese email
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('Ya existe un administrador con este correo electrónico.');
            await mongoose.disconnect();
            return;
        }

        // Crear el usuario administrador
        const admin = new User(adminData);
        await admin.save();
        
        console.log('✅ Administrador creado exitosamente:');
        console.log('- Email: admin@vetya.com');
        console.log('- Contraseña: admin123');
        console.log('- Rol: admin');
        console.log('\nPuede iniciar sesión en el panel administrativo con estas credenciales.');
        
        // Desconectar de MongoDB
        await mongoose.disconnect();
        console.log('Desconectado de MongoDB');
    } catch (error) {
        console.error('Error al crear el administrador:', error);
    }
}

// Ejecutar la función
createAdmin();
