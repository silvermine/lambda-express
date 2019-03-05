/* istanbul ignore next */

import { LambdaEventSourceType } from '../request-response-types';

/**
 * A union of all available logging levels.
 *
 * @see ILogger#setLevel
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

export interface ILogger {

   /**
    * Log a message at the `trace` log level. The logger will only log a message for this
    * method if the log level is set to `trace`.
    *
    * @param msg The message to log
    * @param data Custom data to add to the log message. Added to the log object under the
    * `data` key.
    */
   trace(msg: string, data: unknown): void;

   /**
    * Log a message at the `debug` log level. The logger will only log a message for this
    * method if the log level is set to `'debug'`, or a more verbose level.
    *
    * @param msg The message to log
    * @param data Custom data to add to the log message. Added to the log object under the
    * `data` key.
    */
   debug(msg: string, data: unknown): void;

   /**
    * Log a message at the `info` log level. The logger will only log a message for this
    * method if the log level is set to `'info'`, or a more verbose level.
    *
    * @param msg The message to log
    * @param data Custom data to add to the log message. Added to the log object under the
    * `data` key.
    */
   info(msg: string, data: unknown): void;

   /**
    * Log a message at the `warn` log level. The logger will only log a message for this
    * method if the log level is set to `'warn'`, or a more verbose level.
    *
    * @param msg The message to log
    * @param data Custom data to add to the log message. Added to the log object under the
    * `data` key.
    */
   warn(msg: string, data: unknown): void;

   /**
    * Log a message at the `error` log level. The logger will only log a message for this
    * method if the log level is set to `'error'`, or a more verbose level.
    *
    * @param msg The message to log
    * @param data Custom data to add to the log message. Added to the log object under the
    * `data` key.
    */
   error(msg: string, data: unknown): void;

   /**
    * Log a message at the `fatal` log level. The logger will always log a message unless
    * the log level is set to `'silent'`.
    *
    * @param msg The message to log
    * @param data Custom data to add to the log message. Added to the log object under the
    * `data` key.
    */
   fatal(msg: string, data: unknown): void;

   /**
    * Gets the current logging level.
    *
    * @see `setLogLevel`
    */
   getLevel(): LogLevel;

   /**
    * Sets the log level. This is a list of all available log levels, ordered from most
    * verbose to least verbose:
    *
    *    * `trace`
    *    * `debug`
    *    * `info`
    *    * `warn`
    *    * `error`
    *    * `fatal`
    *    * `silent`
    *
    * The logger's level determines which messages are logged and which ones are ignored.
    * When the logger's level is set to one of these values, any message that is given to
    * the logger to be logged with a level that is *more verbose* than the logger's
    * current log level will *not* be logged. For example:
    *
    * ```
    * // Note that this logger's level is set to `info`
    * const logger = new ConsoleLogger({
    *    level: 'info',
    *    interface: 'ALB',
    *    getTimeUntilFnTimeout: () => { return 0; }
    * });
    *
    * // `error` is *less* verbose than `info` so this message is logged
    * logger.error('error');
    *
    * // `debug` is *more* verbose than `info`, so this message is NOT logged
    * logger.debug('debug');
    *
    * logger.setLevel('trace');
    * // `debug` is *less* verbose than `trace`, so this message is logged
    * logger.debug('debug');
    * ```
    *
    * Setting the log level to `'silent'` disables all logging.
    */
   setLevel(level: LogLevel): void;

}

// We have to use a `type` instead of an `interface` here because interfaces do not
// support indexes using `key in`.
export type LogLevels = {
   readonly [key in LogLevel]: number;
};

/**
 * Configuration to initialize a `Logger` with.
 */
export interface LoggerConfig {

   /**
    * The type of event interface that triggered the current `Request`.
    */
   interface: LambdaEventSourceType;

   /**
    * The current Lambda function's timeout threshold, in milliseconds.
    */
   getTimeUntilFnTimeout: () => number;

   /**
    * The current log level. See description on `ILogger#setLevel`.
    *
    * @default 'info'
    */
   level?: LogLevel;

   /**
    * The epoch time (in milliseconds) at which the current Lambda function was triggered.
    */
   fnStartTime?: number;

}

/**
 * The format of a standard log line.
 */
export interface LogObject {

   /**
    * @see LogLevel
    */
   level: LogLevel;

   /**
    * The message to log.
    */
   msg: string;

   /**
    * Any kind of data to add to the logged JSON object.
    */
   data?: unknown;

}

/**
 * The format of a log line with extra debugging info added.
 */
export interface DebugLogObject extends LogObject {

   /**
    * Execution time, in milliseconds, up until log was generated.
    */
   timer: number;

   /**
    * The remaining milliseconds until the Lambda function times out.
    */
   remaining: number;

   /**
    * The Lambda event source type that triggered the current `Request`.
    */
   int: LambdaEventSourceType;

}
