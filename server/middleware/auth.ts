import { Request, Response, NextFunction } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';

// Initialize Auth0 middleware
const validateAccessToken = process.env.NODE_ENV === 'production'
  ? auth({
      audience: process.env.AUTH0_AUDIENCE,
      issuer: process.env.AUTH0_ISSUER_BASE_URL,
      jwksUri: `${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`,
      tokenSigningAlg: 'RS256'
    })
  : (req: Request, res: Response, next: NextFunction) => {
      console.log('Development mode - skipping token validation');
      next();
    };

// Wrap the middleware to handle WebSocket authentication later
const wsAuth = async (token: string): Promise<boolean> => {
  try {
    // TODO: Implement token validation for WebSocket connections
    // This will need to validate the token without Express request/response
    return true;
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    return false;
  }
};

export { validateAccessToken, wsAuth };
