const request = require('supertest');
const app = require('../index'); // Importa la instancia de tu aplicación Express
const { Pool } = require('pg'); // Importa el Pool de pg

// Configura el pool de conexión para pruebas (puede ser la misma DB si la limpias)
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'example',
  database: process.env.DB_NAME || 'mydb', // Asegúrate de que apunte a tu DB de prueba si tienes una
  port: 5432,
});

// Antes de todas las pruebas, asegúrate de que la tabla 'todo' exista y esté limpia
beforeAll(async () => {
  try {
    // Intenta crear el tipo ENUM si no existe (importante para tests limpios)
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'todo_status') THEN
              CREATE TYPE todo_status AS ENUM ('To Do', 'In Progress', 'Done');
          END IF;
      END
      $$;
    `);
    // Asegúrate de que la tabla exista
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todo (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          status todo_status NOT NULL DEFAULT 'To Do',
          description TEXT,
          date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Limpia la tabla 'todo' antes de cualquier test
    await pool.query('TRUNCATE TABLE todo RESTART IDENTITY CASCADE;');
  } catch (error) {
    console.error('Error durante la configuración de beforeAll:', error);
    // Lanza el error para que Jest lo capture y marque el setup como fallido
    throw error; 
  }
});

// Limpia la tabla 'todo' después de cada test (opcional, si quieres aislamiento por test)
// O puedes mantenerlo solo en beforeAll si la data de un test no afecta a otro
afterEach(async () => {
  try {
    await pool.query('TRUNCATE TABLE todo RESTART IDENTITY CASCADE;');
  } catch (error) {
    console.error('Error durante la limpieza de afterEach:', error);
  }
});

// Después de todas las pruebas, cierra la conexión a la base de datos
afterAll(async () => {
  try {
    await pool.end();
  } catch (error) {
    console.error('Error al cerrar la conexión del pool en afterAll:', error);
  }
});

describe('ToDo API Endpoints', () => {

  // Test GET all tasks
  describe('GET /api/todo', () => {
    it('debería devolver una lista vacía si no hay tareas', async () => {
      const res = await request(app).get('/api/todo');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([]);
    });

    it('debería devolver todas las tareas existentes', async () => {
      // Insertar algunas tareas de prueba
      await pool.query(
        "INSERT INTO todo (title, status) VALUES ('Tarea 1', 'To Do'), ('Tarea 2', 'Done')"
      );

      const res = await request(app).get('/api/todo');
      expect(res.statusCode).toEqual(200);
      expect(res.body.length).toEqual(2);
      expect(res.body[0].title).toEqual('Tarea 1');
      expect(res.body[1].title).toEqual('Tarea 2');
    });
  });

  // Test GET task by ID
  describe('GET /api/todo/:id', () => {
    it('debería devolver una tarea por su ID', async () => {
      const insertRes = await pool.query(
        "INSERT INTO todo (title, status, description) VALUES ('Tarea de prueba', 'In Progress', 'Descripción de prueba') RETURNING id"
      );
      const todoId = insertRes.rows[0].id;

      const res = await request(app).get(`/api/todo/${todoId}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('todo');
      expect(res.body.todo.id).toEqual(todoId);
      expect(res.body.todo.title).toEqual('Tarea de prueba');
    });

    it('debería devolver 404 si la tarea no se encuentra', async () => {
      const res = await request(app).get('/api/todo/9999'); // ID que no existe
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toEqual('Tarea no encontrada');
    });

    it('debería devolver 400 si el ID es inválido', async () => {
      const res = await request(app).get('/api/todo/abc');
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('ID inválido');
    });
  });

  // Test POST new task
  describe('POST /api/todo', () => {
    it('debería crear una nueva tarea con título y estado por defecto', async () => {
      const newTask = { title: 'Nueva Tarea Post' };
      const res = await request(app)
        .post('/api/todo')
        .send(newTask);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Tarea creada exitosamente');
      expect(res.body.todo.title).toEqual(newTask.title);
      expect(res.body.todo.status).toEqual('To Do'); // Verifica el estado por defecto
      expect(res.body.todo).toHaveProperty('id');
    });

    it('debería crear una nueva tarea con todos los campos', async () => {
      const newTask = {
        title: 'Tarea con descripción y estado',
        status: 'Done',
        description: 'Esta es una descripción completa.'
      };
      const res = await request(app)
        .post('/api/todo')
        .send(newTask);

      expect(res.statusCode).toEqual(201);
      expect(res.body.todo.title).toEqual(newTask.title);
      expect(res.body.todo.status).toEqual(newTask.status);
      expect(res.body.todo.description).toEqual(newTask.description);
    });

    it('debería devolver 400 si falta el título', async () => {
      const res = await request(app)
        .post('/api/todo')
        .send({}); // Sin título

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Datos incompletos');
      expect(res.body.message).toEqual('El título de la tarea es requerido.');
    });

    it('debería devolver 400 si el estado es inválido', async () => {
      const newTask = { title: 'Tarea inválida', status: 'InvalidStatus' };
      const res = await request(app)
        .post('/api/todo')
        .send(newTask);

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Estado inválido');
    });
  });

  // Test PUT update task
  describe('PUT /api/todo/:id', () => {
    let testTodoId;
    beforeEach(async () => {
      // Inserta una tarea para actualizar en cada test de PUT
      const insertRes = await pool.query(
        "INSERT INTO todo (title, status, description) VALUES ('Tarea a actualizar', 'To Do', 'Desc. original') RETURNING id"
      );
      testTodoId = insertRes.rows[0].id;
    });

    it('debería actualizar una tarea existente (solo título)', async () => {
      const updateData = { title: 'Título Actualizado' };
      const res = await request(app)
        .put(`/api/todo/${testTodoId}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Tarea actualizada exitosamente');
      expect(res.body.todo.id).toEqual(testTodoId);
      expect(res.body.todo.title).toEqual(updateData.title);
      // El resto de los campos deben permanecer igual si no se envían
      expect(res.body.todo.status).toEqual('To Do');
    });

    it('debería actualizar una tarea existente (todos los campos)', async () => {
      const updateData = {
        title: 'Título y Estado Actualizados',
        status: 'Done',
        description: 'Nueva descripción actualizada.'
      };
      const res = await request(app)
        .put(`/api/todo/${testTodoId}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.todo.id).toEqual(testTodoId);
      expect(res.body.todo.title).toEqual(updateData.title);
      expect(res.body.todo.status).toEqual(updateData.status);
      expect(res.body.todo.description).toEqual(updateData.description);
    });

    it('debería devolver 404 si la tarea no se encuentra', async () => {
      const res = await request(app)
        .put('/api/todo/9999')
        .send({ title: 'No existente' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toEqual('Tarea no encontrada');
    });

    it('debería devolver 400 si el ID es inválido', async () => {
      const res = await request(app)
        .put('/api/todo/xyz')
        .send({ title: 'Inválido' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('ID inválido');
    });

    it('debería devolver 400 si no se proporcionan datos para actualizar', async () => {
      const res = await request(app)
        .put(`/api/todo/${testTodoId}`)
        .send({}); // Objeto vacío

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('No hay datos para actualizar');
    });

    it('debería devolver 400 si el estado es inválido en la actualización', async () => {
      const res = await request(app)
        .put(`/api/todo/${testTodoId}`)
        .send({ status: 'EstadoRaro' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Estado inválido');
    });
  });

  // Test DELETE task
  describe('DELETE /api/todo/:id', () => {
    let testTodoId;
    beforeEach(async () => {
      // Inserta una tarea para eliminar en cada test de DELETE
      const insertRes = await pool.query(
        "INSERT INTO todo (title, status) VALUES ('Tarea a eliminar', 'To Do') RETURNING id"
      );
      testTodoId = insertRes.rows[0].id;
    });

    it('debería eliminar una tarea por su ID', async () => {
      const res = await request(app).delete(`/api/todo/${testTodoId}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Tarea eliminada exitosamente');
      expect(res.body.todo.id).toEqual(testTodoId);

      // Verifica que la tarea ya no exista
      const checkRes = await request(app).get(`/api/todo/${testTodoId}`);
      expect(checkRes.statusCode).toEqual(404);
    });

    it('debería devolver 404 si la tarea no se encuentra', async () => {
      const res = await request(app).delete('/api/todo/9999'); // ID que no existe
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toEqual('Tarea no encontrada');
    });

    it('debería devolver 400 si el ID es inválido', async () => {
      const res = await request(app).delete('/api/todo/abc');
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('ID inválido');
    });
  });
});
