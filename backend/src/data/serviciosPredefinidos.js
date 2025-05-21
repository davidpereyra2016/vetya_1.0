/**
 * Catálogo de servicios predefinidos para cada tipo de prestador
 * Estos servicios serán utilizados como base para que los prestadores configuren sus servicios
 */

// Servicios para veterinarios
const serviciosVeterinario = [
  {
    nombre: 'Consulta general',
    descripcion: 'Evaluación general del estado de salud de la mascota',
    categoria: 'Consulta general',
    precio: 35,
    duracion: 30,
    icono: 'medkit-outline',
    color: '#1E88E5',
    disponibleParaTipos: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Otro']
  },
  {
    nombre: 'Vacunación',
    descripcion: 'Aplicación de vacunas según el calendario de vacunación',
    categoria: 'Vacunación',
    precio: 25,
    duracion: 15,
    icono: 'fitness-outline',
    color: '#4CAF50',
    disponibleParaTipos: ['Perro', 'Gato']
  },
  {
    nombre: 'Desparasitación',
    descripcion: 'Tratamiento para eliminar parásitos internos y externos',
    categoria: 'Desparasitación',
    precio: 20,
    duracion: 20,
    icono: 'bug-outline',
    color: '#FF9800',
    disponibleParaTipos: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Otro']
  },
  {
    nombre: 'Análisis clínicos',
    descripcion: 'Análisis de sangre, orina y otros fluidos corporales',
    categoria: 'Análisis clínicos',
    precio: 45,
    duracion: 30,
    icono: 'flask-outline',
    color: '#9C27B0',
    disponibleParaTipos: ['Perro', 'Gato']
  },
  {
    nombre: 'Cirugía',
    descripcion: 'Procedimientos quirúrgicos menores',
    categoria: 'Cirugía',
    precio: 150,
    duracion: 120,
    icono: 'cut-outline',
    color: '#F44336',
    disponibleParaTipos: ['Perro', 'Gato']
  }
];

// Servicios para centros veterinarios
const serviciosCentroVeterinario = [
  {
    nombre: 'Consulta especializada',
    descripcion: 'Atención por especialistas según la necesidad de la mascota',
    categoria: 'Consulta especializada',
    precio: 60,
    duracion: 45,
    icono: 'medkit-outline',
    color: '#1E88E5',
    disponibleParaTipos: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Otro']
  },
  {
    nombre: 'Radiografía',
    descripcion: 'Estudio por imágenes para diagnóstico',
    categoria: 'Radiografía',
    precio: 80,
    duracion: 30,
    icono: 'scan-outline',
    color: '#607D8B',
    disponibleParaTipos: ['Perro', 'Gato']
  },
  {
    nombre: 'Ecografía',
    descripcion: 'Estudio por ultrasonido para diagnóstico',
    categoria: 'Ecografía',
    precio: 90,
    duracion: 40,
    icono: 'pulse-outline',
    color: '#3F51B5',
    disponibleParaTipos: ['Perro', 'Gato']
  },
  {
    nombre: 'Internación',
    descripcion: 'Cuidados intensivos con monitoreo constante',
    categoria: 'Internación',
    precio: 200,
    duracion: 1440, // 24 horas
    icono: 'bed-outline',
    color: '#F44336',
    disponibleParaTipos: ['Perro', 'Gato']
  },
  {
    nombre: 'Consulta general',
    descripcion: 'Evaluación general del estado de salud de la mascota',
    categoria: 'Consulta general',
    precio: 35,
    duracion: 30,
    icono: 'medkit-outline',
    color: '#1E88E5',
    disponibleParaTipos: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Otro']
  },
  {
    nombre: 'Vacunación',
    descripcion: 'Aplicación de vacunas según el calendario de vacunación',
    categoria: 'Vacunación',
    precio: 25,
    duracion: 15,
    icono: 'fitness-outline',
    color: '#4CAF50',
    disponibleParaTipos: ['Perro', 'Gato']
  },
  {
    nombre: 'Desparasitación',
    descripcion: 'Tratamiento para eliminar parásitos internos y externos',
    categoria: 'Desparasitación',
    precio: 20,
    duracion: 20,
    icono: 'bug-outline',
    color: '#FF9800',
    disponibleParaTipos: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Otro']
  },
  {
    nombre: 'Análisis clínicos',
    descripcion: 'Análisis de sangre, orina y otros fluidos corporales',
    categoria: 'Análisis clínicos',
    precio: 45,
    duracion: 30,
    icono: 'flask-outline',
    color: '#9C27B0',
    disponibleParaTipos: ['Perro', 'Gato']
  },
  {
    nombre: 'Cirugía',
    descripcion: 'Procedimientos quirúrgicos menores',
    categoria: 'Cirugía',
    precio: 150,
    duracion: 120,
    icono: 'cut-outline',
    color: '#F44336',
    disponibleParaTipos: ['Perro', 'Gato']
  },
  {
    nombre: 'Farmacia veterinaria',
    descripcion: 'Medicamentos y productos veterinarios básicos',
    categoria: 'Farmacia veterinaria',
    precio: 0, // Precio variable
    duracion: 0, // No aplica
    icono: 'bandage-outline',
    color: '#F44336',
    disponibleParaTipos: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Otro']
  },
  {
    nombre: 'Productos de higiene',
    descripcion: 'Champús, cepillos, toallitas y más',
    categoria: 'Productos de higiene',
    precio: 0, // Precio variable
    duracion: 0, // No aplica
    icono: 'water-outline',
    color: '#2196F3',
    disponibleParaTipos: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Otro']
  },
  {
    nombre: 'Suplementos alimenticios',
    descripcion: 'Vitaminas y complementos para la alimentación',
    categoria: 'Suplementos alimenticios',
    precio: 0, // Precio variable
    duracion: 0, // No aplica
    icono: 'flask-outline',
    color: '#00BCD4',
    disponibleParaTipos: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Otro']
  },
  {
    nombre: 'Alimentos premium',
    descripcion: 'Venta de alimentos de alta gama para mascotas',
    categoria: 'Alimentos premium',
    precio: 0, // Precio variable
    duracion: 0, // No aplica
    icono: 'nutrition-outline',
    color: '#4CAF50',
    disponibleParaTipos: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Otro']
  }
];

// Servicios para veterinarias
const serviciosVeterinaria = [
  ...serviciosVeterinario,
  ...serviciosCentroVeterinario
];

// Mapeo de tipos de prestador a sus servicios predefinidos
export const serviciosPorTipo = {
  'Veterinario': serviciosVeterinario,
  'Centro Veterinario': serviciosCentroVeterinario,
  'Veterinaria': serviciosVeterinaria,
  'Otro': serviciosVeterinario
};
