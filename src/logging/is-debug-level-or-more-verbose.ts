import { LogLevel } from './logging-types';
import levels from './levels';

/**
 * @returns `true` if the given log level is `'debug'` or a more verbose level (e.g.
 * `'trace'`).
 */
export default function isDebugLevelOrMoreVerbose(level: LogLevel): boolean {
   // More verbose levels have lower priority numbers
   return levels[level] <= levels.debug;
}
