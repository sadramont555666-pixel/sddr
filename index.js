// File: apps/web/index.js
import { createServer } from '@hono/node-server';
import app from './build/server/__create/index.js'; // Importing the compiled Hono app

const port = process.env.PORT || 3000;

// Create the Node.js server from our Hono app
const server = createServer(app);

// Start listening on the port provided by Vercel
server.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});

