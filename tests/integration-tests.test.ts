import _ from 'underscore';
import { apiGatewayRequest, handlerContext, albRequest, albMultiValHeadersRequest } from './samples';
import { spy, SinonSpy, assert } from 'sinon';
import { Application, Request, Response, Router } from '../src';
import { RequestEvent } from '../src/request-response-types';
import { NextCallback } from '../src/interfaces';
import { expect } from 'chai';
import { StringArrayOfStringsMap, StringMap } from '../src/utils/common-types';

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

});
