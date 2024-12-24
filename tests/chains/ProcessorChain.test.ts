import _ from 'underscore';
import ProcessorChain, { IProcessorChain } from '../../src/chains/ProcessorChain';
import { expect } from 'chai';
import { wrapRequestProcessors } from '../../src/utils/wrapRequestProcessor';
import { SinonSpy, spy, stub, assert } from 'sinon';
import makeRequestProcessor from '../test-utils/makeRequestProcessor';
import { Application, Request, Response } from '../../src';
import { makeAPIGatewayRequestEvent, handlerContext } from '../samples';

function assertAllCalledOnceInOrder(...spies: SinonSpy[]): void {
   _.each(spies, (s) => { assert.calledOnce(s); });
   assert.callOrder(...spies);
}

function assertNotCalled(...spies: SinonSpy[]): void {
   _.each(spies, (s) => { assert.notCalled(s); });
}

function assertCalledWith(fn: SinonSpy, err: string, realError: boolean = false): void {
   expect(fn.lastCall.args.length).to.eql(1);
   if (realError) {
      expect(fn.lastCall.args[0]).to.be.an.instanceOf(Error);
      expect(fn.lastCall.args[0].message).to.eql(err);
   } else {
      expect(fn.lastCall.args[0]).to.eql(err);
   }
}

class TestProcessorChain extends ProcessorChain {
   // override protected methods as public for the sake of making them testable
   public _makeSubRequest(req: Request): Request {
      return super._makeSubRequest(req);
   }
}

describe('ProcessorChain', () => {
   let app: Application, req: Request, resp: Response, done: SinonSpy;

   beforeEach(() => {
      app = new Application();
      req = new Request(app, makeAPIGatewayRequestEvent(), handlerContext());
      resp = new Response(app, req, spy());
      done = spy();
   });

   const makeChain = (procs: SinonSpy[]): IProcessorChain => {
      return new ProcessorChain(wrapRequestProcessors(procs));
   };

   const makeDoneFn = (endTest: Mocha.Done, tests: (args: any[]) => void): (() => void) => {
      return (...args) => {
         try {
            tests(args);
            endTest();
         } catch(err) {
            endTest(err);
         }
      };
   };

   it('calls processors in correct order - no error handlers and no errors', () => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2'),
         /* 2 */ makeRequestProcessor('mw3'),
         /* 3 */ makeRequestProcessor('rh1'),
         /* 4 */ makeRequestProcessor('rh2'),
      ];

      makeChain(procs).run(undefined, req, resp, done);
      assertAllCalledOnceInOrder(...procs, done);
      assert.calledWithExactly(done); // `done` called with no args
   });

   it('calls async processors returning promises in correct order - no error handlers and no errors', (endTest) => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1', { returnsResolvedPromise: true }),
         /* 1 */ makeRequestProcessor('mw2'),
         /* 2 */ makeRequestProcessor('mw3', { returnsResolvedPromise: true }),
         /* 3 */ makeRequestProcessor('rh1'),
         /* 4 */ makeRequestProcessor('rh2'),
         /* 5 */ makeRequestProcessor('rh3', { returnsResolvedPromise: true }),
      ];

      makeChain(procs).run(undefined, req, resp, makeDoneFn(endTest, (args) => {
         assertAllCalledOnceInOrder(...procs);
         expect(args).to.eql([]); // callback was called with no args
      }));
   });

   it('does not call error handlers when no errors', (endTest) => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('rh1'),
         /* 2 */ makeRequestProcessor('eh1', { handlesErrors: true }),
         /* 3 */ makeRequestProcessor('mw2'),
         /* 4 */ makeRequestProcessor('rh2'),
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true, returnsResolvedPromise: true }),
         /* 6 */ makeRequestProcessor('rh3'),
         /* 7 */ makeRequestProcessor('eh3', { handlesErrors: true }),
      ];

      makeChain(procs).run(undefined, req, resp, makeDoneFn(endTest, (args) => {
         assertAllCalledOnceInOrder(procs[0], procs[1], procs[3], procs[4], procs[6]);
         assertNotCalled(procs[2], procs[5], procs[7]);
         expect(args).to.eql([]); // callback was called with no args
      }));
   });

   it('skips to error handlers on first thrown error', () => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { throwsError: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true }),
         // since the first error handler does not pass the error on when it calls `next`,
         // this second error handler will not be called
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true }),
      ];

      makeChain(procs).run(undefined, req, resp, done);
      assertAllCalledOnceInOrder(procs[0], procs[1], procs[4], done);
      assertNotCalled(procs[2], procs[3], procs[5]);
      assert.calledWithExactly(done); // `done` called with no args
   });

   it('skips to error handlers on first rejected promise', (endTest) => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { returnsRejectedPromise: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true }),
         // since the first error handler does not pass the error on when it calls `next`,
         // this second error handler will not be called
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true }),
      ];

      makeChain(procs).run(undefined, req, resp, makeDoneFn(endTest, (args) => {
         assertAllCalledOnceInOrder(procs[0], procs[1], procs[4]);
         assertNotCalled(procs[2], procs[3], procs[5]);
         expect(args).to.eql([]); // callback was called with no args
      }));
   });

   it('calls subsequent error handlers when thrown error is passed on (thrown error)', () => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { throwsError: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true, passesErrorToNext: true }),
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true, passesErrorToNext: true }),
      ];

      makeChain(procs).run(undefined, req, resp, done);
      assertAllCalledOnceInOrder(procs[0], procs[1], procs[4], procs[5], done);
      assertNotCalled(procs[2], procs[3]);
      assertCalledWith(done, 'Error from "mw2"', true); // `done` called with Error(string)
   });

   it('skips to error handlers on first rejected promise (empty rejection)', (endTest) => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { returnsEmptyRejectedPromise: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true }),
         // since the first error handler does not pass the error on when it calls `next`,
         // this second error handler will not be called
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true }),
      ];

      makeChain(procs).run(undefined, req, resp, makeDoneFn(endTest, (args) => {
         assertAllCalledOnceInOrder(procs[0], procs[1], procs[4]);
         assertNotCalled(procs[2], procs[3], procs[5]);
         expect(args).to.eql([]); // callback was called with no args
      }));
   });

   it('calls subsequent error handlers when a rejected promise\'s error is passed on', (endTest) => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { returnsRejectedPromise: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true, passesErrorToNext: true }),
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true, passesErrorToNext: true }),
      ];

      makeChain(procs).run(undefined, req, resp, makeDoneFn(endTest, (args) => {
         assertAllCalledOnceInOrder(procs[0], procs[1], procs[4], procs[5]);
         assertNotCalled(procs[2], procs[3]);
         // callback called with error string (not Error instance)
         expect(args).to.have.length(1);
         expect(args[0]).to.eql('Rejection from "mw2"');
      }));
   });

   it('calls subsequent error handlers with default error from empty rejected promise', (endTest) => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { returnsEmptyRejectedPromise: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true, passesErrorToNext: true }),
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true, passesErrorToNext: true }),
      ];

      makeChain(procs).run(undefined, req, resp, makeDoneFn(endTest, (args) => {
         assertAllCalledOnceInOrder(procs[0], procs[1], procs[4], procs[5]);
         assertNotCalled(procs[2], procs[3]);
         // callback called with Error(string)
         expect(args).to.have.length(1);
         expect(args[0]).to.be.an.instanceOf(Error);
         expect(args[0].message).to.eql('Rejected promise');
      }));
   });

   it('calls subsequent error handlers with error from rejected promise', (endTest) => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { throwsError: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true, returnsRejectedPromise: true }),
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true, passesErrorToNext: true }),
      ];

      makeChain(procs).run(undefined, req, resp, makeDoneFn(endTest, (args) => {
         assertAllCalledOnceInOrder(procs[0], procs[1], procs[4], procs[5]);
         assertNotCalled(procs[2], procs[3]);
         // callback called with error string (not Error instance)
         expect(args).to.have.length(1);
         expect(args[0]).to.eql('Rejection from "eh1"');
      }));
   });

   it('calls subsequent error handlers with default error from empty rejected promise', (endTest) => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { throwsError: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true, returnsEmptyRejectedPromise: true }),
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true, passesErrorToNext: true }),
      ];

      makeChain(procs).run(undefined, req, resp, makeDoneFn(endTest, (args) => {
         assertAllCalledOnceInOrder(procs[0], procs[1], procs[4], procs[5]);
         assertNotCalled(procs[2], procs[3]);
         // callback called with Error(string)
         expect(args).to.have.length(1);
         expect(args[0]).to.be.an.instanceOf(Error);
         expect(args[0].message).to.eql('Rejected promise');
      }));
   });

   it('skips to error handlers on first non-thrown error', () => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { callsNextWithError: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true }),
         // since the first error handler does not pass the error on when it calls `next`,
         // this second error handler will not be called
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true }),
      ];

      makeChain(procs).run(undefined, req, resp, done);
      assertAllCalledOnceInOrder(procs[0], procs[1], procs[4], done);
      assertNotCalled(procs[2], procs[3], procs[5]);
      assert.calledWithExactly(done); // `done` called with no args
   });

   it('calls subsequent error handlers when thrown error is passed on (non-thrown error)', () => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { callsNextWithError: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true, passesErrorToNext: true }),
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true, passesErrorToNext: true }),
      ];

      makeChain(procs).run(undefined, req, resp, done);
      assertAllCalledOnceInOrder(procs[0], procs[1], procs[4], procs[5], done);
      assertNotCalled(procs[2], procs[3]);
      assertCalledWith(done, 'Error from "mw2"'); // `done` called with error string (not Error instance)
   });

   it('resumes processors after error handler handles error', () => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { callsNextWithError: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true }),
         // since the previous error handler (eh1) did not pass the error on to the next,
         // then the next error handler (eh2) will not get called
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true }),
         // but these regular processor (route handler / middleware) will get called
         /* 6 */ makeRequestProcessor('rh3'),
         /* 7 */ makeRequestProcessor('rh4'),
      ];

      makeChain(procs).run(undefined, req, resp, done);
      assertAllCalledOnceInOrder(procs[0], procs[1], procs[4], procs[6], procs[7], done);
      assertNotCalled(procs[2], procs[3], procs[5]);
      assert.calledWithExactly(done); // `done` called with no args
   });

   it('resumes processors after error handler handles rejected promise', (endTest) => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2', { returnsRejectedPromise: true }),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2'),
         /* 4 */ makeRequestProcessor('eh1', { handlesErrors: true }),
         // since the previous error handler (eh1) did not pass the error on to the next,
         // then the next error handler (eh2) will not get called
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true }),
         // but these regular processor (route handler / middleware) will get called
         /* 6 */ makeRequestProcessor('rh3'),
         /* 7 */ makeRequestProcessor('rh4'),
      ];

      makeChain(procs).run(undefined, req, resp, makeDoneFn(endTest, (args) => {
         assertAllCalledOnceInOrder(procs[0], procs[1], procs[4], procs[6], procs[7]);
         assertNotCalled(procs[2], procs[3], procs[5]);
         expect(args).to.eql([]); // callback was called with no args
      }));
   });

   it('short-circuits to done when next(\'route\') called', () => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('mw2'),
         /* 2 */ makeRequestProcessor('rh1'),
         /* 3 */ makeRequestProcessor('rh2', { callsNextRoute: true }),
         /* 4 */ makeRequestProcessor('rh3'),
         /* 5 */ makeRequestProcessor('rh4'),
      ];

      makeChain(procs).run(undefined, req, resp, done);
      assertAllCalledOnceInOrder(procs[0], procs[1], procs[2], procs[3], done);
      assertNotCalled(procs[4], procs[5]);
      assert.calledWithExactly(done); // `done` called with no args
   });

   it('short-circuits to done when _makeSubRequest throws an error', () => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('rh1'),
         /* 2 */ makeRequestProcessor('eh1', { handlesErrors: true }),
      ];

      const processorChain = new TestProcessorChain(wrapRequestProcessors(procs)),
            makeSubRequestStub = stub(processorChain, '_makeSubRequest');

      makeSubRequestStub.throws(new Error('Error from _makeSubRequest'));

      processorChain.run(undefined, req, resp, done);
      assertAllCalledOnceInOrder(done);
      assertNotCalled(procs[0], procs[1], procs[2]);
      assertCalledWith(done, 'Error from _makeSubRequest', true); // `done` called with Error(string)
   });

});
