// Scripts para el panel administrativo

// Función para inicializar componentes cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar tooltips de Bootstrap
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
  
  // Inicializar datepickers
  const datepickers = document.querySelectorAll('.datepicker');
  if (datepickers.length > 0) {
    datepickers.forEach(datepicker => {
      // Aquí se podría inicializar un datepicker si se importa una biblioteca específica
    });
  }
  
  // Configurar el comportamiento del menú en dispositivos móviles
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function() {
      document.querySelector('.sidebar').classList.toggle('show');
    });
  }
  
  // Manejo de notificaciones
  const notifications = document.querySelectorAll('.notification-dismiss');
  if (notifications.length > 0) {
    notifications.forEach(notification => {
      notification.addEventListener('click', function() {
        this.closest('.alert').remove();
      });
    });
  }
  
  // Auto-cerrar alertas después de 5 segundos
  setTimeout(function() {
    const alerts = document.querySelectorAll('.alert-auto-dismiss');
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        const bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
      });
    }
  }, 5000);
  
  // Inicializar tablas DataTable si existe la biblioteca
  if (typeof $.fn.DataTable !== 'undefined') {
    $('#dataTable').DataTable({
      language: {
        url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json'
      }
    });
  }
});

// Funciones de utilidad para el panel administrativo

// Función para mostrar un mensaje de éxito
function mostrarExito(mensaje) {
  const alertaHtml = `
    <div class="alert alert-success alert-dismissible fade show alert-auto-dismiss" role="alert">
      <i class="fas fa-check-circle me-2"></i> ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  
  document.querySelector('.alerts-container').innerHTML += alertaHtml;
}

// Función para mostrar un mensaje de error
function mostrarError(mensaje) {
  const alertaHtml = `
    <div class="alert alert-danger alert-dismissible fade show alert-auto-dismiss" role="alert">
      <i class="fas fa-times-circle me-2"></i> ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  
  document.querySelector('.alerts-container').innerHTML += alertaHtml;
}

// Función para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return 'N/A';
  
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(fecha).toLocaleDateString('es-ES', options);
}

// Función para confirmar acciones destructivas
function confirmarAccion(mensaje, callback) {
  if (confirm(mensaje)) {
    callback();
  }
}

// Función para obtener el token desde cookies
function obtenerToken() {
  return document.cookie.replace(/(?:(?:^|.*;\s*)adminToken\s*\=\s*([^;]*).*$)|^.*$/, "$1");
}

// Función para realizar solicitudes a la API
async function apiRequest(url, method = 'GET', data = null) {
  try {
    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${obtenerToken()}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    mostrarError(`Error en la solicitud: ${error.message}`);
    throw error;
  }
}
