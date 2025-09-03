import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error en /test:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
