import express from "express";
import Pago from "../models/Pago.js";
import Cita from "../models/Cita.js";
import Emergencia from "../models/Emergencia.js";
import cloudinary from "../lib/cloudinary.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Obtener todos los pagos del usuario autenticado
router.get("/", protectRoute, async (req, res) => {
  try {
    const pagos = await Pago.find({ usuario: req.user._id })
      .populate("veterinario", "nombre especialidad imagen")
      .sort({ createdAt: -1 });
    
    res.status(200).json(pagos);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener los pagos" });
  }
});

// Obtener un pago por ID
router.get("/:id", protectRoute, async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id)
      .populate("veterinario", "nombre especialidad imagen ubicacion email telefono");
    
    if (!pago) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (pago.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para ver este pago" });
    }
    
    res.status(200).json(pago);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener el pago" });
  }
});

// Crear un nuevo pago
router.post("/", protectRoute, async (req, res) => {
  try {
    const { concepto, referencia, veterinario, monto, metodoPago, idTransaccion, detallesPago, facturaDatos, notasAdicionales } = req.body;
    
    // Validar campos obligatorios
    if (!concepto || !referencia || !veterinario || !monto || !metodoPago) {
      return res.status(400).json({ message: "Concepto, referencia, veterinario, monto y método de pago son obligatorios" });
    }
    
    // Verificar que la referencia exista
    let referenciaExiste = false;
    
    if (referencia.tipo === "Cita") {
      const cita = await Cita.findById(referencia.id);
      if (cita && cita.usuario.toString() === req.user._id.toString()) {
        referenciaExiste = true;
      }
    } else if (referencia.tipo === "Emergencia") {
      const emergencia = await Emergencia.findById(referencia.id);
      if (emergencia && emergencia.usuario.toString() === req.user._id.toString()) {
        referenciaExiste = true;
      }
    }
    
    if (!referenciaExiste) {
      return res.status(404).json({ message: "La referencia no existe o no pertenece al usuario" });
    }
    
    // Procesar comprobante si se proporciona
    let comprobanteUrl = "";
    if (req.body.comprobante) {
      const uploadResponse = await cloudinary.uploader.upload(req.body.comprobante, {
        folder: "comprobantes_pago"
      });
      comprobanteUrl = uploadResponse.secure_url;
    }
    
    // Crear nuevo pago
    const nuevoPago = new Pago({
      usuario: req.user._id,
      concepto,
      referencia,
      veterinario,
      monto,
      metodoPago,
      estado: "Pendiente",
      idTransaccion: idTransaccion || "",
      comprobante: comprobanteUrl,
      detallesPago: detallesPago || {},
      facturaDatos: facturaDatos || {},
      notasAdicionales: notasAdicionales || ""
    });
    
    await nuevoPago.save();
    
    // Populate para devolver la información completa
    const pagoCompletado = await Pago.findById(nuevoPago._id)
      .populate("veterinario", "nombre especialidad imagen");
    
    res.status(201).json(pagoCompletado);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al crear el pago" });
  }
});

// Actualizar estado de un pago (ruta protegida para admin o sistema)
router.patch("/:id/estado", protectRoute, async (req, res) => {
  try {
    const { estado } = req.body;
    const estados = ["Pendiente", "Procesando", "Completado", "Fallido", "Reembolsado"];
    
    if (!estado || !estados.includes(estado)) {
      return res.status(400).json({ message: "Estado de pago inválido" });
    }
    
    const pago = await Pago.findById(req.params.id);
    
    if (!pago) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }
    
    // Solo actualizar si es un nuevo estado
    if (pago.estado !== estado) {
      pago.estado = estado;
      
      // Si se completa el pago, actualizar la fecha
      if (estado === "Completado") {
        pago.fechaPago = new Date();
      }
      
      await pago.save();
    }
    
    res.status(200).json(pago);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al actualizar el estado del pago" });
  }
});

// Subir comprobante de pago
router.post("/:id/comprobante", protectRoute, async (req, res) => {
  try {
    const { comprobante } = req.body;
    
    if (!comprobante) {
      return res.status(400).json({ message: "El comprobante es requerido" });
    }
    
    const pago = await Pago.findById(req.params.id);
    
    if (!pago) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (pago.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para modificar este pago" });
    }
    
    // Eliminar comprobante anterior si existe
    if (pago.comprobante && pago.comprobante.includes('cloudinary')) {
      const publicId = pago.comprobante.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`comprobantes_pago/${publicId}`);
    }
    
    // Subir nuevo comprobante
    const uploadResponse = await cloudinary.uploader.upload(comprobante, {
      folder: "comprobantes_pago"
    });
    
    pago.comprobante = uploadResponse.secure_url;
    
    // Si el pago estaba pendiente, cambiarlo a procesando
    if (pago.estado === "Pendiente") {
      pago.estado = "Procesando";
    }
    
    await pago.save();
    
    res.status(200).json(pago);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al subir el comprobante" });
  }
});

// Solicitar factura
router.patch("/:id/solicitar-factura", protectRoute, async (req, res) => {
  try {
    const { facturaDatos } = req.body;
    
    if (!facturaDatos || !facturaDatos.nombre || !facturaDatos.direccion || !facturaDatos.correo) {
      return res.status(400).json({ message: "Los datos de facturación son incompletos" });
    }
    
    const pago = await Pago.findById(req.params.id);
    
    if (!pago) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (pago.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para modificar este pago" });
    }
    
    // Actualizar datos de facturación
    pago.facturaDatos = facturaDatos;
    await pago.save();
    
    res.status(200).json(pago);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al solicitar la factura" });
  }
});

// Obtener pagos por referencia
router.get("/referencia/:tipo/:id", protectRoute, async (req, res) => {
  try {
    const { tipo, id } = req.params;
    
    const pagos = await Pago.find({
      usuario: req.user._id,
      "referencia.tipo": tipo,
      "referencia.id": id
    }).populate("veterinario", "nombre especialidad imagen");
    
    res.status(200).json(pagos);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener los pagos" });
  }
});

export default router;
