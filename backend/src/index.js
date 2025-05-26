import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import {connectDB} from './lib/db.js';
import router from './routes/index.js';
import cors from 'cors';
import adminRouter from './admin/index.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuración de CORS más permisiva para desarrollo
app.use(cors({
  origin: '*',  // Permite cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configurar vistas EJS para el panel administrativo
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'admin/views'));

// Rutas API
app.use("/api", router);

// Ruta para el panel administrativo
app.use("/admin", adminRouter);

// Conectar a la base de datos
connectDB();

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Panel administrativo disponible en http://localhost:${PORT}/admin`);
    console.log('Para acceder desde dispositivos en la misma red, usa tu IP local');
});
