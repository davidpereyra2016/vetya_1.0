// Este archivo es ahora un stub para compatibilidad con el código existente
// Ya no usamos Firebase, sino la API de Expo Notifications directamente

/**
 * Este es un archivo de compatibilidad para mantener referencias existentes a firebase.js
 * Ahora estamos usando directamente la API de Expo Notifications en notificacionesUtils.js
 */
const notificationStub = {
  // Métodos dummy para compatibilidad con código existente
  messaging: () => ({
    send: async () => 'expo-notifications-message-id',
    sendMulticast: async () => ({
      successCount: 0,
      failureCount: 0,
      responses: []
    })
  })
};

// Avisar al iniciar que este es un stub y que las notificaciones ahora usan Expo directamente
console.log('AVISO: Firebase ha sido reemplazado por Expo Notifications API.');
console.log('Las notificaciones ahora se manejan en notificacionesUtils.js');

export default notificationStub;
