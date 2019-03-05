import { LogLevels } from './logging-types';

/**
 * A map of all available log levels. The key is the `LogLevelLabel` and the value is the
 * "priority". The logger's log level is set to one of these keys. When a message logging
 * function such as `debug` is called, it is only logged if the message's "priority" is
 * greater than or equal to the priority of the current log level. For example:
 *
 * ```
 * const logger = new ConsoleLogger({
 *    level: 'info',
 *    interface: 'ALB',
 *    getTimeUntilFnTimeout: () => { return 0; }
 * });
 *
 * // error (priority: 50) is >= info (priority: 30), so this message is logged
 * logger.error('error');
 *
 * // debug (priority: 20) is NOT >= info (priority 30), so this message is NOT logged
 * logger.debug('debug');
 * ```
 *
 * Logging level priorities are for internal use and are not exposed on the public API.
 * Users of the public API adjust the logging level using the `LogLevel` strings.
 */
const levels: LogLevels = {
   trace: 10,
   debug: 20,
   info: 30,
   warn: 40,
   error: 50,
   fatal: 60,
   silent: Number.MAX_SAFE_INTEGER,
};

export default levels;
