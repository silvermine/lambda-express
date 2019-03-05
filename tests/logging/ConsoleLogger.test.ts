import {
   LogObject,
   LogLevel,
   DebugLogObject,
   LoggerConfig,
} from './../../src/logging/logging-types';
import levels from '../../src/logging/levels';
import isDebugLevelOrMoreVerbose from '../../src/logging/is-debug-level-or-more-verbose';
import { expect } from 'chai';
import ConsoleLogger from '../../src/logging/ConsoleLogger';
import _ from 'underscore';
import sinon, { SinonSpy } from 'sinon';

describe('ConsoleLogger', () => {

   const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
      interface: 'ALB',
      getTimeUntilFnTimeout: () => { return 0; },
   };

   let logSpy: SinonSpy;

   beforeEach(function() {
      logSpy = sinon.spy(console, 'log');
   });

   afterEach(function() {
      logSpy.restore();
   });

   describe('constructor', () => {

      it('defaults log level to "info"', () => {
         let logger = new ConsoleLogger({ interface: 'ALB', getTimeUntilFnTimeout: _.constant(0), fnStartTime: 0 });

         expect(logger.getLevel()).to.strictlyEqual('info');
      });

   });

   function findLessVerboseLogLevel(level: LogLevel): LogLevel | undefined {
      if (_.isUndefined(levels[level])) {
         return undefined;
      }
      return _.find(_.keys(levels) as LogLevel[], (potentiallyLessVerboseLevel) => {
         return levels[potentiallyLessVerboseLevel] > levels[level];
      });
   }

   function setupTestLogger(level: LogLevel): ConsoleLogger {
      return new ConsoleLogger(_.extend({}, DEFAULT_LOGGER_CONFIG, { level }));
   }

   function getLogLineAsString(index: number = 0): string {
      return logSpy.firstCall.args[index];
   }

   function getLogLineAsJSON(index: number = 0): LogObject | DebugLogObject {
      return JSON.parse(getLogLineAsString(index));
   }

   function createLoggerAndTest(level: Exclude<LogLevel, 'silent'>): ConsoleLogger {
      let logger = setupTestLogger(level),
          data = { customData: true, otherOption: { nested: 'yes' } },
          msg = 'My log message',
          logLine: LogObject | DebugLogObject;

      logger[level](msg, data);

      // Expect that we've only logged one message to the console
      sinon.assert.calledOnce(logSpy);

      logLine = getLogLineAsJSON(0);

      expect(getLogLineAsString(0)).to.be.a('string');
      expect(logLine).to.be.an('object');
      expect(logLine.level).to.strictlyEqual(level);
      expect(logLine.msg).to.strictlyEqual(msg);
      expect(logLine.data).to.eql(data);

      if (isDebugLevelOrMoreVerbose(level)) {
         let debugLogLine = logLine as DebugLogObject;

         expect(debugLogLine.int).to.strictlyEqual(DEFAULT_LOGGER_CONFIG.interface);
         expect(debugLogLine.timer).to.be.a('number');
         expect(debugLogLine.remaining).to.be.a('number');
         expect(debugLogLine.remaining).to.be.strictlyEqual(DEFAULT_LOGGER_CONFIG.getTimeUntilFnTimeout());
      }

      return logger;
   }

   function createLogFunctionTest(level: Exclude<LogLevel, 'silent'>): void {
      describe(level, () => {

         it('logs a message in the correct format', () => {
            createLoggerAndTest(level);
         });

         const lessVerboseLevel = findLessVerboseLogLevel(level);

         // Only perform the following test if there is a less verbose logging level
         // available. If a less verbose level does not exist, then there is no way to
         // filter the log message.
         if (lessVerboseLevel) {
            it('does not log a message when log level is less verbose', () => {
               let logger = setupTestLogger(lessVerboseLevel);

               logger[level]('test');

               sinon.assert.notCalled(logSpy);
            });
         }
      });
   }

   // Set up tests for each available log level
   _.forEach(_.keys(levels) as LogLevel[], (level: LogLevel) => {
      if (level !== 'silent') {
         createLogFunctionTest(level);
      }
   });

   describe('log level "silent"', () => {

      it('does not log any messages', () => {
         let logger = setupTestLogger('silent');

         _.forEach(_.keys(levels) as LogLevel[], (level: LogLevel) => {
            if (level !== 'silent') {
               logger[level]('test');
            }
         });

         sinon.assert.notCalled(logSpy);
      });

   });

   describe('getLevel', () => {

      it('gets the log level', () => {
         let logger = new ConsoleLogger({ level: 'warn', interface: 'APIGW', getTimeUntilFnTimeout: _.constant(2000) });

         expect(logger.getLevel()).to.strictlyEqual('warn');
      });

   });

   describe('setLevel', () => {

      it('allows updating the log level', () => {
         let logger = createLoggerAndTest('info');

         // Reset logSpy's history after createLoggerAndTest's tests
         logSpy.resetHistory();

         expect(logger.getLevel()).to.strictlyEqual('info');

         logger.setLevel('fatal');

         expect(logger.getLevel()).to.strictlyEqual('fatal');

         logger.trace('trace message');
         sinon.assert.notCalled(logSpy);
         logSpy.resetHistory();

         logger.debug('debug message');
         sinon.assert.notCalled(logSpy);
         logSpy.resetHistory();

         logger.warn('warn message');
         sinon.assert.notCalled(logSpy);
         logSpy.resetHistory();

         logger.error('error message');
         sinon.assert.notCalled(logSpy);
         logSpy.resetHistory();

         logger.fatal('fatal message');
         sinon.assert.calledOnce(logSpy);
         expect(logSpy.firstCall.args[0]).to.be.a('string');
      });

   });

});
