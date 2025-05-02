import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
//import geminiRouter from './routes/gemini.js';
//import filesRouter from './routes/files.js';

dotenv.config();

const app = express();

// Configure CORS before other middleware
app.use(
  cors({
    origin: (origin, cb) => {
      console.log('CORS origin:', origin);
      cb(null, true);
    },
    credentials: true,
  })
);

// Configure express to handle larger payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const PORT = process.env.PORT || 3000;

console.log('[Server] Starting with configuration:', {
  port: PORT,
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message,
  });
});

//app.use('/api/gemini', geminiRouter);
//app.use('/api/files', filesRouter);

app.post('/api/auth/login', async (req, res) => {
  console.log('[Auth] Login attempt received:', {
    username: req.body.username,
    role: req.body.role,
    clientId: req.body.clientId,
  });

  try {
    const { username, role, clientId } = req.body;

    const user = {
      id: crypto.randomUUID(),
      username,
      role,
      clientId,
      createdAt: new Date(),
    };

    return res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      clientId: user.clientId,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
