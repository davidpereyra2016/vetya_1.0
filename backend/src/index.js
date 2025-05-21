import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import {connectDB} from './lib/db.js';
import router from './routes/index.js';
import cors from 'cors';


const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());

// Configuración de CORS más permisiva para desarrollo
app.use(cors({
  origin: '*',  // Permite cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use("/api", router);
connectDB();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('Para acceder desde dispositivos en la misma red, usa tu IP local');
});
