# back-Docker
Proeycto node con express para un back para la materia de CI/CD POLI

# 🛠️ Node.js Backend con Express + Docker
Este proyecto es una API básica creada con Node.js 20 y Express, lista para ejecutarse en un contenedor Docker. Es ideal como base para el sistema ToDo App..

# 🚀 Requisitos
- Docker instalado en tu sistema.
- Docker Compose (incluido con Docker Desktop).
- No necesitas tener Node.js instalado localmente.

# 📁 Estructura del Proyecto

node-docker-app/
├── Dockerfile
├── docker-compose.yml
├── index.js
├── package.json
├── package-lock.json
└── README.md
├── .gitignore
└── /src

# 🧑‍💻 Desarrollo
    🔧 1. Clonar el proyecto
    git https://github.com/legarrod/back-Docker
    cd back-Docker

# 🐳 2. Levantar el servidor con Docker
    docker compose up --build
    Esto hará lo siguiente:
    - Construirá una imagen Docker basada en Node.js 20 Alpine.
    - Instalará las dependencias del proyecto.
    - Levantará un servidor Express en http://localhost:3000.

# 🧪 Endpoints
    Método	Ruta	Descripción
    GET	/	Verifica si el servidor funciona.

# 📦 Dependencias
    - Node.js 20
    - Express 4.x

# 📂 Volúmenes
volumes:
  - .:/app
  - /app/node_modules

# 🧹 Comandos útiles
| Comando                          | Descripción                            |
|----------------------------------|----------------------------------------|
| docker compose up                | Inicia el servidor                     |
| docker compose up --build        | Reconstruye la imagen desde cero       |
| docker compose down              | Detiene y elimina el contenedor        |
| docker compose exec node-app sh  | Entra al contenedor como shell         |

# 📝 Notas
    - Este proyecto está configurado para Node 20 en la imagen node:20-alpine.
    - Si cambias código dentro de index.js, los cambios se reflejarán automáticamente sin reiniciar el contenedor gracias al volumen montado.

# 📬 Autor
    - OSCAR SANTIAGO AMADOR HERNANDEZ
    - Rodriguez Pulido German Dario
    - LUIS EVELIO GARCIA RODRIGUEZ
    - ROBERT SANTIAGO SANTANA ORTEGA
    - LUISA FERNANDA WOO GARCIA

# ⚖️ Licencia
    MIT
