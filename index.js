const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

// Configuración de CORS más específica para Angular
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Users API',
      version: '1.0.0',
      description: 'API simple para gestión de usuarios con PostgreSQL',
      contact: {
        name: 'Tu Nombre',
        email: 'tu.email@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del usuario',
              example: 1
            },
            name: {
              type: 'string',
              description: 'Nombre completo del usuario',
              example: 'Juan Pérez'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario',
              example: 'juan@example.com'
            },
            password: {
              type: 'string',
              description: 'Clave del Usuario',
              example: '12345'
            }
          }
        },
        UserInput: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: {
              type: 'string',
              description: 'Nombre completo del usuario',
              example: 'Juan Pérez'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario',
              example: 'juan@example.com'
            },
            password: {
              type: 'string',
              description: 'Clave del Usuario',
              example: '12345'
            }
          }
        },
        ToDoItem: {
          type: 'object',
          required: ['title', 'status', 'date'], // 'date' es NOW() por defecto, pero se considera requerido al obtener
          properties: {
            id: {
              type: 'integer',
              description: 'ID único de la tarea',
              example: 1
            },
            title: {
              type: 'string',
              description: 'Título de la tarea',
              example: 'Completar informe mensual'
            },
            status: {
              type: 'string',
              enum: ['To Do', 'In Progress', 'Done'],
              description: 'Estado actual de la tarea',
              example: 'In Progress'
            },
            description: {
              type: 'string',
              description: 'Descripción detallada de la tarea',
              example: 'Recopilar datos de ventas y analizarlos.',
              nullable: true // Puede ser null
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora de creación/actualización de la tarea',
              example: '2024-06-09T10:00:00.000Z' // Ejemplo con formato de fecha correcto
            }
          }
        },
        ToDoInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: {
              type: 'string',
              description: 'Título de la tarea',
              example: 'Preparar presentación'
            },
            status: {
              type: 'string',
              enum: ['To Do', 'In Progress', 'Done'],
              description: 'Estado de la tarea (por defecto "To Do")',
              example: 'To Do'
            },
            description: {
              type: 'string',
              description: 'Descripción detallada de la tarea',
              example: 'Crear diapositivas para la reunión del viernes.',
              nullable: true // Puede ser null al enviar
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Tipo de error'
            },
            message: {
              type: 'string',
              description: 'Descripción del error'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje de éxito'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        
      }
    }
  },
  apis: ['./index.js'] // Archivos que contienen las anotaciones de Swagger
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Configura el pool de conexión con variables de entorno
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'example',
  database: process.env.DB_NAME || 'mydb',
  port: 5432,
});

// Verificar conexión a la base de datos
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error de conexión a PostgreSQL:', err);
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verificar el estado del servidor
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: string
 *                   example: PostgreSQL
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL'
  });
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/users', async (req, res) => {
  try {
    console.log('🔍 Consultando usuarios...');
    const result = await pool.query('SELECT * FROM users ORDER BY id');
    console.log(`📋 Encontrados ${result.rows.length} usuarios`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al consultar usuarios:', err);
    res.status(500).json({
      error: 'Error al consultar la base de datos',
      message: err.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numérico del usuario
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'El ID debe ser un número'
      });
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: `No existe un usuario con ID ${userId}`
      });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al obtener usuario:', err);
    res.status(500).json({
      error: 'Error al consultar la base de datos',
      message: err.message
    });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Datos incompletos o inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email duplicado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validaciones básicas
    if (!name || !email) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Nombre y email son campos requeridos'
      });
    }

    // Verificar si el email ya existe
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Email duplicado',
        message: 'Ya existe un usuario con ese email'
      });
    }

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), email.trim().toLowerCase(), password]
    );
    
    console.log('✅ Usuario creado:', result.rows[0]);
    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error al crear usuario:', err);
    res.status(500).json({
      error: 'Error al crear usuario',
      message: err.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar un usuario existente
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numérico del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: ID inválido o datos incompletos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email duplicado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, password } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'El ID debe ser un número'
      });
    }

    // Validaciones básicas
    if (!name || !email) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Nombre y email son campos requeridos'
      });
    }

    // Verificar si el usuario existe
    const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: `No existe un usuario con ID ${userId}`
      });
    }

    // Verificar si el email ya existe en otro usuario
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.toLowerCase(), userId]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'Email duplicado',
        message: 'Ya existe otro usuario con ese email'
      });
    }

    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $5 RETURNING *',
      [name.trim(), email.trim().toLowerCase(), password, userId]
    );
    
    console.log('✅ Usuario actualizado:', result.rows[0]);
    res.json({
      message: 'Usuario actualizado exitosamente',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error al actualizar usuario:', err);
    res.status(500).json({
      error: 'Error al actualizar usuario',
      message: err.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar un usuario
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numérico del usuario
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'El ID debe ser un número'
      });
    }

    // Verificar si el usuario existe antes de eliminarlo
    const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: `No existe un usuario con ID ${userId}`
      });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);
    
    console.log('✅ Usuario eliminado:', result.rows[0]);
    res.json({
      message: 'Usuario eliminado exitosamente',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error al eliminar usuario:', err);
    res.status(500).json({
      error: 'Error al eliminar usuario',
      message: err.message
    });
  }
});

/**
 * @swagger
 * /api/todo:
 *   get:
 *     summary: Obtener todas las tareas
 *     tags: [ToDo]
 *     responses:
 *       200:
 *         description: Lista de tareas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   completed:
 *                     type: boolean
 */
app.get('/api/todo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todo ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener tareas:', err);
    res.status(500).json({ error: 'Error en el servidor', message: err.message });
  }
});

/**
 * @swagger
 * /api/todo/{id}:
 *   get:
 *     summary: Obtener una tarea por ID
 *     tags: [ToDo]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numérico de la tarea a consultar
 *     responses:
 *       200:
 *         description: Tarea encontrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 todo:
 *                   $ref: '#/components/schemas/ToDoItem'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tarea no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

app.get('/api/todo/:id', async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);

    if (isNaN(todoId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'El ID de la tarea debe ser un número.'
      });
    }

    const result = await pool.query('SELECT * FROM todo WHERE id = $1', [todoId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tarea no encontrada',
        message: `No existe una tarea con ID ${todoId}`
      });
    }

    console.log('📄 Tarea encontrada:', result.rows[0]);
    res.json({
      todo: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Error al obtener tarea:', err);
    res.status(500).json({
      error: 'Error al obtener tarea',
      message: err.message
    });
  }
});

/**
 * @swagger
 * /api/todo:
 *   post:
 *     summary: Crear una nueva tarea
 *     tags: [ToDo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ToDoInput'
 *     responses:
 *       201:
 *         description: Tarea creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tarea creada exitosamente
 *                 todo:
 *                   $ref: '#/components/schemas/ToDoItem'
 *       400:
 *         description: Datos incompletos o inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

app.post('/api/todo', async (req, res) => {
  try {
    const { title, status, description } = req.body;

    // Validación: el título es obligatorio
    if (!title) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'El título de la tarea es requerido.'
      });
    }

    // Validación del estado (ENUM)
    const validStatuses = ['To Do', 'In Progress', 'Done'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Estado inválido',
        message: `El estado debe ser uno de: ${validStatuses.join(', ')}`
      });
    }

    // Usar el estado proporcionado o el valor por defecto 'To Do'
    const finalStatus = status || 'To Do';

    const result = await pool.query(
      'INSERT INTO todo (title, status, description) VALUES ($1, $2, $3) RETURNING *',
      [title.trim(), finalStatus, description ? description.trim() : null] // description puede ser null
    );

    console.log('✅ Tarea creada:', result.rows[0]);
    res.status(201).json({
      message: 'Tarea creada exitosamente',
      todo: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error al crear tarea:', err);
    res.status(500).json({
      error: 'Error al crear tarea',
      message: err.message
    });
  }
});

/**
 * @swagger
 * /api/todo/{id}:
 *   put:
 *     summary: Actualizar una tarea existente
 *     tags: [ToDo]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numérico de la tarea
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Nuevo título de la tarea
 *                 example: Actualizar documento de requisitos
 *               status:
 *                 type: string
 *                 enum: [To Do, In Progress, Done]
 *                 description: Nuevo estado de la tarea
 *                 example: Done
 *               description:
 *                 type: string
 *                 description: Nueva descripción de la tarea
 *                 example: Revisar y finalizar el documento para el comité.
 *     responses:
 *       200:
 *         description: Tarea actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tarea actualizada exitosamente
 *                 todo:
 *                   $ref: '#/components/schemas/ToDoItem'
 *       400:
 *         description: ID inválido o datos incompletos/inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tarea no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

app.put('/api/todo/:id', async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);
    const { title, status, description } = req.body;

    if (isNaN(todoId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'El ID de la tarea debe ser un número.'
      });
    }

    // Validar que al menos un campo sea proporcionado para la actualización
    if (title === undefined && status === undefined && description === undefined) {
      return res.status(400).json({
        error: 'No hay datos para actualizar',
        message: 'Al menos un campo (title, status, description) debe ser proporcionado para actualizar.'
      });
    }

    // Validación del estado (ENUM) si se proporciona
    const validStatuses = ['To Do', 'In Progress', 'Done'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Estado inválido',
        message: `El estado debe ser uno de: ${validStatuses.join(', ')}`
      });
    }

    // Construir la consulta de actualización dinámicamente
    let queryParts = [];
    let queryParams = [todoId]; // $1 será el todoId
    let paramIndex = 2; // Los siguientes parámetros empiezan en $2

    if (title !== undefined) {
      queryParts.push(`title = $${paramIndex++}`);
      queryParams.push(title.trim());
    }
    if (status !== undefined) {
      queryParts.push(`status = $${paramIndex++}`);
      queryParams.push(status);
    }
    // La descripción puede ser null para "borrarla" o establecerla vacía
    if (description !== undefined) {
      queryParts.push(`description = $${paramIndex++}`);
      queryParams.push(description ? description.trim() : null);
    }

    // Si no hay partes en la consulta, significa que no se pasaron campos válidos para actualizar
    if (queryParts.length === 0) {
      return res.status(400).json({
        error: 'No hay datos para actualizar',
        message: 'No se proporcionaron campos válidos para la actualización.'
      });
    }

    const updateQuery = `UPDATE todo SET ${queryParts.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tarea no encontrada',
        message: `No existe una tarea con ID ${todoId}`
      });
    }

    console.log('✅ Tarea actualizada:', result.rows[0]);
    res.json({
      message: 'Tarea actualizada exitosamente',
      todo: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error al actualizar tarea:', err);
    res.status(500).json({
      error: 'Error al actualizar tarea',
      message: err.message
    });
  }
});

/**
 * @swagger
 * /api/todo/{id}:
 *   delete:
 *     summary: Eliminar una tarea
 *     tags: [ToDo]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numérico de la tarea a eliminar
 *     responses:
 *       200:
 *         description: Tarea eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tarea eliminada exitosamente
 *                 todo:
 *                   $ref: '#/components/schemas/ToDoItem'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tarea no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

app.delete('/api/todo/:id', async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);

    if (isNaN(todoId)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'El ID de la tarea debe ser un número.'
      });
    }

    const result = await pool.query('DELETE FROM todo WHERE id = $1 RETURNING *', [todoId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tarea no encontrada',
        message: `No existe una tarea con ID ${todoId}`
      });
    }

    console.log('✅ Tarea eliminada:', result.rows[0]);
    res.json({
      message: 'Tarea eliminada exitosamente',
      todo: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error al eliminar tarea:', err);
    res.status(500).json({
      error: 'Error al eliminar tarea',
      message: err.message
    });
  }
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`📚 Documentación Swagger disponible en: http://localhost:${PORT}/api-docs`);
  });
}