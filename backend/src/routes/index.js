import express from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import veterinarioRoutes from "./veterinarioRoutes.js";
import mascotaRoutes from "./mascotaRoutes.js";
import citaRoutes from "./citaRoutes.js";
import servicioRoutes from "./servicioRoutes.js";
import emergenciaRoutes from "./emergenciaRoutes.js";
import valoracionRoutes from "./valoracionRoutes.js";
import consejoDeSaludRoutes from "./consejoDeSaludRoutes.js";
import notificacionRoutes from "./notificacionRoutes.js";
import pagoRoutes from "./pagoRoutes.js";
import prestadorRoutes from "./prestadorRoutes.js";
import catalogoRoutes from "./catalogoRoutes.js";
import disponibilidadRoutes from "./disponibilidadRoutes.js";

const router = express.Router();

// Configuración de todas las rutas de la API
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/veterinarios", veterinarioRoutes);
router.use("/mascotas", mascotaRoutes);
router.use("/citas", citaRoutes);
router.use("/servicios", servicioRoutes);
router.use("/emergencias", emergenciaRoutes);
router.use("/valoraciones", valoracionRoutes);
router.use("/consejos-salud", consejoDeSaludRoutes);
router.use("/notificaciones", notificacionRoutes);
router.use("/pagos", pagoRoutes);
router.use("/prestadores", prestadorRoutes);
router.use("/catalogo", catalogoRoutes);
router.use("/disponibilidad", disponibilidadRoutes);

// Ruta para verificar si la API está funcionando
router.get("/", (req, res) => {
  res.json({ message: "API de Vetya funcionando correctamente" });
});

export default router;
