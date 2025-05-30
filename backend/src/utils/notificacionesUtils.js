import axios from 'axios';

// URL de la API de Expo para enviar notificaciones push
const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Envía una notificación push a un dispositivo específico usando la API de Expo
 * @param {String} token Token del dispositivo al que enviar la notificación
 * @param {String} titulo Título de la notificación
 * @param {String} cuerpo Cuerpo de la notificación
 * @param {Object} datos Datos adicionales para la notificación (opcional)
 * @returns {Promise} Promesa con el resultado del envío
 */

export const enviarNotificacionPush = async (token, titulo, cuerpo, datos = {}) => {
  try {
    if (!token) {
      console.log('No se proporcionó token para la notificación push');
      return { success: false, error: 'Token no proporcionado' };
    }

    // Validar que el token sea un Expo Push Token
    if (!token.includes('ExponentPushToken[') && !token.includes('ExpoPushToken[')) {
      console.log('Token no válido, debe ser un Expo Push Token');
      return { success: false, error: 'Token no válido' };
    }

    // Mensaje en formato compatible con la API de Expo Push Notifications
    const mensaje = {
      to: token,
      sound: 'default',
      title: titulo,
      body: cuerpo,
      data: datos,
      badge: 1,
      channelId: 'default',
    };

    // Enviar mensaje usando la API de Expo
    const respuesta = await axios.post(EXPO_PUSH_API_URL, mensaje, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    if (respuesta.data.data && respuesta.data.data.length > 0) {
      // Verificar si hay errores en la respuesta
      if (respuesta.data.data[0].status === 'error') {
        console.error('Error al enviar notificación push:', respuesta.data.data[0].message);
        return { success: false, error: respuesta.data.data[0].message };
      }
      
      console.log('Notificación push enviada exitosamente:', respuesta.data);
      return { success: true, id: respuesta.data.data[0].id };
    }

    return { success: true, data: respuesta.data };
  } catch (error) {
    console.error('Error al enviar notificación push:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

/**
 * Envía notificaciones push a múltiples dispositivos usando la API de Expo
 * @param {Array} tokens Array de tokens de dispositivos
 * @param {String} titulo Título de la notificación
 * @param {String} cuerpo Cuerpo de la notificación
 * @param {Object} datos Datos adicionales para la notificación (opcional)
 * @returns {Promise} Promesa con el resultado del envío
 */
export const enviarNotificacionMultiple = async (tokens, titulo, cuerpo, datos = {}) => {
  try {
    if (!tokens || !tokens.length) {
      console.log('No se proporcionaron tokens para las notificaciones push');
      return { success: false, error: 'Tokens no proporcionados' };
    }

    // Filtrar tokens inválidos
    const tokensValidos = tokens.filter(token => 
      token.includes('ExponentPushToken[') || token.includes('ExpoPushToken['));

    if (tokensValidos.length === 0) {
      console.log('Ninguno de los tokens proporcionados es válido');
      return { success: false, error: 'Tokens no válidos' };
    }

    // Crear mensajes para cada token en formato compatible con la API de Expo
    const mensajes = tokensValidos.map(token => ({
      to: token,
      sound: 'default',
      title: titulo,
      body: cuerpo,
      data: datos,
      badge: 1,
      channelId: 'default',
    }));

    // Enviar mensajes usando la API de Expo
    const respuesta = await axios.post(EXPO_PUSH_API_URL, mensajes, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    // Procesar resultados
    const resultados = respuesta.data.data || [];
    const exitosos = resultados.filter(r => r.status === 'ok').length;
    const fallidos = resultados.filter(r => r.status === 'error').length;

    console.log(`Notificaciones push enviadas: ${exitosos} exitosas, ${fallidos} fallidas`);
    
    return { 
      success: true, 
      successCount: exitosos,
      failureCount: fallidos,
      results: resultados
    };
  } catch (error) {
    console.error('Error al enviar notificaciones push múltiples:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

/**
 * Verifica si un token es válido para Expo Push Notifications
 * @param {String} token Token a verificar
 * @returns {Boolean} true si el token es válido, false en caso contrario
 */
export const esTokenValido = (token) => {
  if (!token) return false;
  return token.includes('ExponentPushToken[') || token.includes('ExpoPushToken[');
};

export default {
  enviarNotificacionPush,
  enviarNotificacionMultiple,
  esTokenValido
};
