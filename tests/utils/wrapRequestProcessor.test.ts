import { expect } from 'chai';
import { Request, Response, Application } from '../../src';
import { NextCallback } from '../../src/interfaces';
import { wrapRequestProcessor } from '../../src/utils/wrapRequestProcessor';
import { apiGatewayRequest, handlerContext } from '../samples';
import { spy, assert } from 'sinon';

/* eslint-disable @typescript-eslint/no-unused-vars */

describe('wrapRequestProcessor', () => {
   let cb = spy(),
       app: Application, req: Request, resp: Response;

   beforeEach(() => {
      app = new Application();
      req = new Request(app, apiGatewayRequest(), handlerContext());
      resp = new Response(app, req, cb);
   });

   it('*does* invoke *error-handling* processor when error *is* passed', () => {
      let next = spy(),
          counter = 0,
          original = (_err: any, _req: Request, _resp: Response, _next: NextCallback): void => { counter += 1; },
          wrapped = wrapRequestProcessor(original);

      wrapped('some-error', req, resp, next);
      expect(counter).to.eql(1);
      assert.notCalled(next); // because our original did not call it
   });

   it('*does* invoke *non-error-handling* processor when error *is not* passed', () => {
      let next = spy(),
          counter = 0,
          original = (_req: Request, _resp: Response, _next: NextCallback): void => { counter += 1; },
          wrapped = wrapRequestProcessor(original);

      wrapped(undefined, req, resp, next);
      expect(counter).to.eql(1);
      assert.notCalled(next); // because our original did not call it
   });

   it('does *not* invoke *non-error-handling* processor when error *is* passed', () => {
      let next = spy(),
          counter = 0,
          original = (_req: Request, _resp: Response, _next: NextCallback): void => { counter += 1; },
          wrapped = wrapRequestProcessor(original);

      wrapped('some-error', req, resp, next);
      expect(counter).to.eql(0);
      assert.calledOnce(next);
      assert.calledWithExactly(next, 'some-error');
   });

   it('does *not* invoke *error-handling* processor when error *is not* passed', () => {
      let next = spy(),
          counter = 0,
          original = (_err: any, _req: Request, _resp: Response, _next: NextCallback): void => { counter += 1; },
          wrapped = wrapRequestProcessor(original);

      wrapped(undefined, req, resp, next);
      expect(counter).to.eql(0);
      assert.calledOnce(next);
      assert.calledWithExactly(next); // no args should have been passed
   });

});
