import _ from 'underscore';
import {
   apiGatewayRequest,
   handlerContext,
   albRequest,
   albMultiValHeadersRequest,
   apiGatewayRequestRawQuery,
} from './samples';
import { spy, SinonSpy, assert } from 'sinon';
import { Application, Request, Response, Router } from '../src';
import { RequestEvent } from '../src/request-response-types';
import { NextCallback, IRoute, IRouter } from '../src/interfaces';
import { expect } from 'chai';
import { StringArrayOfStringsMap, StringMap, KeyValueStringObject } from '@silvermine/toolbox';

describe('integration tests', () => {
   let testBody = { a: 'xyz' },
       app: Application;

   beforeEach(() => {
      app = new Application();
   });

   const makeRequestEvent = (path: string, base?: RequestEvent, method?: string): RequestEvent => {
      return _.extend(base || apiGatewayRequest(), { path: path, httpMethod: (method || 'GET') });
   };

   const testWithLastResortHandler = (code: number, desc: string, testHeaders: string[] = [], expectedBody = ''): void => {
      const cb = spy(),
            evt = makeRequestEvent('/hello/world', albMultiValHeadersRequest()),
            headers: StringMap = {},
            multiValueHeaders: StringArrayOfStringsMap = {};

      app.run(evt, handlerContext(), cb);

      if (_.contains(testHeaders, 'X-Path')) {
         headers['X-Path'] = '/hello/world';
         multiValueHeaders['X-Path'] = [ '/hello/world' ];
      }
      if (_.contains(testHeaders, 'Content-Type-HTML')) {
         headers['Content-Type'] = 'text/html';
         multiValueHeaders['Content-Type'] = [ 'text/html' ];
      }

      assert.calledWithExactly(cb, undefined, {
         statusCode: code,
         statusDescription: desc,
         body: expectedBody,
         isBase64Encoded: false,
         headers: headers,
         multiValueHeaders: multiValueHeaders,
      });
   };

   const testOutcome = (method: string, path: string, expectedBody: string): void => {
      const cb = spy(),
            evt = makeRequestEvent(path, apiGatewayRequest(), method);

      app.run(evt, handlerContext(), cb);

      assert.calledOnce(cb);
      assert.calledWithExactly(cb, undefined, {
         statusCode: 200,
         body: expectedBody,
         isBase64Encoded: false,
         multiValueHeaders: { 'Content-Type': [ 'text/html' ] },
      });
   };

   describe('very simple smoke test that hits a variety of touch points', () => {
      const test = (evt: RequestEvent): SinonSpy => {
         const cb = spy();

         app.use((req: Request, resp: Response, next: NextCallback): void => {
            resp.append('X-Request-Path', req.path);
            resp.append('X-Did-Something', 'mw1');
            next();
         });
         app.use((_req: Request, resp: Response, next: NextCallback): void => {
            resp.append('X-Did-Something', 'mw2');
            next();
         });
         app.use((_req: Request, resp: Response, _next: NextCallback): void => { // eslint-disable-line @typescript-eslint/no-unused-vars
            resp.append('X-Did-Something', 'mw3');
            throw new Error('Thrown from mw3');
         });
         app.use((err: any, _req: Request, resp: Response, next: NextCallback): void => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.eql('Thrown from mw3');
            resp.append('X-Did-Something', 'eh1');
            next();
         });
         app.post('/hello', (_req: Request, resp: Response, next: NextCallback): void => {
            // this one should not get invoked because it's for POSTs
            resp.append('X-Did-Something', 'rh-post-hello');
            next();
         });
         app.get('/goodbye', (_req: Request, resp: Response, next: NextCallback): void => {
            // this one should not get invoked because it's the wrong route
            resp.append('X-Did-Something', 'rh-goodbye1');
            next();
         });
         app.get('/hello', (_req: Request, resp: Response, next: NextCallback): void => {
            // this one should not get invoked because it's the wrong route
            resp.append('X-Did-Something', 'rh-hello0');
            next();
         });
         app.get('/hello/:name', (_req: Request, resp: Response, next: NextCallback): void => {
            resp.append('X-Did-Something', 'rh-hello1');
            next();
         });
         app.get('/hello/:name', (req: Request, resp: Response): void => {
            resp.append('X-Param-Name', req.params.name);
            resp.append('X-Did-Something', 'rh-hello2');
            resp.json(testBody);
         });

         app.run(evt, handlerContext(), cb);
         assert.calledOnce(cb);
         return cb;
      };

      it('works - APIGW', () => {
         const cb = test(makeRequestEvent('/hello/world'));

         assert.calledWithExactly(cb, undefined, {
            statusCode: 200,
            body: JSON.stringify(testBody),
            isBase64Encoded: false,
            multiValueHeaders: {
               'Content-Type': [ 'application/json; charset=utf-8' ],
               'X-Request-Path': [ '/hello/world' ],
               'X-Param-Name': [ 'world' ],
               'X-Did-Something': [ 'mw1', 'mw2', 'mw3', 'eh1', 'rh-hello1', 'rh-hello2' ],
            },
         });
      });

      it('works - ALB', () => {
         const cb = test(makeRequestEvent('/hello/world', albRequest()));

         assert.calledWithExactly(cb, undefined, {
            statusCode: 200,
            statusDescription: '200 OK',
            body: JSON.stringify(testBody),
            isBase64Encoded: false,
            headers: {
               'Content-Type': 'application/json; charset=utf-8',
               'X-Request-Path': '/hello/world',
               'X-Param-Name': 'world',
               'X-Did-Something': 'rh-hello2',
            },
            multiValueHeaders: {
               'Content-Type': [ 'application/json; charset=utf-8' ],
               'X-Request-Path': [ '/hello/world' ],
               'X-Param-Name': [ 'world' ],
               'X-Did-Something': [ 'mw1', 'mw2', 'mw3', 'eh1', 'rh-hello1', 'rh-hello2' ],
            },
         });
      });

      it('works - ALBMV', () => {
         const cb = test(makeRequestEvent('/hello/world', albMultiValHeadersRequest()));

         assert.calledWithExactly(cb, undefined, {
            statusCode: 200,
            statusDescription: '200 OK',
            body: JSON.stringify(testBody),
            isBase64Encoded: false,
            headers: {
               'Content-Type': 'application/json; charset=utf-8',
               'X-Request-Path': '/hello/world',
               'X-Param-Name': 'world',
               'X-Did-Something': 'rh-hello2',
            },
            multiValueHeaders: {
               'Content-Type': [ 'application/json; charset=utf-8' ],
               'X-Request-Path': [ '/hello/world' ],
               'X-Param-Name': [ 'world' ],
               'X-Did-Something': [ 'mw1', 'mw2', 'mw3', 'eh1', 'rh-hello1', 'rh-hello2' ],
            },
         });
      });

   });

   describe('handler of last resort', () => {

      it('returns 404 when there are no processors mounted', () => {
         testWithLastResortHandler(404, '404 Not Found');
      });

      it('returns 404 when there are no *matching* processors mounted', () => {
         app.get('/goodbye', (req: Request, resp: Response) => { resp.send(`Path: ${req.path}`); });
         testWithLastResortHandler(404, '404 Not Found');
      });

      it('returns 404 when there are no *matching* processors mounted - even with middleware', () => {
         // eslint-disable-next-line @silvermine/silvermine/max-statements-per-line
         app.use((req: Request, resp: Response, next: NextCallback) => { resp.append('X-Path', req.path); next(); });
         app.get('/goodbye', (req: Request, resp: Response) => { resp.send(`Path: ${req.path}`); });
         testWithLastResortHandler(404, '404 Not Found', [ 'X-Path' ]);
      });

      it('returns 500 when there is an error in the middleware - matching request processor skipped', () => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         app.use((_req: Request, _resp: Response, _next: NextCallback) => { throw new Error('Oops!'); });
         app.get('/hello/world', (req: Request, resp: Response) => { resp.send(`Path: ${req.path}`); });
         testWithLastResortHandler(500, '500 Internal Server Error');
      });

      it('returns 500 when there is an error in the middleware - no matching request processors', () => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         app.use((_req: Request, _resp: Response, _next: NextCallback) => { throw new Error('Oops!'); });
         app.get('/goodbye', (req: Request, resp: Response) => { resp.send(`Path: ${req.path}`); });
         testWithLastResortHandler(500, '500 Internal Server Error');
      });

   });

   describe('case sensitive routing', () => {

      it('it stops routes from matching when the case does not match', () => {
         expect(app.routerOptions.caseSensitive).to.eql(false);
         app.enable('case sensitive routing');
         expect(app.routerOptions.caseSensitive).to.eql(true);
         // eslint-disable-next-line @silvermine/silvermine/max-statements-per-line
         app.use((req: Request, resp: Response, next: NextCallback) => { resp.append('X-Path', req.path); next(); });
         app.get('/Hello/World', (req: Request, resp: Response) => { resp.send(`Path: ${req.path}`); });
         testWithLastResortHandler(404, '404 Not Found', [ 'X-Path' ]);
      });

      it('has no affect on already-registered routes when toggled, but does affect routes added after toggle', () => {
         expect(app.routerOptions.caseSensitive).to.eql(false);
         app.enable('case sensitive routing');
         expect(app.routerOptions.caseSensitive).to.eql(true);
         app.get('/Hello/World', (_req: Request, resp: Response) => { resp.send('should not match'); });
         testWithLastResortHandler(404, '404 Not Found');

         app.disable('case sensitive routing');
         expect(app.routerOptions.caseSensitive).to.eql(false);
         // Still the same result because the route matcher was already created:
         testWithLastResortHandler(404, '404 Not Found');

         // but this one will match even though the case does not - because
         // case-sensitivity has been disabled:
         app.get('/HELLO/WORLD', (_req: Request, resp: Response) => { resp.send('will match'); });
         testWithLastResortHandler(200, '200 OK', [ 'Content-Type-HTML' ], 'will match');
      });

      it('matches sub-routes case-insensitively when parent route is case-sensitive and sub-route is case-insensitive', () => {
         const router = new Router({ caseSensitive: false });

         // App (parent, `/hello`): case-sensitive
         // Router (`/world`): case-insensitive
         expect(app.routerOptions.caseSensitive).to.eql(false);
         app.enable('case sensitive routing');
         expect(app.routerOptions.caseSensitive).to.eql(true);

         app.addSubRouter('/hello', router);
         router.get('/world', (_req: Request, resp: Response) => { resp.send('Hello world'); });

         // Return a fallback response
         app.use((_req: Request, resp: Response) => { resp.send('not found'); });

         // Exact match
         testOutcome('GET', '/hello/world', 'Hello world');

         // App (parent, `/hello`): case-sensitive
         testOutcome('GET', '/HELLO/world', 'not found');
         testOutcome('GET', '/Hello/world', 'not found');
         testOutcome('GET', '/HELLO/WORLD', 'not found');

         // Router (`/world`): case-insensitive
         testOutcome('GET', '/hello/WORLD', 'Hello world');
         testOutcome('GET', '/hello/World', 'Hello world');

         // Mismatch
         testOutcome('GET', '/goodbye/world', 'not found');
      });

      it('matches sub-routes case-sensitively when parent route is case-insensitive and sub-route is case-sensitive', () => {
         const router = new Router({ caseSensitive: true });

         // App (parent, `/hello`): case-insensitive
         // Router (`/world`): case-sensitive
         expect(app.routerOptions.caseSensitive).to.eql(false);

         app.addSubRouter('/hello', router);
         router.get('/world', (_req: Request, resp: Response) => { resp.send('Hello world'); });

         // Return a fallback response
         app.use((_req: Request, resp: Response) => { resp.send('not found'); });

         // Exact match
         testOutcome('GET', '/hello/world', 'Hello world');

         // App (parent, `/hello`): case-insensitive
         testOutcome('GET', '/HELLO/world', 'Hello world');
         testOutcome('GET', '/Hello/world', 'Hello world');

         // Router (`/world`): case-sensitive
         testOutcome('GET', '/hello/WORLD', 'not found');
         testOutcome('GET', '/hello/World', 'not found');
         testOutcome('GET', '/HELLO/WORLD', 'not found');

         // Mismatch
         testOutcome('GET', '/goodbye/world', 'not found');
      });

   });

   describe('other HTTP methods', () => {
      // eslint-disable-next-line max-len,max-params
      const addTestsForMethod = (method: string, code: number, desc: string, hdrName: string, hdrVal: string, expectedBody: string, prep: () => void, contentType?: string): void => {
         const baseEvents = {
            'APIGW': apiGatewayRequest(),
            'ALB': albRequest(),
            'ALBMV': albMultiValHeadersRequest(),
         };

         _.each(baseEvents, (baseEvent, eventTypeName) => {
            it(`works with HTTP method ${method} - ${eventTypeName}`, () => {
               const cb = spy(),
                     evt = makeRequestEvent('/hello/world', baseEvent, method);

               // this request handler should get run for all methods:
               app.all('/hello/world', (_req: Request, resp: Response, next: NextCallback): void => {
                  resp.append('X-Did-Run-All-Hello-World', 'true');
                  next();
               });

               // this one should *not* get run because the path doesn't match:
               app.all('/goodbye/world', (_req: Request, resp: Response, next: NextCallback): void => {
                  resp.append('X-Did-Run-All-Goodbye-World', 'true');
                  next();
               });

               // let the method test set up its handlers:
               prep();

               app.run(evt, handlerContext(), cb);

               const expectedCallbackValue = {
                  statusCode: code,
                  statusDescription: desc,
                  body: expectedBody,
                  isBase64Encoded: false,
                  headers: {
                     'X-Did-Run-All-Hello-World': 'true',
                  } as StringMap,
                  multiValueHeaders: {
                     'X-Did-Run-All-Hello-World': [ 'true' ],
                  } as StringArrayOfStringsMap,
               };

               expectedCallbackValue.headers[hdrName] = hdrVal;
               expectedCallbackValue.multiValueHeaders[hdrName] = [ hdrVal ];

               if (contentType) {
                  expectedCallbackValue.headers['Content-Type'] = contentType;
                  expectedCallbackValue.multiValueHeaders['Content-Type'] = [ contentType ];
               }

               if (eventTypeName === 'APIGW') {
                  delete expectedCallbackValue.headers;
                  delete expectedCallbackValue.statusDescription;
               }

               assert.calledOnce(cb);
               assert.calledWithExactly(cb, undefined, expectedCallbackValue);
            });
         });
      };

      addTestsForMethod('OPTIONS', 200, '200 OK', 'Access-Control-Allow-Origin', '*', '', () => {
         app.options('/hello/world', (_req: Request, resp: Response) => {
            resp.append('Access-Control-Allow-Origin', '*').sendStatus(200);
         });
      });

      addTestsForMethod('POST', 201, '201 Created', 'X-EntityID', '1234', JSON.stringify(testBody), () => {
         app.post('/hello/world', (_req: Request, resp: Response) => {
            resp.append('X-EntityID', '1234').status(201).send(testBody);
         });
      }, 'application/json; charset=utf-8');

      addTestsForMethod('HEAD', 200, '200 OK', 'ETag', '3cef25cd', '', () => {
         app.head('/hello/world', (_req: Request, resp: Response) => {
            // this also adds a specific test for `.end()`, which is not included directly
            // in other tests:
            resp.append('ETag', '3cef25cd').status(200).end();
         });
      });

      addTestsForMethod('PUT', 200, '200 OK', 'ETag', '3cef25cd', JSON.stringify(testBody), () => {
         app.put('/hello/world', (_req: Request, resp: Response) => {
            resp.append('ETag', '3cef25cd').send(testBody);
         });
      }, 'application/json; charset=utf-8');

      addTestsForMethod('DELETE', 204, '204 No Content', 'X-EntityID', '1234', '', () => {
         app.delete('/hello/world', (_req: Request, resp: Response) => {
            resp.append('X-EntityID', '1234').sendStatus(204);
         });
      });

      addTestsForMethod('PATCH', 204, '204 No Content', 'X-EntityID', '1234', '', () => {
         app.patch('/hello/world', (_req: Request, resp: Response) => {
            resp.append('X-EntityID', '1234').sendStatus(204);
         });
      });

   });

   describe('sub-routing', () => {

      it('works when we have added a subrouter and subsubrouter to the main app', () => {
         const r1 = new Router(),
               r2 = new Router();

         app.get('/hello/world', (_req: Request, resp: Response): void => {
            resp.send('hello world!');
         });

         // Since r1 is mounted on '/cars' and has a '/:id' route, then by default
         // '/cars/manufacturers' would match to the '/:id' route below. But, as long as
         // we mount this subrouter first, then it will match '/cars/manufacturers' first.
         r1.addSubRouter('/manufacturers', r2);

         r1.get('/', (_req: Request, resp: Response): void => { resp.send('list cars'); });
         r1.post('/', (_req: Request, resp: Response): void => { resp.send('create a car'); });
         r1.get('/:id', (req: Request, resp: Response): void => { resp.send('get car ' + req.params.id); });
         r1.put('/:id', (req: Request, resp: Response): void => { resp.send('update car ' + req.params.id); });

         r2.get('/', (_req: Request, resp: Response): void => { resp.send('list manufacturers'); });
         r2.post('/', (_req: Request, resp: Response): void => { resp.send('create a manufacturer'); });
         r2.get('/:id', (req: Request, resp: Response): void => { resp.send('get manufacturer ' + req.params.id); });
         r2.put('/:id', (req: Request, resp: Response): void => { resp.send('update manufacturer ' + req.params.id); });

         app.addSubRouter('/cars', r1);

         app.get('/*', (_req: Request, resp: Response): void => {
            resp.send('everything else');
         });

         testOutcome('GET', '/hello/world', 'hello world!');
         testOutcome('GET', '/foo', 'everything else');

         testOutcome('GET', '/cars', 'list cars');
         testOutcome('GET', '/cars/', 'list cars');
         testOutcome('POST', '/cars', 'create a car');
         testOutcome('POST', '/cars/', 'create a car');

         testOutcome('GET', '/cars/F-350', 'get car F-350');
         testOutcome('GET', '/cars/F-350/', 'get car F-350');
         // This also adds a test for URL decoding parameters:
         testOutcome('GET', '/cars/awesome%20F-350', 'get car awesome F-350');
         testOutcome('GET', '/cars/awesome%20F-350/', 'get car awesome F-350');
         testOutcome('PUT', '/cars/F-350', 'update car F-350');
         testOutcome('PUT', '/cars/F-350/', 'update car F-350');

         testOutcome('GET', '/cars/manufacturers', 'list manufacturers');
         testOutcome('GET', '/cars/manufacturers/', 'list manufacturers');
         testOutcome('POST', '/cars/manufacturers', 'create a manufacturer');
         testOutcome('POST', '/cars/manufacturers/', 'create a manufacturer');

         testOutcome('GET', '/cars/manufacturers/ford', 'get manufacturer ford');
         testOutcome('GET', '/cars/manufacturers/ford/', 'get manufacturer ford');
         // This also adds a test for URL decoding parameters:
         testOutcome('GET', '/cars/manufacturers/awesome%20ford', 'get manufacturer awesome ford');
         testOutcome('GET', '/cars/manufacturers/awesome%20ford/', 'get manufacturer awesome ford');
         testOutcome('PUT', '/cars/manufacturers/ford', 'update manufacturer ford');
         testOutcome('PUT', '/cars/manufacturers/ford/', 'update manufacturer ford');
      });

   });

   describe('router reuse', () => {

      it('works when a single subrouter is added for two different paths', () => {
         const router = new Router();

         app.get('/hello/world', (_req: Request, resp: Response): void => {
            resp.send('hello world!');
         });

         router.get('/', (_req: Request, resp: Response): void => { resp.send('list cars'); });
         router.post('/', (_req: Request, resp: Response): void => { resp.send('create a car'); });
         router.get('/:id', (req: Request, resp: Response): void => { resp.send('get car ' + req.params.id); });
         router.put('/:id', (req: Request, resp: Response): void => { resp.send('update car ' + req.params.id); });

         app.addSubRouter('/cars', router);
         app.addSubRouter('/automobiles', router);

         app.get('/*', (_req: Request, resp: Response): void => {
            resp.send('everything else');
         });

         testOutcome('GET', '/hello/world', 'hello world!');
         testOutcome('GET', '/foo', 'everything else');

         testOutcome('GET', '/cars', 'list cars');
         testOutcome('GET', '/cars/', 'list cars');
         testOutcome('POST', '/cars', 'create a car');
         testOutcome('POST', '/cars/', 'create a car');

         testOutcome('GET', '/cars/F-350', 'get car F-350');
         testOutcome('GET', '/cars/F-350/', 'get car F-350');
         // This also adds a test for URL decoding parameters:
         testOutcome('GET', '/cars/awesome%20F-350', 'get car awesome F-350');
         testOutcome('GET', '/cars/awesome%20F-350/', 'get car awesome F-350');
         testOutcome('PUT', '/cars/F-350', 'update car F-350');
         testOutcome('PUT', '/cars/F-350/', 'update car F-350');

         testOutcome('GET', '/automobiles', 'list cars');
         testOutcome('GET', '/automobiles/', 'list cars');
         testOutcome('POST', '/automobiles', 'create a car');
         testOutcome('POST', '/automobiles/', 'create a car');

         testOutcome('GET', '/automobiles/F-350', 'get car F-350');
         testOutcome('GET', '/automobiles/F-350/', 'get car F-350');
         // This also adds a test for URL decoding parameters:
         testOutcome('GET', '/automobiles/awesome%20F-350', 'get car awesome F-350');
         testOutcome('GET', '/automobiles/awesome%20F-350/', 'get car awesome F-350');
         testOutcome('PUT', '/automobiles/F-350', 'update car F-350');
         testOutcome('PUT', '/automobiles/F-350/', 'update car F-350');
      });

      it('works when a single subrouter is added for the root and a sub-route', () => {
         const router = new Router();

         app.get('/hello/world', (_req: Request, resp: Response): void => {
            resp.send('hello world!');
         });

         router.get('/cars', (_req: Request, resp: Response): void => { resp.send('list cars'); });
         router.post('/cars', (_req: Request, resp: Response): void => { resp.send('create a car'); });
         router.get('/cars/:id', (req: Request, resp: Response): void => { resp.send('get car ' + req.params.id); });
         router.put('/cars/:id', (req: Request, resp: Response): void => { resp.send('update car ' + req.params.id); });

         app.addSubRouter('/', router);
         app.addSubRouter('/v1', router);

         app.get('/*', (_req: Request, resp: Response): void => {
            resp.send('everything else');
         });

         testOutcome('GET', '/hello/world', 'hello world!');
         testOutcome('GET', '/foo', 'everything else');

         testOutcome('GET', '/cars', 'list cars');
         testOutcome('GET', '/cars/', 'list cars');
         testOutcome('POST', '/cars', 'create a car');
         testOutcome('POST', '/cars/', 'create a car');

         testOutcome('GET', '/cars/F-350', 'get car F-350');
         testOutcome('GET', '/cars/F-350/', 'get car F-350');
         // This also adds a test for URL decoding parameters:
         testOutcome('GET', '/cars/awesome%20F-350', 'get car awesome F-350');
         testOutcome('GET', '/cars/awesome%20F-350/', 'get car awesome F-350');
         testOutcome('PUT', '/cars/F-350', 'update car F-350');
         testOutcome('PUT', '/cars/F-350/', 'update car F-350');

         testOutcome('GET', '/v1/cars', 'list cars');
         testOutcome('GET', '/v1/cars/', 'list cars');
         testOutcome('POST', '/v1/cars', 'create a car');
         testOutcome('POST', '/v1/cars/', 'create a car');

         testOutcome('GET', '/v1/cars/F-350', 'get car F-350');
         testOutcome('GET', '/v1/cars/F-350/', 'get car F-350');
         // This also adds a test for URL decoding parameters:
         testOutcome('GET', '/v1/cars/awesome%20F-350', 'get car awesome F-350');
         testOutcome('GET', '/v1/cars/awesome%20F-350/', 'get car awesome F-350');
         testOutcome('PUT', '/v1/cars/F-350', 'update car F-350');
         testOutcome('PUT', '/v1/cars/F-350/', 'update car F-350');
      });

   });

   describe('internal re-routing with `request.url`', () => {

      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      function testRoutesWithRedirect(changeReqFn = (req: Request) => { req.url = '/goodbye'; }, expectedResponse: string = 'goodbye') {
         const router = new Router();

         let reqProps = [ 'url', 'path', 'query', 'originalUrl' ],
             helloRouteHandler: SinonSpy,
             helloRouteHandler2: SinonSpy,
             goodbyeRouteHandler: SinonSpy,
             helloReq: { url: string; path: string; query: KeyValueStringObject; originalUrl: string },
             hello2Req: { url: string; path: string; query: KeyValueStringObject; originalUrl: string },
             goodbyeReq: { url: string; path: string; query: KeyValueStringObject; originalUrl: string };

         helloRouteHandler = spy((req: Request, _resp: Response, next: NextCallback): void => {
            helloReq = _.pick(req, ...reqProps);
            changeReqFn(req);
            next();
         });

         helloRouteHandler2 = spy((req: Request, resp: Response): void => {
            hello2Req = _.pick(req, ...reqProps);
            resp.send('hello');
         });

         goodbyeRouteHandler = spy((req: Request, resp: Response): void => {
            goodbyeReq = _.pick(req, ...reqProps);
            resp.send('goodbye');
         });

         router.get('/hello', helloRouteHandler)
            .get('/goodbye', goodbyeRouteHandler)
            .get('/hello', helloRouteHandler2);

         app.addSubRouter('/path', router);

         testOutcome('GET', '/path/hello', expectedResponse);

         return {
            hello: helloRouteHandler,
            getHelloReq: () => { return helloReq; },
            hello2: helloRouteHandler2,
            getHello2Req: () => { return hello2Req; },
            goodbye: goodbyeRouteHandler,
            getGoodbyeReq: () => { return goodbyeReq; },
         };
      }

      it('redirects to a different route handler when req.url is changed', () => {
         const handlers = testRoutesWithRedirect();

         assert.calledOnce(handlers.hello);
         assert.calledOnce(handlers.goodbye);
         assert.notCalled(handlers.hello2);
         assert.callOrder(handlers.hello, handlers.goodbye);
      });

      it('continues executing routes in the current chain before redirecting to the next match', () => {
         const router = new Router();

         let h1, h2Redirects, h3, h4ShouldBeSkipped, g1ShouldBeSkipped, g2Ends;

         h1 = spy((_req: Request, _resp: Response, next: NextCallback): void => { next(); });

         h2Redirects = spy((req: Request, _resp: Response, next: NextCallback): void => {
            req.url = '/goodbye';
            next();
         });

         h3 = spy((_req: Request, _resp: Response, next: NextCallback): void => { next(); });
         h4ShouldBeSkipped = spy((_req: Request, _resp: Response, next: NextCallback): void => { next(); });
         g1ShouldBeSkipped = spy((_req: Request, _resp: Response, next: NextCallback): void => { next(); });
         g2Ends = spy((_req: Request, resp: Response): void => { resp.send('goodbye'); });

         router.get('/goodbye', g1ShouldBeSkipped) // skipped because request starts at /hello
            .get('/hello', h1, h2Redirects, h3) // even though h2 redirects to /goodbye, the chain should still run h3
            .get('/hello', h4ShouldBeSkipped) // by now the request is for /goodbye, so skip this
            .get('/goodbye', g2Ends); // this /goodbye handler gets called because of the redirect above

         app.addSubRouter('/path', router);

         testOutcome('GET', '/path/hello', 'goodbye');

         // This should be skipped because it was registered *before* the `h2Redirects`
         // handler that causes the re-route to '/goodbye'.
         assert.notCalled(g1ShouldBeSkipped);
         assert.calledOnce(h1);
         // This route handler re-routes the request to '/goodbye'.
         assert.calledOnce(h2Redirects);
         // This is the last route handler in the `.get('/hello', h1, h2Redirects, h3)`
         // chain. The main point of this test is to ensure that it's NOT skipped.
         assert.calledOnce(h3);
         assert.notCalled(h4ShouldBeSkipped);
         assert.calledOnce(g2Ends);
         assert.callOrder(h1, h2Redirects, h3, g2Ends);
      });

      it('ignores query string params when `request.url` changes to a URL with query params', () => {
         const handlers = testRoutesWithRedirect((req: Request) => { req.url = '/goodbye?to=you'; });

         expect(handlers.getHelloReq().url).to.strictlyEqual(`/hello${apiGatewayRequestRawQuery}`);
         expect(handlers.getHelloReq().originalUrl).to.strictlyEqual(`/path/hello${apiGatewayRequestRawQuery}`);
         // Express has some interesting behavior here. The URL is changed. But the query
         // string parameters are not reparsed. So, we should see the URL have the new
         // query parameters, but the query object itself still have the old values.
         expect(handlers.getGoodbyeReq().url).to.strictlyEqual('/goodbye?to=you');
         expect(handlers.getGoodbyeReq().originalUrl).to.strictlyEqual(`/path/hello${apiGatewayRequestRawQuery}`);

         // Expect that the query parameter `to` was ignored
         expect(handlers.getGoodbyeReq().query.to).to.strictlyEqual(undefined);
         // And that the old parameters are still available
         expect(handlers.getGoodbyeReq().query.y).to.strictlyEqual('z');
      });

      it('updates path params when `request.url` changes to a URL with different path params', () => {
         const router1 = new Router(),
               router2 = new Router(),
               USER_ID = '1337',
               USERNAME = 'mluedke';

         let router1Params, router2Params;

         router1.get('/users/:userID', (req: Request, _resp: Response, next: NextCallback) => {
            router1Params = req.params;
            req.url = `/profile/${USERNAME}`;
            next();
         });

         router2.get('/profile/:username', (req: Request, resp: Response) => {
            router2Params = req.params;
            resp.send(`${req.params.username} profile`);
         });

         app.addSubRouter('/admin', router1);
         app.addSubRouter('/admin', router2);

         testOutcome('GET', `/admin/users/${USER_ID}`, `${USERNAME} profile`);

         expect(router1Params).to.eql({ userID: USER_ID });
         expect(router2Params).to.eql({ username: USERNAME });
      });

   });

   describe('request object', () => {

      it('has an immutable context property', () => {
         let evt = makeRequestEvent('/test', apiGatewayRequest(), 'GET'),
             ctx = handlerContext(true),
             handler;

         function isPropFrozen(obj: any, key: string): boolean {
            try {
               obj[key] = 'change';
               return false;
            } catch(e) {
               if (e instanceof Error) {
                  return e.message.indexOf('Cannot assign to read only property') !== -1;
               }
               return false;
            }
         }

         handler = spy((req: Request, resp: Response) => {
            expect(req.context).to.be.an('object');

            expect(isPropFrozen(req.context, 'awsRequestId'));
            expect(isPropFrozen(req.context, 'clientContext'));

            if (req.context.clientContext) {
               expect(isPropFrozen(req.context.clientContext, 'clientContext'));
            }

            if (req.context.identity) {
               expect(isPropFrozen(req.context.identity, 'cognitoIdentityId'));
            }

            resp.send('test');
         });
         app.get('*', handler);

         app.run(evt, ctx, spy());

         // Make sure the handler ran, otherwise the test is invalid.
         assert.calledOnce(handler);
      });

   });

   describe('building routes with router.route', () => {

      it('is chainable', () => {
         let handler = (_req: Request, resp: Response): void => { resp.send('Test'); },
             getSpy = spy(handler),
             postSpy = spy(handler),
             putSpy = spy(handler);

         app.route('/test')
            .get(getSpy)
            .post(postSpy)
            .put(putSpy);

         // Ensure that chained handlers were registered properly

         testOutcome('GET', '/test', 'Test');
         assert.calledOnce(getSpy);
         assert.notCalled(postSpy);
         assert.notCalled(putSpy);
         getSpy.resetHistory();

         testOutcome('POST', '/test', 'Test');
         assert.calledOnce(postSpy);
         assert.notCalled(getSpy);
         assert.notCalled(putSpy);
         postSpy.resetHistory();

         testOutcome('PUT', '/test', 'Test');
         assert.calledOnce(putSpy);
         assert.notCalled(getSpy);
         assert.notCalled(postSpy);
         putSpy.resetHistory();
      });

      it('registers route handlers properly', () => {
         let methods: (keyof IRoute & keyof IRouter)[],
             allHandler: SinonSpy,
             route: IRoute;

         route = app.route('/test');

         // methods to test
         methods = [ 'get', 'post', 'put', 'delete', 'head', 'options', 'patch' ];

         // Register handler that runs for every request
         allHandler = spy((_req: Request, _resp: Response, next: NextCallback) => { next(); });
         route.all(allHandler);


         // Register a handler for each method
         const handlers = _.reduce(methods, (memo, method) => {
            let handler = spy((_req: Request, resp: Response) => { resp.send(`Test ${method}`); });

            // Save the handler spy for testing later
            memo[method] = handler;

            // add the handler to our route
            route[method](handler);

            return memo;
         }, {} as { [k: string]: SinonSpy });

         app.use((_req: Request, resp: Response) => {
            resp.send('not found');
         });

         // Run once for each method type
         // Both a path with and without a trailing slash should match
         _.each([ '/test', '/test/' ], (path) => {
            _.each(methods, (method) => {
               testOutcome(method.toUpperCase(), path, `Test ${method}`);

               // Check that the "all" handler was called
               assert.calledOnce(allHandler);
               allHandler.resetHistory();

               // Check that only the one handler was called
               _.each(handlers, (handler, handlerMethod) => {
                  if (method === handlerMethod) {
                     assert.calledOnce(handler);
                  } else {
                     assert.notCalled(handler);
                  }
                  handler.resetHistory();
               });
            });
         });

         // Other tests
         _.each(methods, (method) => {
            // Ensure only exact matches trigger the route handler
            testOutcome(method.toUpperCase(), '/test/anything', 'not found');
         });
      });

   });

});
