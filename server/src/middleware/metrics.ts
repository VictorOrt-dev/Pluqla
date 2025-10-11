import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

const { register, Counter, Histogram, Gauge } = promClient;

// METRICS_ENABLED=false disables all metric collection (feature-flag fallback for low-resource envs)
const metricsEnabled = process.env.METRICS_ENABLED !== 'false';
const authToken = process.env.METRICS_AUTH_TOKEN;

// Define metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: metricsEnabled ? [register] : [],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: metricsEnabled ? [register] : [],
});

const httpErrorsTotal = new Counter({
  name: 'http_errors_total',
  help: 'Total HTTP errors',
  labelNames: ['route', 'type'],
  registers: metricsEnabled ? [register] : [],
});

const inflightRequests = new Gauge({
  name: 'inflight_requests',
  help: 'Requests currently being processed',
  registers: metricsEnabled ? [register] : [],
});

const aiCallsTotal = new Counter({
  name: 'ai_calls_total',
  help: 'Total AI API calls',
  labelNames: ['model'],
  registers: metricsEnabled ? [register] : [],
});

const aiCostCentsTotal = new Counter({
  name: 'ai_cost_cents_total',
  help: 'Total AI cost in cents',
  registers: metricsEnabled ? [register] : [],
});

// Middleware to track HTTP metrics
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!metricsEnabled) {
    return next();
  }

  const start = Date.now();
  inflightRequests.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = (req.route?.path || req.path).replace(/\d+/g, ':id');
    const labels = { method: req.method, route, status: res.statusCode };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc({ route, type: res.statusCode >= 500 ? 'server' : 'client' });
    }

    inflightRequests.dec();
  });

  next();
}

// Metrics endpoint handler with optional auth
export function registerMetricsEndpoint(req: Request, res: Response): void {
  if (!metricsEnabled) {
    res.set('Content-Type', register.contentType);
    return res.end('');
  }

  if (authToken) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${authToken}`) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    }
  }

  res.set('Content-Type', register.contentType);
  register.metrics().then((metrics) => res.end(metrics));
}

// Helper to record AI usage
export function recordAiCall(params: { model: string; costCents: number }): void {
  if (!metricsEnabled) return;
  aiCallsTotal.inc({ model: params.model });
  aiCostCentsTotal.inc(params.costCents);
}

// Export register for tests
export function getRegister() {
  return register;
}
