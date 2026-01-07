import express, { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { WebhookService } from '../services/webhook.service';
import rateLimit from 'express-rate-limit';

// Interfaz para el request con propiedades adicionales
interface StripeWebhookRequest extends Request {
    rawBody: string;
    webhookSignature: string;
    em: any;
}

// Rate limiting para webhooks
const webhookRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // máximo 100 requests por minuto
    message: { error: 'Too many webhook requests' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting en desarrollo
        return process.env.NODE_ENV === 'development';
    }
});

// Middleware de validación para webhooks
const webhookValidation: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
        console.error('Missing Stripe signature header');
        return res.status(400).json({
            error: 'Missing stripe-signature header',
            code: 'MISSING_SIGNATURE'
        });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({
            error: 'Webhook secret not configured',
            code: 'MISSING_WEBHOOK_SECRET'
        });
    }

    if (!req.body) {
        console.error('Missing request body');
        return res.status(400).json({
            error: 'Missing request body',
            code: 'MISSING_BODY'
        });
    }

    // Agregar propiedades al request
    (req as StripeWebhookRequest).webhookSignature = signature as string;
    (req as StripeWebhookRequest).rawBody = req.body.toString();

    console.log(`[WEBHOOK] Received webhook with signature: ${signature.toString().substring(0, 20)}...`);
    next();
};

// Handler principal del webhook
const handleStripeWebhook: RequestHandler = async (req: Request, res: Response) => {
    const webhookReq = req as StripeWebhookRequest;

    // Verificar que tenemos EntityManager
    if (!webhookReq.em) {
        console.error('EntityManager not found in request');
        return res.status(500).json({
            error: 'Database connection error',
            code: 'MISSING_ENTITY_MANAGER'
        });
    }

    const webhookService = new WebhookService(webhookReq.em);
    const startTime = Date.now();

    try {
        console.log(`[WEBHOOK] Processing webhook...`);

        await webhookService.processWebhook(webhookReq.rawBody, webhookReq.webhookSignature);

        const duration = Date.now() - startTime;
        console.log(`[WEBHOOK] Successfully processed in ${duration}ms`);

        res.status(200).json({
            received: true,
            processed: true,
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`[WEBHOOK] Processing failed in ${duration}ms:`, {
            error: error.message,
            stack: error.stack,
        });

        res.status(400).json({
            received: true,
            processed: false,
            error: 'Webhook processing failed',
            message: error.message,
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`
        });
    }
};

// Configuración del router
export const stripeWebhookRouter: Router = express.Router();

// Logging middleware para debugging
stripeWebhookRouter.use((req, res, next) => {
    console.log(`[WEBHOOK] ${new Date().toISOString()} - ${req.method} ${req.path} from ${req.ip}`);
    next();
});

// Configurar el endpoint
stripeWebhookRouter.post('/stripe',
    webhookRateLimit,
    express.raw({ type: 'application/json' }), // ¡IMPORTANTE! Raw body aquí
    webhookValidation,
    handleStripeWebhook
);