import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

export interface WebhookRequest extends Request {
    rawBody: string;
    webhookSignature: string;
}

// Rate limiting específico para webhooks
export const webhookRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // máximo 100 requests por minuto por IP
    message: 'Too many webhook requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware para validar webhook
export const webhookValidationMiddleware = (req: WebhookRequest, res: Response, next: NextFunction) => {
    // Verificar que tenemos la firma de Stripe
    const signature = req.headers['stripe-signature'];

    if (!signature) {
        console.error('Missing Stripe signature headera');
        return res.status(400).json({
            error: 'Missing stripe-signature header',
            code: 'MISSING_SIGNATURE'
        });
    }

    // Verificar que tenemos el webhook secret configurado
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({
            error: 'Webhook secret not configured',
            code: 'MISSING_WEBHOOK_SECRET'
        });
    }

    // Verificar que tenemos un body
    if (!req.body) {
        console.error('Missing request body');
        return res.status(400).json({
            error: 'Missing request body',
            code: 'MISSING_BODY'
        });
    }

    // Agregar datos al request para el handler
    req.webhookSignature = signature as string;
    req.rawBody = req.body.toString();

    // Log del evento recibido
    console.log(`Webhook received with signature: ${signature.toString().substring(0, 20)}...`);

    next();
};

export const webhookLoggingMiddleware = (req: WebhookRequest, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Log request
    console.log(`[WEBHOOK] ${new Date().toISOString()} - Incoming webhook from IP: ${req.ip}`);

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(body) {
        const duration = Date.now() - start;
        console.log(`[WEBHOOK] ${new Date().toISOString()} - Response: ${res.statusCode} (${duration}ms)`);
        return originalJson.call(this, body);
    };

    next();
};