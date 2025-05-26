import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar rutas del panel administrativo
import adminRoutes from './routes/index.js';

const router = express.Router();

// Configurar middleware para archivos estáticos
router.use(express.static(path.join(__dirname, 'public')));

// Nota: La configuración del motor de plantillas se realiza en el archivo principal index.js
// No en el router, ya que router.set no es una función válida

// Usar las rutas del panel administrativo
router.use('/', adminRoutes);

export default router;
