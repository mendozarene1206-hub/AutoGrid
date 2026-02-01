/**
 * Routes Index
 * 
 * Central export for all API routes
 */

import { Router } from 'express';
import { createEstimationRoutes } from './estimations.js';
import { EstimationService } from '../services/estimation.service.js';
import { S3Client } from '@aws-sdk/client-s3';

export function createRoutes(s3: S3Client): Router {
  const router = Router();

  // Initialize services
  const estimationService = new EstimationService(
    {
      r2Bucket: process.env.R2_BUCKET!,
      r2PublicUrl: process.env.R2_PUBLIC_URL!,
      signedUrlExpirySeconds: 3600, // 1 hour
      maxTreeDepth: 10,
      defaultLimit: 20,
      maxLimit: 100,
    },
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    s3
  );

  // Mount routes
  router.use('/estimations', createEstimationRoutes(estimationService));

  return router;
}

// Re-export individual route creators for testing
export { createEstimationRoutes } from './estimations.js';
