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

const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
   interface: 'ALB',
   getTimeUntilFnTimeout: () => { return 0; },
};

describe('ConsoleLogger', () => {

   interface Spies {
      log: SinonSpy;
      trace: SinonSpy;
      debug: SinonSpy;
      info: SinonSpy;
      warn: SinonSpy;
      error: SinonSpy;
   }

   let spies: Spies;

   beforeEach(function() {
      spies = {
         log: sinon.spy(console, 'log'),
         trace: sinon.spy(console, 'trace'),
         debug: sinon.spy(console, 'debug'),
         info: sinon.spy(console, 'info'),
         warn: sinon.spy(console, 'warn'),
         error: sinon.spy(console, 'error'),
      };
   });

   afterEach(function() {
      Object.keys(spies).forEach((k) => {
         spies[k as keyof Spies].restore();
      });
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

   function getLogLineAsString(spy: SinonSpy, index: number = 0): string {
      return spy.firstCall.args[index];
   }

   function getSpy(level: LogLevel): SinonSpy {
      switch (level) {
         case 'silent': { return spies.log; }
         case 'fatal': { return spies.error; }
         default: { return spies[level]; }
      }
   }

   function getLogLineAsJSON(level: Exclude<LogLevel, 'silent'>, index: number = 0): LogObject | DebugLogObject {
      return JSON.parse(getLogLineAsString(getSpy(level), index));
   }

   function createLoggerAndTest(level: Exclude<LogLevel, 'silent'>): ConsoleLogger {
      let logger = setupTestLogger(level),
          data = { customData: true, otherOption: { nested: 'yes' } },
          msg = 'My log message',
          logLine: LogObject | DebugLogObject;

      logger[level](msg, data);

      // Expect that we've only logged one message to the console
      sinon.assert.calledOnce(getSpy(level));

      logLine = getLogLineAsJSON(level, 0);

      expect(getLogLineAsString(getSpy(level), 0)).to.be.a('string');
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

               sinon.assert.notCalled(getSpy(level));
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

         Object.keys(spies).forEach((k) => {
            sinon.assert.notCalled(getSpy(k as LogLevel));
         });
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

         // Reset spies' history after createLoggerAndTest's tests
         Object.keys(spies).forEach((k) => {
            getSpy(k as LogLevel).resetHistory();
         });

         expect(logger.getLevel()).to.strictlyEqual('info');

         logger.setLevel('fatal');

         expect(logger.getLevel()).to.strictlyEqual('fatal');

         const assertNoneBesidesFatalCalled = (): void => {
            Object.keys(spies).forEach((k) => {
               if (k === 'error') {
                  return;
               }

               const spy = getSpy(k as LogLevel);

               sinon.assert.notCalled(spy);
               spy.resetHistory();
            });
         };

         logger.trace('trace message');
         assertNoneBesidesFatalCalled();

         logger.debug('debug message');
         assertNoneBesidesFatalCalled();

         logger.warn('warn message');
         assertNoneBesidesFatalCalled();

         logger.error('error message');
         assertNoneBesidesFatalCalled();

         logger.fatal('fatal message');
         assertNoneBesidesFatalCalled();
         sinon.assert.calledOnce(spies.error);
         expect(spies.error.firstCall.args[0]).to.be.a('string');
      });

   });

});
