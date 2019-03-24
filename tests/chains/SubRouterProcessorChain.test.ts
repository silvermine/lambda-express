import _ from 'underscore';
import { Application, Request, Router, Response } from '../../src';
import { apiGatewayRequest, handlerContext } from '../samples';
import { expect } from 'chai';
import { PathParams, NextCallback } from '../../src/interfaces';
import { SinonSpy, spy, assert } from 'sinon';
import { SubRouterProcessorChain } from '../../src/chains/SubRouterProcessorChain';
import { fail } from 'assert';

class TestRouter extends Router {

   private readonly _handler: SinonSpy;

   public constructor(handler: SinonSpy) {
      super();
      this._handler = handler;
   }

   public handle(originalErr: unknown, req: Request, resp: Response, done: NextCallback): void {
      this._handler(originalErr, req, resp, done);
   }

}

describe('SubRouterProcessorChain', () => {

   describe('matches', () => {
      const test = (routes: PathParams, path: string, expectation: boolean): void => {
         let app = new Application(),
             req = new Request(app, _.extend(apiGatewayRequest(), { path: path }), handlerContext()),
             router = new TestRouter(spy()),
             chain = new SubRouterProcessorChain(routes, router, app.routerOptions);

         expect(chain.matches(req)).to.eql(expectation);
      };

      it('returns true when paths match', () => {
         test('/users', '/users', true);
         test('/users', '/users/', true);
         test('/users/:group?', '/users', true);
         test('/users/:group?', '/users/admins', true);
         test('/users/:group?', '/users/robots', true);
         test('/users/', '/users/', true);
         test('/users/admins', '/users/admins', true);
      });

      it('returns false when paths do not match', () => {
         test('/users', '/cats', false);
      });

   });

   describe('run', () => {
      const test = (routes: PathParams, path: string, baseURL: string): void => {
         let app = new Application(),
             req = new Request(app, _.extend(apiGatewayRequest(), { path: path }), handlerContext()),
             resp = new Response(app, req, spy()),
             done = spy(),
             handle = spy(),
             router = new TestRouter(handle),
             chain = new SubRouterProcessorChain(routes, router, app.routerOptions);

         chain.run('nothing', req, resp, done);
         assert.calledOnce(handle);
         expect(handle.lastCall.args.length).to.eql(4);
         expect(handle.lastCall.args[0]).to.eql('nothing');
         expect(handle.lastCall.args[2]).to.strictlyEqual(resp);
         expect(handle.lastCall.args[3]).to.strictlyEqual(done);

         const subReq: Request = handle.lastCall.args[1];

         expect(subReq).not.to.strictlyEqual(req);
         expect(subReq.baseUrl).to.eql(baseURL);
         expect(subReq.path).to.eql('');
         expect(subReq.params).to.eql({});
      };

      it('runs with a proper sub-request', () => {
         test('/users', '/users', '/users');
         test('/user(s?*)', '/user', '/user');
         test('/user(s?*)/admins', '/user/admins', '/user/admins');
         test('/user(s?*)/admins', '/users/admins', '/users/admins');
         test([ '/users', '/personnel' ], '/users', '/users');
         test([ '/users', '/personnel' ], '/personnel', '/personnel');
         test([ '/users', /\/person+el/ ], '/personnel', '/personnel');
         test([ '/users', /\/person+el/ ], '/personel', '/personel');
      });

      it('throws an error if the path does not match the matcher', () => {
         try {
            test('/user(s*)/admins', '/user', '/user');
            fail();
         } catch(e) {
            expect(e.message).to.match(/This subrouter does not match URL "\/user"/);
         }
      });
   });

});
