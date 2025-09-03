## Tecnologias utilizadas 


### Backend
- Node.js con Express
- PostgreSQL (pg Pool para conexión)
- ExcelJS (para la generación de reportes en formato Excel)
- dotenv (manejo de variables de entorno)

## Estructura del proyecto

Reportes-Trans/
├── backend/
│   ├── src/
│   │   ├── server.js        # Punto de entrada del backend
│   │   ├── app.js           # Configuración de Express y middlewares
│   │   ├── routes/          # Rutas API (ej: test, reportes)
│   │   └── db.js            # Configuración de conexión a PostgreSQL
│   └── package.json
│
├── frontend/
│   ├── public/              # Recursos estáticos (imágenes, favicon, etc.)
│   ├── src/
│   │   ├── App.js           # Componente principal
│   │   ├── App.css          # Estilos personalizados
│   │   └── components/      # Componentes reutilizables (formulario, etc.)
│   └── package.json
│
└── README.md

## Configuración 

Clonar repositodrio: 
-git clone https://...
-cd Reportes-Trans
-npm intall

## Conexion a PostgresSQL
.env:
-PGHOST=localhost
-PGUSER=postgres
-PGPASSWORD=tu_password
-PGDATABASE=reportes_db
-PGPORT=0000

## Ejecutar el backend
-npm start
