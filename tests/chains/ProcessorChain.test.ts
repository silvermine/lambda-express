import _ from 'underscore';
import ProcessorChain, { IProcessorChain } from '../../src/chains/ProcessorChain';
import { expect } from 'chai';
import { wrapRequestProcessors } from '../../src/utils/wrapRequestProcessor';
import { SinonSpy, spy, assert } from 'sinon';
import makeRequestProcessor from '../test-utils/makeRequestProcessor';
import { Application, Request, Response } from '../../src';
import { apiGatewayRequest, handlerContext } from '../samples';

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

describe('ProcessorChain', () => {
   let app: Application, req: Request, resp: Response, done: SinonSpy;

   beforeEach(() => {
      app = new Application();
      req = new Request(app, apiGatewayRequest(), handlerContext());
      resp = new Response(app, req, spy());
      done = spy();
   });

   const makeChain = (procs: SinonSpy[]): IProcessorChain => {
      return new ProcessorChain(wrapRequestProcessors(procs));
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

   it('does not call error handlers when no errors', () => {
      const procs: SinonSpy[] = [
         /* 0 */ makeRequestProcessor('mw1'),
         /* 1 */ makeRequestProcessor('rh1'),
         /* 2 */ makeRequestProcessor('eh1', { handlesErrors: true }),
         /* 3 */ makeRequestProcessor('mw2'),
         /* 4 */ makeRequestProcessor('rh2'),
         /* 5 */ makeRequestProcessor('eh2', { handlesErrors: true }),
      ];

      makeChain(procs).run(undefined, req, resp, done);
      assertAllCalledOnceInOrder(procs[0], procs[1], procs[3], procs[4], done);
      assertNotCalled(procs[2], procs[5]);
      assert.calledWithExactly(done); // `done` called with no args
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

   it('calls subsequent error handlers when thrown error passed on (thrown error)', () => {
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

   it('calls subsequent error handlers when thrown error passed on (non-thrown error)', () => {
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

});
