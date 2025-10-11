// Prometheus metrics registry - http requests, errors, AI cost
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// HTTP request total counter
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// HTTP request duration histogram (P95 ready)
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

// HTTP errors counter
export const httpErrorsTotal = new Counter({
  name: 'http_errors_total',
  help: 'Total HTTP errors',
  labelNames: ['route', 'type'],
  registers: [register]
});

// AI calls counter
export const aiCallsTotal = new Counter({
  name: 'ai_calls_total',
  help: 'Total AI API calls',
  labelNames: ['model'],
  registers: [register]
});

// AI cost cumulative counter (cents)
export const aiCostCentsTotal = new Counter({
  name: 'ai_cost_cents_total',
  help: 'Cumulative AI cost in cents',
  labelNames: ['model'],
  registers: [register]
});

// Optional: inflight requests gauge
export const inflightRequests = new Gauge({
  name: 'inflight_requests',
  help: 'Current number of inflight requests',
  registers: [register]
});

// Helper to record AI cost
export function recordAICost(model: string, cents: number) {
  aiCallsTotal.inc({ model });
  aiCostCentsTotal.inc({ model }, cents);
}
