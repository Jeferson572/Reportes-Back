import express from "express";
import { getConnection } from "./db.js";
import ExcelJS from "exceljs";
import cors from "cors";

const app = express();
app.use(express.json());

// Habilitar CORS para solicitudes desde el frontend
app.use(
  cors({
    origin: "http://localhost:3000", // El front corre en el puerto 3000
    methods: ["GET", "POST"],
    exposedHeaders: ["Content-Disposition"], // para poder leer el filename en frontend
  })
);


//Formulario para seleccionar el rango de fechas y el tipo de reporte
app.get("/reporte", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Generar Reporte</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          label { display: block; margin-top: 10px; }
          input, select, button { padding: 8px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <h1>Generar Reporte</h1>
        <form action="/descargar-reporte" method="get">
          <label>Fecha Inicio: <input type="date" name="fecha_inicio" required></label>
          <label>Fecha Fin: <input type="date" name="fecha_fin" required></label>
          <label>Tipo de reporte:
            <select name="tipo_reporte" required>
              <option value="Mensual Detallado">Mensual Detallado</option>
              <option value="Mensual General">Mensual General</option>
              <option value="Diarios Por Mes">Diarios Por Mes</option>
              <option value="Diarios Por Hora">Diarios Por Hora</option>
            </select>
          </label>
          <button type="submit">Descargar Excel</button>
        </form>
      </body>
    </html>
  `);
});


//Generar y descargar el archivo Excel filtrado por fechas y tipo de reporte
app.get("/descargar-reporte", async (req, res) => {
  const { fecha_inicio, fecha_fin, tipo_reporte } = req.query;

  if (!fecha_inicio || !fecha_fin || !tipo_reporte) {
    return res.status(400).json({
      error: "Debe indicar fecha_inicio, fecha_fin y tipo_reporte",
    });
  }

  let query = "";

  switch (tipo_reporte) {
    case "Mensual Detallado":
      query = `
        SELECT
            TO_CHAR(e.event_date, 'YYYY-MM-DD') AS fecha,
            TO_CHAR(e.event_date, 'HH24:MI:SS') AS hora,
            et.event_type AS evento,
            c.cyclist_id AS documento,
            TRIM(c.first_name || ' ' || COALESCE(c.second_name, '')) AS nombres,
            TRIM(c.first_last_name || ' ' || COALESCE(c.second_last_name, '')) AS apellidos,
            col.color_name AS color,
            v.bike_serial AS serial,
            t.type_name AS tipo_bicicleta,
            b.brand AS marca,
            CASE
                WHEN v.is_secretary_register = false THEN 'NO'
                ELSE 'SI'
            END AS registrada_movilidad
        FROM be_et_ps e
        JOIN et_te_ps et ON e.event_type_id = et.event_type_id
        JOIN be_ve_ps v  ON e.bike_id = v.bike_code
        JOIN be_bd_ps b  ON v.brand_id = b.id_brand
        JOIN be_te_ps t  ON v.bike_type_id = t.type_id
        JOIN be_cr_ps col ON v.color_id = col.color_id
        JOIN ct_pn_ps c   ON v.cyclist_id = c.cyclist_id 
                         AND v.cy_id_type_id = c.id_type_id
        WHERE e.event_date BETWEEN $1 AND $2
        ORDER BY e.event_date;
      `;
      break;

    case "Mensual General":
      query = `
        SELECT 
            ct_pn_ps.cyclist_id AS documento,
            CONCAT(ct_pn_ps.first_name, ' ', second_name) AS Nombres,
            CONCAT(ct_pn_ps.first_last_name, ' ',  second_last_name) AS Apellidos,
            EXTRACT(YEAR FROM be_et_ps.event_date) AS Año,
            EXTRACT(MONTH FROM be_et_ps.event_date) AS Mes,
            COUNT(*) AS Eventos
        FROM be_et_ps
        JOIN be_ve_ps 
            ON be_et_ps.bike_id = be_ve_ps.bike_code
        JOIN ct_pn_ps 
            ON be_ve_ps.cyclist_id = ct_pn_ps.cyclist_id 
           AND be_ve_ps.cy_id_type_id = ct_pn_ps.id_type_id
        WHERE be_et_ps.event_date BETWEEN $1 AND $2
        GROUP BY 
            ct_pn_ps.cyclist_id,
            CONCAT(ct_pn_ps.first_name, ' ', second_name),
            CONCAT(ct_pn_ps.first_last_name, ' ',  second_last_name),
            EXTRACT(YEAR FROM be_et_ps.event_date),
            EXTRACT(MONTH FROM be_et_ps.event_date)
        ORDER BY Año, Mes, ct_pn_ps.cyclist_id;
      `;
      break;

    case "Diarios Por Mes":
      query = `
        SELECT
            DATE(b.event_date_in) AS Fecha,
            SUM(CASE WHEN e.event_state_id = '1' THEN 1 ELSE 0 END) AS Ingresos,
            SUM(CASE WHEN e.event_state_id = '2' THEN 1 ELSE 0 END) AS Salidas,
            COUNT(*) AS Eventos
        FROM biciparkinglite_bike_event b
        WHERE b.event_date_in BETWEEN $1 AND $2
        GROUP BY DATE(b.event_date_in)
        ORDER BY fecha;
      `;
      break;

    case "Diarios Por Hora":
      query = `
        SELECT
            DATE(b.event_date_in) AS Fecha,
            TO_CHAR(b.event_date_in, 'HH24') AS Hora,
            SUM(CASE WHEN e.event_state_id = 1 THEN 1 ELSE 0 END) AS Ingresos,
            SUM(CASE WHEN e.event_state_id = 2 THEN 1 ELSE 0 END) AS Salidas,
            COUNT(*) AS Eventos
        FROM biciparkinglite_bike_event b
        INNER JOIN biciparkinglite_event_state e 
            ON b.event_state_id_id = e.event_state_id
        WHERE b.event_date_in BETWEEN $1 AND $2
           OR b.event_date_out BETWEEN $1 AND $2
        GROUP BY DATE(b.event_date_in), TO_CHAR(b.event_date_in, 'HH24')
        ORDER BY Fecha, Hora;
      `;
      break;

    default:
      return res.status(400).send("Tipo de reporte no válido");
  }

  try {
    const client = await getConnection();
    const result = await client.query(query, [fecha_inicio, fecha_fin]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "No hay datos en el rango de fechas seleccionado",
      });
    }

    // Crear libro de Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reporte");

    // Agregar encabezados
    worksheet.columns = Object.keys(result.rows[0]).map((col) => ({
      header: col,
      key: col,
      width: 20,
    }));

    // Agregar filas
    result.rows.forEach((row) => worksheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();

    // Configurar respuesta para descarga
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${tipo_reporte}_${fecha_inicio}_a_${fecha_fin}.xlsx`
    );

    res.send(buffer);
  } catch (error) {
    console.error("Error generando el Excel:", error);
    res.status(500).json({
      error: "Error al generar el reporte",
      detalle: error.message,
    });
  }
});

export default app;
