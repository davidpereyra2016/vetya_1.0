import express from 'express';
import axios from 'axios';

const router = express.Router();

// Middleware para autenticación del panel administrativo
const isAuthenticated = (req, res, next) => {
  // Verificar si el usuario está autenticado como administrador
  // Para propósitos de desarrollo, esto está simplificado
  // En producción, deberías implementar una autenticación adecuada
  const adminToken = req.cookies?.adminToken;
  
  if (!adminToken) {
    return res.redirect('/admin/login');
  }
  
  // Almacenar token para uso en vistas
  res.locals.adminToken = adminToken;
  next();
};

// Rutas para autenticación
router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Usar la API existente para autenticar
    const response = await axios.post(`http://localhost:${process.env.PORT || 3000}/api/auth/login`, {
      email,
      password,
      appType: 'admin' // Especificar que es una autenticación de administrador
    });
    
    // Verificar si el usuario es administrador
    if (response.data.user.role !== 'admin') {
      return res.render('login', { error: 'Acceso denegado. No tienes permisos de administrador.' });
    }
    
    // Establecer cookie de autenticación
    res.cookie('adminToken', response.data.token, { 
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 día
    });
    
    res.redirect('/admin/dashboard');
  } catch (error) {
    res.render('login', { error: 'Credenciales inválidas' });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.redirect('/admin/login');
});

// Ruta principal - Dashboard
router.get('/', isAuthenticated, (req, res) => {
  res.redirect('/admin/dashboard');
});

router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Obtener datos para el dashboard
    const [usuarios, prestadores, mascotas, citas] = await Promise.all([
      axios.get(`http://localhost:${process.env.PORT || 3000}/api/users`, {
        headers: { Authorization: `Bearer ${res.locals.adminToken}` }
      }),
      axios.get(`http://localhost:${process.env.PORT || 3000}/api/prestadores`, {
        headers: { Authorization: `Bearer ${res.locals.adminToken}` }
      }),
      axios.get(`http://localhost:${process.env.PORT || 3000}/api/mascotas`, {
        headers: { Authorization: `Bearer ${res.locals.adminToken}` }
      }),
      axios.get(`http://localhost:${process.env.PORT || 3000}/api/citas`, {
        headers: { Authorization: `Bearer ${res.locals.adminToken}` }
      })
    ]);
    
    res.render('dashboard', {
      contadores: {
        usuarios: usuarios.data.length,
        prestadores: prestadores.data.length,
        mascotas: mascotas.data.length,
        citas: citas.data.length
      }
    });
  } catch (error) {
    res.render('dashboard', { error: 'Error al cargar datos', contadores: {} });
  }
});

// Rutas para gestión de usuarios
router.get('/usuarios', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:${process.env.PORT || 3000}/api/users`, {
      headers: { Authorization: `Bearer ${res.locals.adminToken}` }
    });
    // Temporalmente redireccionamos al dashboard simplificado
    res.render('dashboard', { 
      contadores: { usuarios: response.data.length || 0 },
      mensaje: 'Visualización de usuarios en desarrollo. Se han encontrado ' + response.data.length + ' usuarios en el sistema.'
    });
  } catch (error) {
    res.render('dashboard', { error: 'Error al cargar usuarios', contadores: {} });
  }
});

router.get('/usuarios/:id', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:${process.env.PORT || 3000}/api/users/${req.params.id}`, {
      headers: { Authorization: `Bearer ${res.locals.adminToken}` }
    });
    res.render('usuarios/detalle', { usuario: response.data });
  } catch (error) {
    res.redirect('/admin/usuarios');
  }
});

// Rutas para gestión de prestadores
router.get('/prestadores', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:${process.env.PORT || 3000}/api/prestadores`, {
      headers: { Authorization: `Bearer ${res.locals.adminToken}` }
    });
    // Temporalmente redireccionamos al dashboard simplificado
    res.render('dashboard', { 
      contadores: { prestadores: response.data.length || 0 },
      mensaje: 'Visualización de prestadores en desarrollo. Se han encontrado ' + response.data.length + ' prestadores en el sistema.'
    });
  } catch (error) {
    res.render('dashboard', { error: 'Error al cargar prestadores', contadores: {} });
  }
});

router.get('/prestadores/:id', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:${process.env.PORT || 3000}/api/prestadores/${req.params.id}`, {
      headers: { Authorization: `Bearer ${res.locals.adminToken}` }
    });
    res.render('prestadores/detalle', { prestador: response.data });
  } catch (error) {
    res.redirect('/admin/prestadores');
  }
});

// Rutas para gestión de mascotas
router.get('/mascotas', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:${process.env.PORT || 3000}/api/mascotas`, {
      headers: { Authorization: `Bearer ${res.locals.adminToken}` }
    });
    // Temporalmente redireccionamos al dashboard simplificado
    res.render('dashboard', { 
      contadores: { mascotas: response.data.length || 0 },
      mensaje: 'Visualización de mascotas en desarrollo. Se han encontrado ' + response.data.length + ' mascotas en el sistema.'
    });
  } catch (error) {
    res.render('dashboard', { error: 'Error al cargar mascotas', contadores: {} });
  }
});

// Rutas para gestión de citas
router.get('/citas', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:${process.env.PORT || 3000}/api/citas`, {
      headers: { Authorization: `Bearer ${res.locals.adminToken}` }
    });
    // Temporalmente redireccionamos al dashboard simplificado
    res.render('dashboard', { 
      contadores: { citas: response.data.length || 0 },
      mensaje: 'Visualización de citas en desarrollo. Se han encontrado ' + response.data.length + ' citas en el sistema.'
    });
  } catch (error) {
    res.render('dashboard', { error: 'Error al cargar citas', contadores: {} });
  }
});

// Rutas para gestión de servicios
router.get('/servicios', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:${process.env.PORT || 3000}/api/servicios`, {
      headers: { Authorization: `Bearer ${res.locals.adminToken}` }
    });
    res.render('servicios/index', { servicios: response.data });
  } catch (error) {
    res.render('servicios/index', { error: 'Error al cargar servicios', servicios: [] });
  }
});

// Rutas para gestión de emergencias
router.get('/emergencias', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:${process.env.PORT || 3000}/api/emergencias`, {
      headers: { Authorization: `Bearer ${res.locals.adminToken}` }
    });
    // Temporalmente redireccionamos al dashboard simplificado
    res.render('dashboard', { 
      contadores: { emergencias: response.data.length || 0 },
      mensaje: 'Visualización de emergencias en desarrollo. Se han encontrado ' + response.data.length + ' emergencias en el sistema.'
    });
  } catch (error) {
    res.render('dashboard', { error: 'Error al cargar emergencias', contadores: {} });
  }
});

export default router;
