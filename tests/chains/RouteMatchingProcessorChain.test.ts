import _ from 'underscore';
import { Application, Request } from '../../src';
import { apiGatewayRequest, handlerContext } from '../samples';
import { expect } from 'chai';
import { RouteMatchingProcessorChain } from '../../src/chains/RouteMatchingProcessorChain';
import { PathParams } from '../../src/interfaces';
import { StringMap } from '@silvermine/toolbox';

class TestRouteMatchingProcessorChain extends RouteMatchingProcessorChain {
   // override protected methods as public for the sake of making them testable
   public _makeSubRequest(req: Request): Request {
      return super._makeSubRequest(req);
   }
   public _makeParams(path: string): StringMap {
      return super._makeParams(path);
   }
}

describe('RouteMatchingProcessorChain', () => {

   describe('matches', () => {
      const test = (method: string | undefined, routes: PathParams, path: string, expectation: boolean, caseSensitive = false): void => {
         let app = new Application(),
             req = new Request(app, _.extend(apiGatewayRequest(), { path: path }), handlerContext()),
             chain = new RouteMatchingProcessorChain([], routes, method, caseSensitive);

         expect(chain.matches(req)).to.eql(expectation);
      };

      it('returns true for matched path and method', () => {
         test('GET', '/user/:id', '/user/1234', true);
         test('GET', [ '/user/:id?', '/users' ], '/users', true);
         test('GET', [ '/user/:id?', '/users' ], '/user/1234', true);
         test('GET', [ '/user/:id?', '/users' ], '/user', true);
         test('GET', /\/user\/[0-9]+/, '/user/1234', true);
      });

      it('returns false for matched path but mismatched method', () => {
         test('POST', '/user/:id', '/user/1234', false);
         test('POST', [ '/user/:id?', '/users' ], '/users', false);
         test('POST', [ '/user/:id?', '/users' ], '/user/1234', false);
         test('POST', [ '/user/:id?', '/users' ], '/user', false);
         test('POST', /\/user\/[0-9]+/, '/user/1234', false);
      });

      it('returns true for matched path when matcher method is undefined', () => {
         test(undefined, '/user/:id', '/user/1234', true);
         test(undefined, [ '/user/:id?', '/users' ], '/users', true);
         test(undefined, [ '/user/:id?', '/users' ], '/user/1234', true);
         test(undefined, [ '/user/:id?', '/users' ], '/user', true);
         test(undefined, /\/user\/[0-9]+/, '/user/1234', true);
      });

      it('respects the case sensitivity setting', () => {
         test(undefined, '/user/:id', '/user/1234', true, true);
         test(undefined, '/UseR/:id', '/user/1234', false, true);
         test(undefined, '/user/:id', '/uSEr/1234', false, true);
         test(undefined, [ '/user/:id?', '/users' ], '/users', true, true);
         test(undefined, [ '/user/:id?', '/users' ], '/user/1234', true, true);
         test(undefined, [ '/user/:id?', '/users' ], '/user', true, true);
         test(undefined, [ '/User/:id?', '/Users' ], '/users', false, true);
         test(undefined, [ '/User/:id?', '/Users' ], '/user/1234', false, true);
         test(undefined, [ '/User/:id?', '/Users' ], '/user', false, true);
         test(undefined, [ '/user/:id?', '/users' ], '/uEers', false, true);
         test(undefined, [ '/user/:id?', '/users' ], '/USER/1234', false, true);
         test(undefined, [ '/user/:id?', '/users' ], '/USER', false, true);
         test(undefined, /\/user\/[0-9]+/, '/user/1234', true, true);
         test(undefined, /\/USER\/[0-9]+/, '/user/1234', false, true);
         test(undefined, /\/user\/[0-9]+/, '/USER/1234', false, true);
      });

      it('allows for custom regexp patterns in paths', () => {
         // https://github.com/pillarjs/path-to-regexp#custom-matching-parameters
         const PATTERN = '/:prefix(([A-Z]{1,3}-)?)users/:id';

         test('GET', PATTERN, '/ABC-users/1234', true);
         test('GET', PATTERN, '/AB-users/1234', true);
         test('GET', PATTERN, '/A-users/1234', true);
         test('GET', PATTERN, '/users/1234', true);
         test('GET', PATTERN, '/ABCD-users/1234', false);
      });

   });

   const makePathAndParamsTests = (test: (routes: PathParams, path: string, expectation: StringMap) => void): () => void => {
      return () => {
         test('/users', '/users', {});
         test('/users/:id', '/users/1234', { id: '1234' });
         test('/users/:id?', '/users', {});
         test('/users/:id?', '/users/1234', { id: '1234' });
         test('/users/*', '/users', {});
         test('/users/*', '/users/', {});
         test('/users/*', '/users/usa/tx/austin', { '0': 'usa/tx/austin' });
         test('/users/*', '/users/usa/tx/austin/', { '0': 'usa/tx/austin/' });
         test('/cars/:car/drivers/:driver/licenses/:license', '/cars/ford/drivers/jeremy/licenses/CM', {
            car: 'ford',
            driver: 'jeremy',
            license: 'CM',
         });

         const routes = [
            '/cars',
            '/cars/:car',
            '/cars/:car/drivers',
            '/cars/:car/drivers/:driver',
            '/cars/:car/drivers/:driver/licenses',
            '/cars/:car/drivers/:driver/licenses/:license',
         ];

         test(routes, '/cars', {});
         test(routes, '/cars/ford', { car: 'ford' });
         test(routes, '/cars/ford/drivers', { car: 'ford' });
         test(routes, '/cars/ford/drivers/jeremy', { car: 'ford', driver: 'jeremy' });
         test(routes, '/cars/ford/drivers/jeremy/licenses', { car: 'ford', driver: 'jeremy' });
         test(routes, '/cars/ford/drivers/jeremy/licenses/CM', { car: 'ford', driver: 'jeremy', license: 'CM' });
      };
   };

   describe('makeParams', () => {
      const test = (routes: PathParams, path: string, expectation: StringMap): void => {
         let chain = new TestRouteMatchingProcessorChain([], routes);

         expect(chain._makeParams(path)).to.eql(expectation);
      };

      it('makes the correct params objects', makePathAndParamsTests(test));
   });

   describe('makeSubRequest', () => {
      const test = (routes: PathParams, path: string, expectation: StringMap): void => {
         let app = new Application(),
             req = new Request(app, _.extend(apiGatewayRequest(), { path: path }), handlerContext()),
             chain = new TestRouteMatchingProcessorChain([], routes),
             subReq = chain._makeSubRequest(req);

         expect(subReq.path).to.eql(path);
         expect(subReq.params).to.eql(expectation);
      };

      it('makes the subrequest with the correct path and params', makePathAndParamsTests(test));
   });

});
