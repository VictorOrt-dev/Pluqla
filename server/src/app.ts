// Express app configuration - metrics, logging, validation, error handling
import express from 'express';
import { requestLogger } from './middleware/logger';
import { observeRequest } from './middleware/metrics';
import { errorHandler } from './middleware/errorHandler';
import { register } from './observability/metricsRegistry';
import { health, readiness } from './health/healthcheck';
import exampleRoutes from './routes/example';

const app = express();

app.use(express.json());
app.use(requestLogger);
app.use(observeRequest);

// Routes
app.get('/health', health);
app.get('/ready', readiness);
app.use('/api', exampleRoutes);

// Metrics endpoint (protect in prod with METRICS_AUTH_TOKEN header)
app.get(process.env.METRICS_SCRAPE_PATH || '/metrics', (req, res) => {
  const token = process.env.METRICS_AUTH_TOKEN;
  if (token && req.headers.authorization !== `Bearer ${token}`) {
    return res.status(403).send('Forbidden');
  }
  res.set('Content-Type', register.contentType);
  register.metrics().then(metrics => res.send(metrics));
});

// Error handler (last)
app.use(errorHandler);

export default app;
