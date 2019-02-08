import _ from 'underscore';
import { expect } from 'chai';
import { fail } from 'assert';
import { Request, Response, Application } from '../src';
import { apiGatewayRequest, handlerContext, albRequest, albMultiValHeadersRequest } from './samples';
import sinon, { spy, assert, SinonSpy, SinonSandbox, SinonFakeTimers } from 'sinon';
import { StringArrayOfStringsMap, StringMap } from '../src/utils/common-types';
import { RequestEvent, CookieOpts } from '../src/request-response-types';

// function type used for reusable test extension below
type Extender = (resp: Response, output: any) => void;

describe('Request', () => {
   const EMPTY_CB = (): void => {}; // eslint-disable-line no-empty-function

   let app: Application, sampleReq: Request, sampleResp: Response;

   beforeEach(() => {
      app = new Application();
      sampleReq = new Request(app, apiGatewayRequest(), handlerContext());
      sampleResp = new Response(app, sampleReq, EMPTY_CB);

   });

   describe('constructor', () => {
      it('sets the app correctly', () => {
         expect(new Response(app, sampleReq, EMPTY_CB).app).to.strictlyEqual(app);
      });

      it('initializes headersSent correctly', () => {
         expect(new Response(app, sampleReq, EMPTY_CB).headersSent).to.strictlyEqual(false);
      });
   });

   describe('header functionality', () => {

      it('sets and appends headers correctly', () => {
         expect(sampleResp.getHeaders()).to.eql({});
         sampleResp.set('Content-Type', 'text/plain');
         expect(sampleResp.getHeaders()).to.eql({
            'Content-Type': [ 'text/plain' ],
         });

         // overwrite
         sampleResp.set('Content-Type', 'text/html');
         expect(sampleResp.getHeaders()).to.eql({
            'Content-Type': [ 'text/html' ],
         });

         // append
         sampleResp.append('Content-Type', 'text/plain');
         expect(sampleResp.getHeaders()).to.eql({
            'Content-Type': [ 'text/html', 'text/plain' ],
         });

         // overwrite after append
         sampleResp.set('Content-Type', 'application/json');
         expect(sampleResp.getHeaders()).to.eql({
            'Content-Type': [ 'application/json' ],
         });

         // and some other header just to be sure there aren't conflicts
         sampleResp.set('ETag', '12345');
         expect(sampleResp.getHeaders()).to.eql({
            'Content-Type': [ 'application/json' ],
            'ETag': [ '12345' ],
         });

         // and setting an object of headers
         sampleResp.set({
            'Foo': 'Bar',
            'Baz': 'Boom',
         });
         expect(sampleResp.getHeaders()).to.eql({
            'Content-Type': [ 'application/json' ],
            'ETag': [ '12345' ],
            'Foo': [ 'Bar' ],
            'Baz': [ 'Boom' ],
         });

         // and appending to one of those
         sampleResp.append('Foo', 'Baz');
         expect(sampleResp.getHeaders()).to.eql({
            'Content-Type': [ 'application/json' ],
            'ETag': [ '12345' ],
            'Foo': [ 'Bar', 'Baz' ],
            'Baz': [ 'Boom' ],
         });

         // and overwriting by means of an object
         sampleResp.set({
            'Waa': 'Hoo',
            'ETag': '54321',
         });
         expect(sampleResp.getHeaders()).to.eql({
            'Content-Type': [ 'application/json' ],
            'ETag': [ '54321' ],
            'Foo': [ 'Bar', 'Baz' ],
            'Baz': [ 'Boom' ],
            'Waa': [ 'Hoo' ],
         });

      });

      it('throws errors when set/append are called after a response is sent', () => {
         sampleResp.set('Foo', 'Bar');
         sampleResp.append('Foo', 'Baz');
         expect(sampleResp.getHeaders()).to.eql({ Foo: [ 'Bar', 'Baz' ] });
         sampleResp.sendStatus(200);
         expect(sampleResp.getHeaders()).to.eql({ Foo: [ 'Bar', 'Baz' ] });
         try {
            sampleResp.set('X-Bar', 'None');
            fail('Should have thrown an error');
         } catch(e) {
            expect(e.message).to.eql('Can\'t set headers after they are sent.');
         }
         try {
            sampleResp.append('X-Bar', 'Many');
            fail('Should have thrown an error');
         } catch(e) {
            expect(e.message).to.eql('Can\'t set headers after they are sent.');
         }
      });

      describe('append', () => {

         it('handles when a header has not yet been set', () => {
            expect(sampleResp.getHeaders()).to.eql({});
            sampleResp.append('Content-Type', 'text/plain');
            expect(sampleResp.getHeaders()).to.eql({
               'Content-Type': [ 'text/plain' ],
            });
         });

         it('handles array values', () => {
            expect(sampleResp.getHeaders()).to.eql({});
            sampleResp.set('Foo', 'Bar');
            expect(sampleResp.getHeaders()).to.eql({
               'Foo': [ 'Bar' ],
            });
            sampleResp.append('Foo', [ 'Baz', 'Boo' ]);
            expect(sampleResp.getHeaders()).to.eql({
               'Foo': [ 'Bar', 'Baz', 'Boo' ],
            });
         });

         it('handles array values when a header has not yet been set', () => {
            expect(sampleResp.getHeaders()).to.eql({});
            sampleResp.append('Foo', [ 'Bar', 'Baz' ]);
            expect(sampleResp.getHeaders()).to.eql({
               'Foo': [ 'Bar', 'Baz' ],
            });
         });

      });

   });

   describe('status codes and messages', () => {

      it('properly sets the message for known status codes', () => {
         // default
         expect(sampleResp.getStatus()).to.eql({ code: 200, message: 'OK' });

         // some others
         expect(sampleResp.status(404).getStatus()).to.eql({ code: 404, message: 'Not Found' });
         expect(sampleResp.status(201).getStatus()).to.eql({ code: 201, message: 'Created' });
         expect(sampleResp.status(500).getStatus()).to.eql({ code: 500, message: 'Internal Server Error' });
         expect(sampleResp.status(503).getStatus()).to.eql({ code: 503, message: 'Service Unavailable' });
         expect(sampleResp.status(301).getStatus()).to.eql({ code: 301, message: 'Moved Permanently' });
         expect(sampleResp.status(302).getStatus()).to.eql({ code: 302, message: 'Found' });
         expect(sampleResp.status(418).getStatus()).to.eql({ code: 418, message: 'I\'m a teapot' });

         // reset to default
         expect(sampleResp.status(200).getStatus()).to.eql({ code: 200, message: 'OK' });
      });

      it('falls back to the status code (as a string) for unknown status codes', () => {
         expect(sampleResp.status(999).getStatus()).to.eql({ code: 999, message: '999' });
      });

   });

   describe('type', () => {

      it('sets the Content-Type header', () => {
         expect(sampleResp.getHeaders()).to.eql({});

         sampleResp.type('application/json');
         expect(sampleResp.getHeaders()).to.eql({
            'Content-Type': [ 'application/json' ],
         });

         sampleResp.type('text/plain');
         expect(sampleResp.getHeaders()).to.eql({
            'Content-Type': [ 'text/plain' ],
         });
      });

   });

   describe('links', () => {

      it('sets the Link header', () => {
         expect(sampleResp.getHeaders()).to.eql({});

         sampleResp.links({
            next: 'http://api.example.com/users?page=2',
            last: 'http://api.example.com/users?page=5',
         });
         expect(sampleResp.getHeaders()).to.eql({
            'Link': [ '<http://api.example.com/users?page=2>; rel="next", <http://api.example.com/users?page=5>; rel="last"' ],
         });
      });

   });

   describe('location', () => {

      it('sets the Location header - regular values', () => {
         expect(sampleResp.getHeaders()).to.eql({});

         sampleResp.location('/foo');
         expect(sampleResp.getHeaders()).to.eql({
            'Location': [ '/foo' ],
         });

         sampleResp.location('/bar');
         expect(sampleResp.getHeaders()).to.eql({
            'Location': [ '/bar' ],
         });

         sampleResp.location('https://example.com');
         expect(sampleResp.getHeaders()).to.eql({
            'Location': [ 'https://example.com' ],
         });

         sampleResp.location('bar');
         expect(sampleResp.getHeaders()).to.eql({
            'Location': [ 'bar' ],
         });
      });

      const test = (referer: string | null | false, expectation?: string): void => {
         it(`sets the Location header - special value 'back' - referer '${referer}'`, () => {
            let evt;

            if (referer === null) {
               // use the existing header
               evt = apiGatewayRequest();
            } else if (referer === false) {
               // remove existing header
               evt = apiGatewayRequest();
               delete evt.multiValueHeaders.Referer;
               delete evt.headers.Referer;
            } else {
               // override the existing one
               evt = _.extend(apiGatewayRequest(), {
                  multiValueHeaders: { 'Referer': [ referer ] },
                  headers: { 'Referer': referer },
               });
            }

            let req = new Request(app, evt, handlerContext()),
                resp = new Response(app, req, EMPTY_CB);

            expect(resp.getHeaders()).to.eql({});

            resp.location('back');
            expect(resp.getHeaders()).to.eql({
               'Location': [ expectation || referer ],
            });
         });
      };

      test(null, 'https://en.wikipedia.org/wiki/HTTP_referer');
      test('https://example.com/foo');
      test('/homepage');
      test(false, '/');
   });

   describe('cookie', () => {
      const test = (name: string, val: string, opts: CookieOpts | undefined, expectedHeader: string): void => {
         it(`sets cookie headers correctly - ${expectedHeader}`, () => {
            expect(sampleResp.getHeaders()).to.eql({});
            sampleResp.cookie(name, val, opts);
            expect(sampleResp.getHeaders()).to.eql({
               'Set-Cookie': [ expectedHeader ],
            });
         });
      };

      test('foo', 'bar', undefined, 'foo=bar; Path=/');
      test('foo', 'bar', { path: '/', httpOnly: true }, 'foo=bar; Path=/; HttpOnly');
      test('foo', 'url encoded', { path: '/', httpOnly: true }, 'foo=url%20encoded; Path=/; HttpOnly');
      test('foo', 'bar baz', { secure: true, domain: 'example.com' }, 'foo=bar%20baz; Domain=example.com; Path=/; Secure');

      const encoder = (v: string): string => { return v.toUpperCase(); };

      test('foo', 'bar', { encode: encoder }, 'foo=BAR; Path=/');
      test(
         'foo',
         'bar',
         { expires: new Date(Date.UTC(1991, 10, 23, 12, 30, 59, 900)) },
         'foo=bar; Path=/; Expires=Sat, 23 Nov 1991 12:30:59 GMT'
      );

      describe('with maxAge', () => {
         let now = new Date(Date.UTC(1991, 10, 23, 12, 30, 59, 900)),
             sandbox: SinonSandbox, clock: SinonFakeTimers;

         beforeEach(() => {
            sandbox = sinon.sandbox.create();
            clock = sinon.useFakeTimers(now.getTime());
         });

         afterEach(() => {
            sandbox.restore();
            clock.restore();
         });

         test('foo', 'bar', { maxAge: 5000 }, 'foo=bar; Max-Age=5; Path=/; Expires=Sat, 23 Nov 1991 12:31:04 GMT');
         // maxAge overrides expires:
         test(
            'foo',
            'bar',
            { maxAge: 15000, expires: new Date(Date.UTC(1991, 10, 23, 12, 30, 59, 900)) },
            'foo=bar; Max-Age=15; Path=/; Expires=Sat, 23 Nov 1991 12:31:14 GMT'
         );
      });
   });

   describe('clearCookie', () => {
      const test = (name: string, opts: CookieOpts | undefined, expectedHeader: string): void => {
         it(`sets cookie headers correctly - ${expectedHeader}`, () => {
            expect(sampleResp.getHeaders()).to.eql({});
            sampleResp.clearCookie(name, opts);
            expect(sampleResp.getHeaders()).to.eql({
               'Set-Cookie': [ expectedHeader ],
            });
         });
      };

      test('foo', undefined, 'foo=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      test('foo', { path: '/', httpOnly: true }, 'foo=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');
      test(
         'foo',
         { secure: true, domain: 'example.com' },
         'foo=; Domain=example.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure'
      );

      const encoder = (v: string): string => { return v.toUpperCase(); };

      test('foo', { encode: encoder }, 'foo=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      test(
         'foo',
         { expires: new Date(Date.UTC(1991, 10, 23, 12, 30, 59, 900)) },
         'foo=; Path=/; Expires=Sat, 23 Nov 1991 12:30:59 GMT'
      );

      describe('with maxAge', () => {
         let now = new Date(Date.UTC(1991, 10, 23, 12, 30, 59, 900)),
             sandbox: SinonSandbox, clock: SinonFakeTimers;

         beforeEach(() => {
            sandbox = sinon.sandbox.create();
            clock = sinon.useFakeTimers(now.getTime());
         });

         afterEach(() => {
            sandbox.restore();
            clock.restore();
         });

         test('foo', { maxAge: 5000 }, 'foo=; Max-Age=5; Path=/; Expires=Sat, 23 Nov 1991 12:31:04 GMT');
         // maxAge overrides expires:
         test(
            'foo',
            { maxAge: 15000, expires: new Date(Date.UTC(1991, 10, 23, 12, 30, 59, 900)) },
            'foo=; Max-Age=15; Path=/; Expires=Sat, 23 Nov 1991 12:31:14 GMT'
         );
      });
   });

   describe('response sending functions', () => {
      let cb: SinonSpy, resp: Response;

      beforeEach(() => {
         cb = spy();
         resp = new Response(app, sampleReq, cb);
      });

      const makeOutput = (status: number, statusMsg: string | false, body: any, headers: StringArrayOfStringsMap = {}): any => {
         const o: any = {
            isBase64Encoded: false,
            statusCode: status,
            multiValueHeaders: headers,
            body: _.isString(body) ? body : JSON.stringify(body),
         };

         if (statusMsg !== false) {
            o.statusDescription = (status + ' ' + statusMsg);
         }

         return o;
      };

      const addHeadersFromMultiValueHeaders = (r: Response, o: any): void => {
         if (r.isAPIGW()) {
            return;
         }
         o.headers = _.reduce(o.multiValueHeaders as StringArrayOfStringsMap, (memo, v, k) => {
            memo[k] = v[v.length - 1];
            return memo;
         }, {} as StringMap);
      };

      describe('end', () => {
         const test = (evt: RequestEvent, msg: string | false, testBefore: boolean): void => {
            let output = makeOutput(200, msg, '');

            resp = new Response(app, new Request(app, evt, handlerContext()), cb);

            if (testBefore) {
               resp.set('Foo', 'Bar');
               resp.append('Foo', 'Baz');
               output = makeOutput(200, msg, '', {
                  'Foo': [ 'Bar', 'Baz' ],
               });
            }
            addHeadersFromMultiValueHeaders(resp, output);
            expect(resp.headersSent).to.eql(false);
            resp.end();
            assert.calledOnce(cb);
            expect(resp.headersSent).to.eql(true);
            expect(cb.firstCall.args).to.eql([ undefined, output ]);
         };

         it('sends immediately - APIGW', () => { test(apiGatewayRequest(), false, false); });
         it('sends immediately - ALB', () => { test(albRequest(), 'OK', false); });
         it('sends immediately - ALB MV', () => { test(albMultiValHeadersRequest(), 'OK', false); });
         it('sends after setting headers - APIGW', () => { test(apiGatewayRequest(), false, true); });
         it('sends after setting headers - ALB', () => { test(albRequest(), 'OK', true); });
         it('sends after setting headers - ALB MV', () => { test(albMultiValHeadersRequest(), 'OK', true); });
      });

      describe('json', () => {
         const test = (evt: RequestEvent, msg: string | false, testBefore: boolean, extender?: Extender): void => {
            let o = { foo: 'bar' },
                output = makeOutput(200, msg, JSON.stringify(o));

            resp = new Response(app, new Request(app, evt, handlerContext()), cb);

            if (testBefore) {
               resp.set('Foo', 'Bar');
               resp.append('Foo', 'Baz');
               output = makeOutput(200, msg, JSON.stringify(o), {
                  'Foo': [ 'Bar', 'Baz' ],
               });
            }

            output.multiValueHeaders['Content-Type'] = [ 'application/json; charset=utf-8' ];

            if (extender) {
               extender(resp, output);
            }

            addHeadersFromMultiValueHeaders(resp, output);
            resp.json(o);
            assert.calledOnce(cb);
            expect(cb.firstCall.args).to.eql([ undefined, output ]);
         };

         it('sends immediately - APIGW', () => { test(apiGatewayRequest(), false, false); });
         it('sends immediately - ALB', () => { test(albRequest(), 'OK', false); });
         it('sends immediately - ALB MV', () => { test(albMultiValHeadersRequest(), 'OK', false); });
         it('sends after headers - APIGW', () => { test(apiGatewayRequest(), false, true); });
         it('sends after headers - ALB', () => { test(albRequest(), 'OK', true); });
         it('sends after headers - ALB MV', () => { test(albMultiValHeadersRequest(), 'OK', true); });

         const ext1: Extender = (r: Response, o: any): void => {
            r.status(201);
            o.statusCode = 201;
            if (o.statusDescription) {
               o.statusDescription = '201 Created';
            }
         };

         it('sends with alternate status code - APIGW', () => { test(apiGatewayRequest(), false, false, ext1); });
         it('sends with alternate status code - ALB', () => { test(albRequest(), 'OK', false, ext1); });
         it('sends with alternate status code - ALB MV', () => { test(albMultiValHeadersRequest(), 'OK', false, ext1); });

         const ext2: Extender = (r: Response, o: any): void => {
            r.type('foo/bar');
            r.status(202);
            o.statusCode = 202;
            if (o.statusDescription) {
               o.statusDescription = '202 Accepted';
            }
         };

         it('overrides previously-set content type - APIGW', () => { test(apiGatewayRequest(), false, false, ext2); });
         it('overrides previously-set content type - ALB', () => { test(albRequest(), 'OK', false, ext2); });
         it('overrides previously-set content type - ALB MV', () => { test(albMultiValHeadersRequest(), 'OK', false, ext2); });
      });

      describe('jsonp', () => {
         const test = (evt: RequestEvent, msg: string | false, extender?: Extender, overrideQueryParamName?: string | false): void => {
            let o = { foo: 'bar' },
                queryParamName = overrideQueryParamName || 'callback',
                body = `/**/ typeof fooFunction === 'function' && fooFunction(${JSON.stringify(o)});`;

            if (overrideQueryParamName === false) {
               // false means no query parameter was present
               body = JSON.stringify(o);
            } else {
               if (evt.multiValueQueryStringParameters) {
                  // TODO: test with multiple _different_ values
                  evt.multiValueQueryStringParameters[queryParamName] = [ 'fooFunction' ];
               }
               if (evt.queryStringParameters) {
                  evt.queryStringParameters[queryParamName] = 'fooFunction';
               }
            }

            let output = makeOutput(200, msg, body);

            resp = new Response(app, new Request(app, evt, handlerContext()), cb);
            output.multiValueHeaders['Content-Type'] = [ 'text/javascript; charset=utf-8' ];

            if (extender) {
               extender(resp, output);
            }

            addHeadersFromMultiValueHeaders(resp, output);
            resp.jsonp(o);
            assert.calledOnce(cb);
            expect(cb.firstCall.args).to.eql([ undefined, output ]);
         };

         it('sends immediately - APIGW', () => { test(apiGatewayRequest(), false); });
         it('sends immediately - ALB', () => { test(albRequest(), 'OK'); });
         it('sends immediately - ALB MV', () => { test(albMultiValHeadersRequest(), 'OK'); });

         const ext1: Extender = (r, o): void => {
            r.set('Foo', 'Bar');
            r.append('Foo', 'Baz');
            if (o.multiValueHeaders) {
               o.multiValueHeaders.Foo = [ 'Bar', 'Baz' ];
            }
         };

         it('sends after headers - APIGW', () => { test(apiGatewayRequest(), false, ext1); });
         it('sends after headers - ALB', () => { test(albRequest(), 'OK', ext1); });
         it('sends after headers - ALB MV', () => { test(albMultiValHeadersRequest(), 'OK', ext1); });

         const ext2: Extender = (): void => {
            app.setSetting('jsonp callback name', 'cbFnName');
         };

         it('works with custom callback param name - APIGW', () => { test(apiGatewayRequest(), false, ext2, 'cbFnName'); });
         it('works with custom callback param name - ALB', () => { test(albRequest(), 'OK', ext2, 'cbFnName'); });
         it('works with custom callback param name - ALB MV', () => { test(albMultiValHeadersRequest(), 'OK', ext2, 'cbFnName'); });

         const ext3: Extender = (_r, o): void => {
            o.multiValueHeaders['Content-Type'] = [ 'application/json; charset=utf-8' ];
         };

         it('works like JSON when no callback in query - APIGW', () => { test(apiGatewayRequest(), false, ext3, false); });
         it('works like JSON when no callback in query - ALB', () => { test(albRequest(), 'OK', ext3, false); });
         it('works like JSON when no callback in query - ALB MV', () => { test(albMultiValHeadersRequest(), 'OK', ext3, false); });
      });

      describe('redirect', () => {
         const testWithBack = (referer: string | null | false, expectation: string, code?: number, msg?: string): void => {
            it(`redirects - special value 'back', status ${code}, referer '${referer}'`, () => {
               let evt;

               if (referer === null) {
                  // use the existing header
                  evt = albMultiValHeadersRequest();
               } else if (referer === false) {
                  // remove existing header
                  evt = albMultiValHeadersRequest();
                  if (evt.multiValueHeaders) {
                     delete evt.multiValueHeaders.referrer;
                  }
               } else {
                  // override the existing one
                  evt = _.extend(albMultiValHeadersRequest(), {
                     multiValueHeaders: { 'referrer': [ referer ] },
                  });
               }

               const req = new Request(app, evt, handlerContext());

               resp = new Response(app, req, cb);

               const output = makeOutput(code ? code : 302, msg ? msg : 'Found', '', {
                  'Location': [ expectation ],
               });

               expect(resp.getHeaders()).to.eql({});

               if (code === undefined) {
                  resp.redirect('back');
               } else {
                  resp.redirect(code, 'back');
               }
               addHeadersFromMultiValueHeaders(resp, output);
               assert.calledOnce(cb);
               expect(cb.firstCall.args).to.eql([ undefined, output ]);
            });
         };

         testWithBack(null, 'https://en.wikipedia.org/wiki/HTTP_referer');
         testWithBack('https://example.com/foo', 'https://example.com/foo');
         testWithBack('/homepage', '/homepage');
         testWithBack(false, '/');

         const codes = {
            'Multiple Choices': 300,
            'Moved Permanently': 301,
            'Found': 302,
            'See Other': 303,
            'Not Modified': 304,
            'Use Proxy': 305,
            'Temporary Redirect': 307,
            'Permanent Redirect': 308,
         };

         _.each(codes, (code, msg) => {
            testWithBack(null, 'https://en.wikipedia.org/wiki/HTTP_referer', code, msg);
            testWithBack('https://example.com/foo', 'https://example.com/foo', code, msg);
            testWithBack('/homepage', '/homepage', code, msg);
            testWithBack(false, '/', code, msg);
         });

      });

      describe('send', () => {
         type Extender = (resp: Response, output: any) => void;

         const test = (evt: RequestEvent, code: number, msg: string | false, body: any, extender?: Extender): void => {
            let output = makeOutput(code, msg, body);

            resp = new Response(app, new Request(app, evt, handlerContext()), cb);

            if (extender) {
               extender(resp, output);
            }

            addHeadersFromMultiValueHeaders(resp, output);
            resp.send(body);
            assert.calledOnce(cb);
            expect(cb.firstCall.args).to.eql([ undefined, output ]);
         };

         const ext1: Extender = (_r, o): void => {
            o.multiValueHeaders['Content-Type'] = [ 'text/html' ];
         };

         it('sends string immediately - APIGW', () => { test(apiGatewayRequest(), 200, false, 'body', ext1); });
         it('sends string immediately - ALB', () => { test(albRequest(), 200, 'OK', 'body', ext1); });
         it('sends string immediately - ALB MV', () => { test(albMultiValHeadersRequest(), 200, 'OK', 'body', ext1); });

         const ext2: Extender = (r, o): void => {
            r.type('foo/bar');
            o.multiValueHeaders['Content-Type'] = [ 'foo/bar' ];
         };

         it('sends string with existing content type - APIGW', () => { test(apiGatewayRequest(), 200, false, 'body', ext2); });
         it('sends string with existing content type - ALB', () => { test(albRequest(), 200, 'OK', 'body', ext2); });
         it('sends string with existing content type - ALB MV', () => { test(albMultiValHeadersRequest(), 200, 'OK', 'body', ext2); });

         const bodyObj = { a: 'b', c: 'd', foo: 'bar' };

         const ext3: Extender = (_r, o): void => {
            o.body = JSON.stringify(bodyObj);
            o.multiValueHeaders['Content-Type'] = [ 'application/json; charset=utf-8' ];
         };

         it('sends JSON immediately - APIGW', () => { test(apiGatewayRequest(), 200, false, bodyObj, ext3); });
         it('sends JSON immediately - ALB', () => { test(albRequest(), 200, 'OK', bodyObj, ext3); });
         it('sends JSON immediately - ALB MV', () => { test(albMultiValHeadersRequest(), 200, 'OK', bodyObj, ext3); });
      });

      describe('sendStatus', () => {
         const test = (evt: RequestEvent, code: number, msg: string | false, testBefore: boolean): void => {
            let output = makeOutput(code, msg, '');

            resp = new Response(app, new Request(app, evt, handlerContext()), cb);

            if (testBefore) {
               resp.set('Foo', 'Bar');
               resp.append('Foo', 'Baz');
               output = makeOutput(code, msg, '', {
                  'Foo': [ 'Bar', 'Baz' ],
               });
            }
            addHeadersFromMultiValueHeaders(resp, output);
            resp.sendStatus(code);
            assert.calledOnce(cb);
            expect(cb.firstCall.args).to.eql([ undefined, output ]);
         };

         _.each({ 'OK': 200, 'Created': 201, 'Not Found': 404, 'I\'m a teapot': 418 }, (code, msg) => {
            it(`sends immediately - APIGW - ${code} ${msg}`, () => { test(apiGatewayRequest(), code, false, false); });
            it(`sends immediately - ALB - ${code} ${msg}`, () => { test(albRequest(), code, msg, false); });
            it(`sends immediately - ALB MV - ${code} ${msg}`, () => { test(albMultiValHeadersRequest(), code, msg, false); });
            it(`sends after headers - APIGW - ${code} ${msg}`, () => { test(apiGatewayRequest(), code, false, true); });
            it(`sends after headers - ALB - ${code} ${msg}`, () => { test(albRequest(), code, msg, true); });
            it(`sends after headers - ALB MV - ${code} ${msg}`, () => { test(albMultiValHeadersRequest(), code, msg, true); });
         });
      });

   });

   describe('before / after write callbacks', () => {

      it('calls callbacks at the appropriate time', () => {
         const cb = spy(),
               resp = new Response(app, new Request(app, albMultiValHeadersRequest(), handlerContext()), cb),
               before1 = spy(() => { resp.append('X-Foo', 'Bar'); }),
               before2 = spy(() => { resp.append('X-Foo', 'Baz'); }),
               after1 = spy(() => { expect(resp.headersSent).to.eql(true); });

         const after2 = spy(() => {
            try {
               resp.set('X-Bar', 'ThisWillThrowError');
               fail('Should have thrown an error');
            } catch(e) {
               expect(e.message).to.eql('Can\'t set headers after they are sent.');
            }
         });

         const spies = [ before1, before2, cb, after1, after2 ];

         resp.onBeforeWriteHeaders(before1);
         resp.onBeforeWriteHeaders(before2);
         resp.onAfterWrite(after1);
         resp.onAfterWrite(after2);

         resp.sendStatus(404);
         _.each(spies, (s) => {
            assert.calledOnce(s);
         });
         assert.callOrder(...spies);
         expect(cb.lastCall.args[0]).to.eql(undefined);
         expect(cb.lastCall.args[1]).to.eql({
            isBase64Encoded: false,
            statusCode: 404,
            statusDescription: '404 Not Found',
            headers: { 'X-Foo': 'Baz' },
            multiValueHeaders: {
               'X-Foo': [ 'Bar', 'Baz' ],
            },
            body: '',
         });
      });

   });

});