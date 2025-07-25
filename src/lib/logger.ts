import winston, { createLogger, format, Logger } from "winston";
import LokiTransport from "winston-loki";
import { Request, Response, NextFunction } from "express";
import { v7 as uuid7 } from "uuid";
import { LoggingWinston } from "@google-cloud/logging-winston";

// Extend Express's Request type to include our custom logger property.
// This provides type safety for `req.logger`.
declare global {
    namespace Express {
        export interface Request {
            logger: Logger;
        }
    }
}

// Local CLI format that adds the request id to the message.
const localCliFormat = format((info) => {
    if (info.reqId) {
        info.message = `${info.reqId} - ${JSON.stringify(info.message, null, 2)}`;
    } else {
        info.message = `undefined - ${info.message}`;
    }
    return info;
});


// Gcloud Formatting
const gcloudFormat = format((info) => {
    if (info.reqId ) {
        info.message = {
            request_id: info.reqId,
            message: info.message,
        }
    } else {
        info.message = {
            request_id: "undefined",
            message: info.message,
        }
    }

    return info;
})

const gcloudWinston = new LoggingWinston({
    serviceContext: {
        service: "emify-backend",
    },
    logName: "emify-backend",
    level: "7",
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
    },
    format: winston.format.combine(
        gcloudFormat(),
        winston.format.json(),

    ),
    handleExceptions: true,
    handleRejections: true,
    silent: false,
})

// Global logger options now only include timestamp and JSON formatting.
const options: winston.LoggerOptions = {
    defaultMeta: { service: "emify-backend" },
    level: "debug",
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
    },
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()  // Removed cli() here to keep it clean for other transports.
    ),
    exitOnError: false,
    silent: false,
    transports: [
        // Console transport uses CLI formatting with color.
        new winston.transports.Console({
            format: format.combine(
                localCliFormat(),
                format.colorize(),
                format.timestamp(),
                format.cli()
            ),
        }),
        // Loki transport uses plain JSON and includes the custom request_id formatting.
        new LokiTransport({
            host: process.env.LOKI_HOST || "http://127.0.0.1:3100",
            format: format.combine(
                gcloudFormat(),
                format.json()
            ),
        }),
        gcloudWinston,
    ],
};

// Create one global logger instance to be shared across the application.
export const logger = createLogger(options);

export function reqIdGenMiddleware(req: Request, res: Response, next: NextFunction) {
    const existingReqId = req.headers["x-request-id"] as string;
    const reqId = existingReqId || uuid7();

    // Set header if it's a new request
    if (!existingReqId) {
        req.headers["x-request-id"] = reqId;
    }

    // Create a child logger with the reqId. All logs via req.logger will now have this field.
    req.logger = logger.child({ reqId });

    if (!existingReqId) {
        req.logger.debug(`Generated new request id: ${reqId} for ${req.method} ${req.path}`);
    }

    next();
}