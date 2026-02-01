/**
 * Estimation Routes
 * 
 * Express routes for Phase 2 API endpoints
 * Following Boris Cherny's tips:
 * - Challenge Mode: Thin controllers, fat services
 * - Detailed Specs: Zod validation, typed responses
 * - Prove It Works: Comprehensive error handling
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { EstimationService, NotFoundError, DatabaseError, R2Error } from '../services/estimation.service.js';
import {
  GetUniverDataParamsSchema,
  GetTreeDataParamsSchema,
  GetAssetsParamsSchema,
  GetAssetsQuerySchema,
  type UniverDataResponse,
  type TreeDataResponse,
  type AssetsResponse,
  type APIErrorResponse,
  type GetUniverDataParamsInput,
  type GetTreeDataParamsInput,
  type GetAssetsParamsInput,
  type GetAssetsQueryInput,
} from '../types/estimation.js';

// ============================================================================
// ROUTER SETUP
// ============================================================================

export function createEstimationRoutes(service: EstimationService): Router {
  const router = Router();

  // ============================================================================
  // MIDDLEWARE: Request ID
  // ============================================================================
  router.use((req: Request, res: Response, next: NextFunction) => {
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    next();
  });

  // ============================================================================
  // ENDPOINT 1: GET /api/estimations/:id/univer-data
  // ============================================================================
  router.get('/:id/univer-data', async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`[API] ${req.requestId} - GET /estimations/${req.params.id}/univer-data`);

      // 1. Validate params
      const params = validateParams<GetUniverDataParamsInput>(
        req.params,
        GetUniverDataParamsSchema,
        req.requestId
      );

      // 2. Call service
      const response = await service.getUniverData(params.id);

      // 3. Send response
      res.json(response);

    } catch (error) {
      next(error);
    }
  });

  // ============================================================================
  // ENDPOINT 2: GET /api/estimations/:id/tree-data
  // ============================================================================
  router.get('/:id/tree-data', async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`[API] ${req.requestId} - GET /estimations/${req.params.id}/tree-data`);

      // 1. Validate params
      const params = validateParams<GetTreeDataParamsInput>(
        req.params,
        GetTreeDataParamsSchema,
        req.requestId
      );

      // 2. Parse query options (optional)
      const options = {
        includeEmptyNodes: req.query.includeEmpty === 'true',
        maxDepth: req.query.maxDepth ? parseInt(req.query.maxDepth as string, 10) : undefined,
      };

      // 3. Call service
      const response = await service.getTreeData(params.id, options);

      // 4. Send response
      res.json(response);

    } catch (error) {
      next(error);
    }
  });

  // ============================================================================
  // ENDPOINT 3: GET /api/estimations/:id/assets
  // ============================================================================
  router.get('/:id/assets', async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`[API] ${req.requestId} - GET /estimations/${req.params.id}/assets`, req.query);

      // 1. Validate params
      const params = validateParams<GetAssetsParamsInput>(
        req.params,
        GetAssetsParamsSchema,
        req.requestId
      );

      // 2. Validate query
      const query = validateQuery<GetAssetsQueryInput>(
        req.query,
        GetAssetsQuerySchema,
        req.requestId
      );

      // 3. Build options
      const options = {
        conceptCode: query.conceptCode,
        sheetType: query.sheetType,
        limit: query.limit || 20,
        offset: query.offset || 0,
        generateSignedUrls: req.query.signed !== 'false', // Default true
      };

      // 4. Call service
      const response = await service.getAssets(params.id, options);

      // 5. Send response with cache headers for assets
      res.setHeader('Cache-Control', 'private, max-age=300'); // 5 min client cache
      res.json(response);

    } catch (error) {
      next(error);
    }
  });

  // ============================================================================
  // ERROR HANDLER
  // ============================================================================
  router.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.requestId || 'unknown';
    const timestamp = new Date().toISOString();

    console.error(`[API] ${requestId} - Error:`, error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorResponse: APIErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: error.errors.reduce((acc, err) => {
            const path = err.path.join('.');
            acc[path] = err.message;
            return acc;
          }, {} as Record<string, string>),
          timestamp,
          requestId,
        },
      };
      return res.status(400).json(errorResponse);
    }

    // Handle custom errors
    if (error instanceof NotFoundError) {
      const errorResponse: APIErrorResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          timestamp,
          requestId,
        },
      };
      return res.status(404).json(errorResponse);
    }

    if (error instanceof DatabaseError) {
      const errorResponse: APIErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database operation failed',
          details: process.env.NODE_ENV === 'development' ? error.originalError : undefined,
          timestamp,
          requestId,
        },
      };
      return res.status(500).json(errorResponse);
    }

    if (error instanceof R2Error) {
      const errorResponse: APIErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Storage operation failed',
          timestamp,
          requestId,
        },
      };
      return res.status(500).json(errorResponse);
    }

    // Generic error
    const errorResponse: APIErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp,
        requestId,
      },
    };
    return res.status(500).json(errorResponse);
  });

  return router;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function validateParams<T>(params: unknown, schema: any, requestId: string): T {
  try {
    return schema.parse(params) as T;
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(`[API] ${requestId} - Validation error:`, error.errors);
    }
    throw error;
  }
}

function validateQuery<T>(query: unknown, schema: any, requestId: string): T {
  try {
    return schema.parse(query) as T;
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(`[API] ${requestId} - Query validation error:`, error.errors);
    }
    throw error;
  }
}

// ============================================================================
// TYPE DECLARATION EXTENSION
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}
