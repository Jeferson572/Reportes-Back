import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

export async function getConnection() {
  try {
    const client = await pool.connect();
    console.log("Conexión a PostgreSQL exitosa");
    return client;
  } catch (error) {
    console.error("Error al conectarse a PostgreSQL:", error);
    throw error;
  }
}
