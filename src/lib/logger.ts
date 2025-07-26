import { LoggingWinston } from "@google-cloud/logging-winston";
import { NextFunction, Request, Response } from "express";
import { v7 as uuid7 } from "uuid";
import winston, { createLogger, format } from "winston";
import LokiTransport from "winston-loki";



// Local CLI format that adds the request id to the message.
const localCliFormat = format((info) => {
    if (info.reqId) {
        info.message = `${info.reqId as string} - ${JSON.stringify(info.message, null, 2)}`;
    } else {
        info.message = `undefined - ${info.message as string}`;
    }
    return info;
});


// Gcloud Formatting
const gcloudFormat = format((info) => {
    if (info.reqId ) {
        info.message = {
            message: info.message,
            request_id: info.reqId,
        }
    } else {
        info.message = {
            message: info.message,
            request_id: "undefined",
        }
    }

    return info;
})

const gcloudWinston = new LoggingWinston({
    format: winston.format.combine(
        gcloudFormat(),
        winston.format.json(),

    ),
    handleExceptions: true,
    handleRejections: true,
    level: "7",
    levels: {
        debug: 5,
        error: 0,
        http: 3,
        info: 2,
        silly: 6,
        verbose: 4,
        warn: 1,
    },
    logName: "emify-backend",
    serviceContext: {
        service: "emify-backend",
    },
    silent: false,
})

// Global logger options now only include timestamp and JSON formatting.
const options: winston.LoggerOptions = {
    defaultMeta: { service: "emify-backend" },
    exitOnError: false,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()  // Removed cli() here to keep it clean for other transports.
    ),
    level: "debug",
    levels: {
        debug: 5,
        error: 0,
        http: 3,
        info: 2,
        silly: 6,
        verbose: 4,
        warn: 1,
    },
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
            format: format.combine(
                gcloudFormat(),
                format.json()
            ),
            host: process.env.LOKI_HOST ?? "http://127.0.0.1:3100",
        }),
        gcloudWinston,
    ],
};

// Create one global logger instance to be shared across the application.
export const logger = createLogger(options);

export function reqIdGenMiddleware(req: Request, res: Response, next: NextFunction) {
    const existingReqId = req.headers["x-request-id"] as string;
    const reqId = existingReqId || uuid7();

    // Set the header if it's a new request
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