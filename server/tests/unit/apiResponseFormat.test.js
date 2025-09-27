/**
 * API Response Format Tests
 * Tests for universal API response format implementation
 * Version: 2.0.0 - Phase 2 Stabilization
 */

const request = require('supertest');
const express = require('express');
const { sendSuccess, sendError } = require('../../src/utils/responseHelper');

describe('Universal API Response Format', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Add request tracking middleware
    app.use((req, res, next) => {
      res.locals.requestId = 'test-' + Date.now();
      res.locals.requestStartTime = Date.now();
      next();
    });

    // Test endpoints
    app.get('/test/success', (req, res) => {
      sendSuccess(res, { message: 'Test data' }, 'Operation successful');
    });

    app.get('/test/success-empty', (req, res) => {
      sendSuccess(res);
    });

    app.get('/test/error', (req, res) => {
      sendError(res, 'Test error occurred', 400, [{ message: 'Test error occurred' }]);
    });

    app.get('/test/error-validation', (req, res) => {
      sendError(res, 'Validation failed', 422, [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password must be at least 8 characters' }
      ]);
    });
  });

  describe('Success Response Format', () => {
    it('should return proper success response structure', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('errors', []);

      // Verify meta structure
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('executionTime');
      expect(response.body.meta).toHaveProperty('requestId');
      expect(response.body.meta).toHaveProperty('apiVersion', '2.0.0');

      // Verify data content
      expect(response.body.data).toEqual({ message: 'Test data' });
    });

    it('should handle empty data correctly', async () => {
      const response = await request(app)
        .get('/test/success-empty')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
      expect(response.body.errors).toEqual([]);
    });

    it('should include valid timestamp format', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);

      const timestamp = response.body.meta.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      const parsedDate = new Date(timestamp);
      expect(parsedDate).toBeInstanceOf(Date);
      expect(parsedDate.getTime()).not.toBeNaN();
    });

    it('should include execution time', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);

      const executionTime = response.body.meta.executionTime;
      expect(executionTime).toMatch(/^\d+ms$/);

      const timeValue = parseInt(executionTime.replace('ms', ''));
      expect(timeValue).toBeGreaterThanOrEqual(0);
    });

    it('should include request ID', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);

      expect(response.body.meta.requestId).toMatch(/^test-\d+$/);
    });
  });

  describe('Error Response Format', () => {
    it('should return proper error response structure', async () => {
      const response = await request(app)
        .get('/test/error')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('data', null);
      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('errors');

      // Verify errors structure
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0]).toHaveProperty('message', 'Test error occurred');
    });

    it('should handle validation errors correctly', async () => {
      const response = await request(app)
        .get('/test/error-validation')
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveLength(2);

      expect(response.body.errors[0]).toEqual({
        field: 'email',
        message: 'Email is required'
      });

      expect(response.body.errors[1]).toEqual({
        field: 'password',
        message: 'Password must be at least 8 characters'
      });
    });

    it('should maintain consistent meta structure in errors', async () => {
      const response = await request(app)
        .get('/test/error')
        .expect(400);

      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('executionTime');
      expect(response.body.meta).toHaveProperty('requestId');
      expect(response.body.meta).toHaveProperty('apiVersion', '2.0.0');
    });
  });

  describe('Response Helper Functions', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        locals: {
          requestId: 'test-123',
          requestStartTime: Date.now() - 100
        },
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });

    it('should handle sendSuccess with all parameters', () => {
      const testData = { id: 1, name: 'Test' };
      const testMessage = 'Success message';

      sendSuccess(mockRes, testData, testMessage, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: testData,
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            executionTime: expect.any(String),
            requestId: 'test-123',
            apiVersion: '2.0.0'
          }),
          errors: []
        })
      );
    });

    it('should handle sendError with validation errors', () => {
      const validationErrors = [
        { field: 'name', message: 'Name is required' }
      ];

      sendError(mockRes, 'Validation failed', 422, validationErrors);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          data: null,
          errors: validationErrors
        })
      );
    });
  });
});