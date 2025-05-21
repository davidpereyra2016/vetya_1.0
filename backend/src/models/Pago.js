import mongoose from "mongoose";

/**
 * Esquema para los pagos de servicios veterinarios
 * Este modelo almacena la información relacionada con los pagos realizados por servicios
 * Permite referenciar pagos a citas, emergencias o servicios específicos
 */
const pagoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  concepto: {
    type: String,
    required: true,
    enum: ['Cita', 'Emergencia', 'Servicio', 'Otro']
  },
  referencia: {
    // Referencia polimórfica - puede ser una cita, emergencia o servicio
    tipo: {
      type: String,
      required: true,
      enum: ['Cita', 'Emergencia', 'Servicio', 'Otro']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'referencia.tipo'
    }
  },
  veterinario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Veterinario',
    required: true
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  metodoPago: {
    type: String,
    required: true,
    enum: ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'Otro']
  },
  estado: {
    type: String,
    required: true,
    enum: ['Pendiente', 'Procesando', 'Completado', 'Fallido', 'Reembolsado'],
    default: 'Pendiente'
  },
  fechaPago: {
    type: Date
  },
  idTransaccion: {
    type: String
    // ID de transacción generado por la pasarela de pago
  },
  comprobante: {
    type: String
    // URL a la imagen del comprobante (si aplica)
  },
  detallesPago: {
    // Campos adicionales específicos de cada método de pago
    ultimos4Digitos: String,
    tipoTarjeta: String,
    bancoEmisor: String,
    titular: String
  },
  notasAdicionales: {
    type: String
  },
  facturaDatos: {
    nombre: String,
    direccion: String,
    rfc: String,
    correo: String
  },
  facturaGenerada: {
    type: Boolean,
    default: false
  },
  facturaURL: {
    type: String
  }
}, {
  timestamps: true
});

// Actualizar el estado de la referencia cuando se completa un pago
pagoSchema.post('save', async function() {
  // Solo proceder si el pago está completado y antes no lo estaba
  if (this.estado === 'Completado' && this.isModified('estado')) {
    // Determinar qué modelo actualizar basado en el tipo de referencia
    let ModeloReferencia;
    switch (this.referencia.tipo) {
      case 'Cita':
        ModeloReferencia = mongoose.model('Cita');
        await ModeloReferencia.findByIdAndUpdate(this.referencia.id, { pagado: true });
        break;
      case 'Emergencia':
        ModeloReferencia = mongoose.model('Emergencia');
        await ModeloReferencia.findByIdAndUpdate(this.referencia.id, { pagado: true });
        break;
      // Otros casos según sea necesario
    }
  }
});

// Índices para búsquedas comunes
pagoSchema.index({ usuario: 1 });
pagoSchema.index({ 'referencia.tipo': 1, 'referencia.id': 1 });
pagoSchema.index({ estado: 1 });
pagoSchema.index({ fechaPago: -1 });

const Pago = mongoose.model("Pago", pagoSchema);
export default Pago;
