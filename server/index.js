// Load environment variables from a .env file into process.env
require('dotenv').config();

// Import the Express framework for building the server
const express = require("express");
// Import the path module for working with file and directory paths
const path = require("path");
// Import the pg module to interact with PostgreSQL
const pg = require("pg");

// Create an instance of an Express application
const app = express();
// Set the port number from the environment or default to 3000
const port = process.env.PORT || 3000;
// Get the database connection URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

// Create a new PostgreSQL client using the connection string
const client = new pg.Client({
  connectionString: DATABASE_URL,
});

app.use(express.json()); // Middleware to parse JSON requests
app.use(require('morgan')('dev')) // Logging middleware


// Serve static files from the client/dist directory
// __dirname is the directory of the current file, so we navigate to '../client/dist'
app.use(express.static(path.join(__dirname, '../client/dist')));

// ... routes
//GET Departments
app.get('/api/departments', async (req, res, next) => {
  try {
    const SQL = `
      SELECT * from departments
    `
    const response = await client.query(SQL)
    res.send(response.rows)
  } catch (ex) {
    next(ex)
  }
})

//GET Employees
app.get('/api/employees', async (req, res, next) => {
  try {
    const SQL = `
      SELECT * from employees ORDER BY created_at DESC;
    `
    const response = await client.query(SQL)
    res.send(response.rows)
  } catch (ex) {
    next(ex)
  }
})

//POST or create an Employee
app.post("/api/employees", async(req, res, next) => {
  try {
      const SQL = `
      INSERT INTO employees(name, department_id) 
      VALUES ($1, (SELECT id from departments WHERE name=$2)) 
      RETURNING *
      `
      const response = await client.query(SQL, [
          req.body.name,
          req.body.departments
      ])
          res.send(response.rows)
  } catch(ex) {
      next(ex)
  }
})

//PUT or update an Employee
app.put('/api/employees/:id', async (req, res, next) => {
  try {
    const SQL = `
      UPDATE employees
      SET name=$1, department_id=$2, updated_at= now()
      WHERE id=$3 
      RETURNING *
    `
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
      req.params.id
    ])
    res.send(response.rows[0])
  } catch (ex) {
    next(ex)
  }
})

//DELETE an Employee
app.delete('/api/employees/:id', async (req, res, next) => {
  try {
    const SQL = `
      DELETE from employees
      WHERE id = $1
    `
    const response = await client.query(SQL, [req.params.id])
    res.sendStatus(204)
  } catch (ex) {
    next(ex)
  }
})


// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: err.message });
});

// ... init function

const init = async () => {
    await client.connect();

    const SQL = `
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS departments;
    
    CREATE TABLE departments(
    id SERIAL PRIMARY KEY,
    name VARCHAR(50)
    );
    
    CREATE TABLE employees(
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    department_id INTEGER REFERENCES departments(id) NOT NULL
    );
    
    INSERT INTO departments(name) VALUES('accounting'), ('creative'), ('it'), ('hr'); 
    INSERT INTO employees(name, department_id) VALUES('Donna', (SELECT id from departments WHERE name='accounting')),
    ('Alistair', (SELECT id from departments WHERE name='creative')),
    ('Tracey', (SELECT id from departments WHERE name='it')),
    ('Henry Russell', (SELECT id from departments WHERE name='hr'));`;

    // Execute the SQL commands to set up the database
    await client.query(SQL);
    // Log a message indicating that the database has been seeded successfully
    console.log('Data seeded');

    // Start the Express server on the defined port and log a message indicating the server is running
    app.listen(port, () => 
      console.log(`Listening on port ${port}`));  
}

init()

