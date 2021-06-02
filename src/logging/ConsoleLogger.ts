import _ from 'underscore';
import {
   ILogger,
   LogObject,
   LoggerConfig,
   LogLevel,
   DebugLogObject,
} from './logging-types';
import levels from './levels';
import isDebugLevelOrMoreVerbose from './is-debug-level-or-more-verbose';
import { LambdaEventSourceType } from '../request-response-types';

export default class ConsoleLogger implements ILogger {

   protected _level: LogLevel;
   protected _interface: LambdaEventSourceType;
   protected _getTimeUntilFnTimeout: () => number;
   protected _fnStartTime: number;

   public constructor(config: LoggerConfig) {
      this._level = config.level || 'info';
      this._interface = config.interface;
      this._fnStartTime = typeof config.fnStartTime === 'undefined' ? Date.now() : config.fnStartTime;
      this._getTimeUntilFnTimeout = config.getTimeUntilFnTimeout;
   }

   public trace(msg: string, data?: unknown): void {
      this._log('trace', msg, data);
   }

   public debug(msg: string, data?: unknown): void {
      this._log('debug', msg, data);
   }

   public info(msg: string, data?: unknown): void {
      this._log('info', msg, data);
   }

   public warn(msg: string, data?: unknown): void {
      this._log('warn', msg, data);
   }

   public error(msg: string, data?: unknown): void {
      this._log('error', msg, data);
   }

   public fatal(msg: string, data?: unknown): void {
      this._log('fatal', msg, data);
   }

   public getLevel(): LogLevel {
      return this._level;
   }

   public setLevel(level: LogLevel): void {
      this._level = level;
   }

   /**
    * Perform the actual message logging
    */
   protected _log(level: LogLevel, msg: string, data?: unknown): void {
      if (this._shouldLog(level) && level !== 'silent') {
         const method = level === 'fatal' ? 'error' : level;

         // eslint-disable-next-line no-console
         console[method](JSON.stringify(this._makeLogObject(level, msg, data)));
      }
   }

   /**
    * @returns `true` if the given level should be logged at this logger's current log
    * level setting.
    */
   protected _shouldLog(level: LogLevel): boolean {
      // Log if the level is higher priority than the current log level setting.
      // e.g. error (50) >= info (30)
      return levels[level] >= levels[this._level];
   }

   /**
    * Creates an object to be logged
    */
   protected _makeLogObject(level: LogLevel, msg: string, data?: unknown): LogObject | DebugLogObject {
      let logLine: LogObject = { level, msg };

      if (!_.isUndefined(data)) {
         logLine.data = data;
      }

      if (isDebugLevelOrMoreVerbose(level)) {
         let debugLogLine = logLine as DebugLogObject;

         debugLogLine.int = this._interface;
         debugLogLine.remaining = this._getTimeUntilFnTimeout();
         debugLogLine.timer = this._getTimeSinceFnStart();

         return debugLogLine;
      }

      return logLine;
   }

   /**
    * The approximate time, in milliseconds, since the Lambda function started executing.
    */
   protected _getTimeSinceFnStart(): number {
      return Date.now() - this._fnStartTime;
   }
}
