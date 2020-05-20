import _ from 'underscore';
import { expect } from 'chai';
import { Request, Application } from '../src';
import { RequestEvent } from '../src/request-response-types';
import {
   apiGatewayRequest,
   handlerContext,
   albRequest,
   albMultiValHeadersRequest,
   albRequestRawQuery,
   apiGatewayRequestRawQuery,
   albMultiValHeadersRawQuery,
} from './samples';
import { isKeyValueStringObject } from '@silvermine/toolbox';
import ConsoleLogger from '../src/logging/ConsoleLogger';
import sinon from 'sinon';
import { DebugLogObject } from '../src/logging/logging-types';

describe('Request', () => {
   let app: Application, allRequestTypes: Request[], allEventTypes: RequestEvent[], rawQueries: string[];

   beforeEach(() => {
      app = new Application();
      allEventTypes = [ apiGatewayRequest(), albRequest(), albMultiValHeadersRequest() ];
      allRequestTypes = [
         new Request(app, apiGatewayRequest(), handlerContext()),
         new Request(app, albRequest(), handlerContext()),
         new Request(app, albMultiValHeadersRequest(), handlerContext()),
      ];
      rawQueries = [
         apiGatewayRequestRawQuery,
         albRequestRawQuery,
         albMultiValHeadersRawQuery,
      ];

   });

   describe('constructor', () => {
      it('sets the app correctly', () => {
         expect(new Request(app, albRequest(), handlerContext()).app).to.strictlyEqual(app);
      });

      it('sets `method` correctly', () => {
         expect(new Request(app, albRequest(), handlerContext()).method).to.strictlyEqual('GET');
         expect(new Request(app, _.extend({}, albRequest(), { httpMethod: 'get' }), handlerContext()).method).to.strictlyEqual('GET');
         expect(new Request(app, _.extend({}, albRequest(), { httpMethod: 'PoSt' }), handlerContext()).method).to.strictlyEqual('POST');

         // make sure that undefined values don't break it:
         let evt2: RequestEvent = albRequest();

         delete evt2.httpMethod;
         expect(evt2.httpMethod).to.strictlyEqual(undefined);
         expect(new Request(app, evt2, handlerContext()).method).to.strictlyEqual('');
      });

      it('sets URL related fields correctly, when created from an event', () => {
         const event = albRequest(),
               request = new Request(app, event, handlerContext());

         expect(request.url).to.strictlyEqual(event.path + albRequestRawQuery);
         expect(request.path).to.strictlyEqual(event.path);
         expect(request.originalUrl).to.strictlyEqual(event.path + albRequestRawQuery);
      });

      it('sets URL related fields correctly, when created from a parent request', () => {
         const event = albRequest();

         let parentRequest, request;

         event.path = '/a/b/c';

         parentRequest = new Request(app, event, handlerContext());
         request = new Request(app, parentRequest, handlerContext(), '/a/b');

         expect(request.url).to.strictlyEqual(`/c${albRequestRawQuery}`);
         expect(request.path).to.strictlyEqual('/c');
         expect(request.baseUrl).to.strictlyEqual('/a/b');
         expect(parentRequest.url).to.strictlyEqual(`${event.path}${albRequestRawQuery}`);
         expect(request.originalUrl).to.strictlyEqual(`${event.path}${albRequestRawQuery}`);
         expect(request.originalUrl).to.strictlyEqual(`${parentRequest.url}`);
      });

   });

   describe('makeSubRequest', () => {

      it('sets URL related fields correctly', () => {
         _.each(allRequestTypes, (req, i) => {
            const sub = req.makeSubRequest('/echo'),
                  query = rawQueries[i];

            expect(sub.baseUrl).to.eql('/echo');
            expect(sub.originalUrl).to.eql(`/echo/asdf/a${query}`);
            expect(sub.path).to.eql('/asdf/a');
            expect(sub.url).to.eql(`/asdf/a${query}`);
         });
      });

      it('sets params correctly, and frozen', () => {
         _.each(allRequestTypes, (req) => {
            const sub = req.makeSubRequest('/echo', { foo: 'asdf' });

            expect(sub.params).to.eql({ foo: 'asdf' });
            expect(() => { (sub.params as any).bar = 'x'; }).to.throw('Cannot add property bar, object is not extensible');
         });
      });

   });

   describe('header functionality', () => {

      it('works with multi-value headers provided in the event (and is case-insensitive)', () => {
         let apigw = new Request(app, apiGatewayRequest(), handlerContext()),
             albmv = new Request(app, albMultiValHeadersRequest(), handlerContext());

         _.each([ apigw, albmv ], (req) => {
            // header that only has one value
            expect(req.get('User-Agent')).to.strictlyEqual('curl/7.54.0');
            expect(req.header('User-Agent')).to.strictlyEqual('curl/7.54.0');
            expect(req.headerAll('User-Agent')).to.eql([ 'curl/7.54.0' ]);

            // header with multiple values
            expect(req.get('Foo')).to.strictlyEqual('baz');
            expect(req.header('Foo')).to.strictlyEqual('baz');
            expect(req.headerAll('Foo')).to.eql([ 'bar', 'baz' ]);

            // case insensitivity
            expect(req.get('User-Agent')).to.strictlyEqual('curl/7.54.0');
            expect(req.header('user-agent')).to.strictlyEqual('curl/7.54.0');
            expect(req.headerAll('UseR-AgeNT')).to.eql([ 'curl/7.54.0' ]);
            expect(req.headerAll('FoO')).to.eql([ 'bar', 'baz' ]);
         });
      });

      it('works with single-value headers provided in the event (and is case-insensitive)', () => {
         let req = new Request(app, albRequest(), handlerContext());

         // header that only has one value
         expect(req.get('User-Agent')).to.strictlyEqual('curl/7.54.0');
         expect(req.header('User-Agent')).to.strictlyEqual('curl/7.54.0');
         expect(req.headerAll('User-Agent')).to.eql([ 'curl/7.54.0' ]);

         // header with multiple values
         expect(req.get('Foo')).to.strictlyEqual('baz');
         expect(req.header('Foo')).to.strictlyEqual('baz');
         expect(req.headerAll('Foo')).to.eql([ 'baz' ]);

         // case insensitivity
         expect(req.get('User-Agent')).to.strictlyEqual('curl/7.54.0');
         expect(req.header('user-agent')).to.strictlyEqual('curl/7.54.0');
         expect(req.headerAll('UseR-AgeNT')).to.eql([ 'curl/7.54.0' ]);
         expect(req.headerAll('FoO')).to.eql([ 'baz' ]);

         // non-existent headers
         expect(req.header('bar')).to.eql(undefined);
         expect(req.header('Bar')).to.eql(undefined);
      });

      it('works if no headers exist in the event', () => {
         _.each(allEventTypes, (evt) => {
            delete evt.headers;
            delete evt.multiValueHeaders;
            const req = new Request(app, evt, handlerContext());

            expect(req.header('foo')).to.eql(undefined);
            expect(req.header('Foo')).to.eql(undefined);
         });
      });

      it('handles the Referer/Referrer problem (and is case-insensitive with it)', () => {
         _.each(allRequestTypes, (req) => {
            _.each([ 'Referer', 'Referrer', 'referer', 'referrer', 'ReFeReR', 'ReFeRrEr' ], (key) => {
               expect(req.get(key)).to.eql('https://en.wikipedia.org/wiki/HTTP_referer');
               expect(req.header(key)).to.eql('https://en.wikipedia.org/wiki/HTTP_referer');
               expect(req.headerAll(key)).to.eql([ 'https://en.wikipedia.org/wiki/HTTP_referer' ]);
            });
         });
      });

   });

   describe('cookie functionality', () => {

      it('parses cookies correctly, including decoding values', () => {
         _.each(allRequestTypes, (req) => {
            expect(req.cookies.uid).to.eql('abc');
            expect(req.cookies.baz).to.eql('foo[a]');
            expect(req.cookies.obj).to.eql({ abc: 123 });
            expect(req.cookies.onechar).to.eql('j');
            expect(req.cookies.bad).to.eql('j:{a}');
         });
      });

      it('sets an empty object so that all cookies are undefined when no header present', () => {
         const evt = albRequest();

         if (evt.headers) {
            delete evt.headers.cookie;
         }

         const req = new Request(app, evt, handlerContext());

         expect(req.cookies).to.eql({});
         expect(req.cookies.uid).to.eql(undefined);
      });

   });

   describe('hostname property', () => {

      it('parses correctly', () => {
         let evt: RequestEvent = apiGatewayRequest(),
             req;

         evt.headers.Host = 'b5gee6dacf.execute-api.us-east-1.amazonaws.com:443';
         req = new Request(app, evt, handlerContext());
         expect(req.hostname).to.eql('b5gee6dacf.execute-api.us-east-1.amazonaws.com');

         evt.headers.Host = 'b5gee6dacf.execute-api.us-east-1.amazonaws.com';
         req = new Request(app, evt, handlerContext());
         expect(req.hostname).to.eql('b5gee6dacf.execute-api.us-east-1.amazonaws.com');

         evt = albRequest();
         if (evt.headers) {
            evt.headers.host = 'b5gee6dacf.execute-api.us-east-1.amazonaws.com:443';
         }
         req = new Request(app, evt, handlerContext());
         expect(req.hostname).to.eql('b5gee6dacf.execute-api.us-east-1.amazonaws.com');

         evt = albMultiValHeadersRequest();
         if (evt.multiValueHeaders) {
            evt.multiValueHeaders.host = [ 'b5gee6dacf.execute-api.us-east-1.amazonaws.com:443' ];
         }
         req = new Request(app, evt, handlerContext());
         expect(req.hostname).to.eql('b5gee6dacf.execute-api.us-east-1.amazonaws.com');
      });

   });

   describe('ip property', () => {

      it('parses correctly', () => {
         let req = new Request(app, apiGatewayRequest(), handlerContext()),
             evt: RequestEvent;

         expect(req.ip).to.eql('12.12.12.12');

         // API Gateway requests always use the one from the request context, so it
         // shouldn't matter what the 'trust proxy' setting is set to.
         app.enable('trust proxy');
         req = new Request(app, apiGatewayRequest(), handlerContext());
         expect(req.ip).to.eql('12.12.12.12');

         app.disable('trust proxy');
         req = new Request(app, apiGatewayRequest(), handlerContext());
         expect(req.ip).to.eql('12.12.12.12');

         // ALB requests don't have the IP in the request context, so it's dependent on
         // the 'trust proxy' setting and presence of the X-Forwarded-For header.
         app.enable('trust proxy');
         req = new Request(app, albRequest(), handlerContext());
         expect(req.ip).to.eql('8.8.8.8');

         app.disable('trust proxy');
         req = new Request(app, albRequest(), handlerContext());
         expect(req.ip).to.eql(undefined);

         app.enable('trust proxy');
         req = new Request(app, albMultiValHeadersRequest(), handlerContext());
         expect(req.ip).to.eql('8.8.8.8');

         app.disable('trust proxy');
         req = new Request(app, albMultiValHeadersRequest(), handlerContext());
         expect(req.ip).to.eql(undefined);

         // and without the header (even when we would trust the header):
         app.enable('trust proxy');
         evt = albMultiValHeadersRequest();
         if (evt.multiValueHeaders) {
            delete evt.multiValueHeaders['x-forwarded-for'];
         }
         req = new Request(app, evt, handlerContext());
         expect(req.ip).to.eql(undefined);
      });

   });

   describe('event source functionality', () => {
      it('properly detects event source', () => {
         let alb = new Request(app, albRequest(), handlerContext()),
             albmv = new Request(app, albMultiValHeadersRequest(), handlerContext()),
             apigw = new Request(app, apiGatewayRequest(), handlerContext());

         expect(alb.eventSourceType).to.eql(Request.SOURCE_ALB);
         expect(alb.isALB()).to.eql(true);
         expect(alb.isAPIGW()).to.eql(false);

         expect(albmv.eventSourceType).to.eql(Request.SOURCE_ALB);
         expect(albmv.isALB()).to.eql(true);
         expect(albmv.isAPIGW()).to.eql(false);

         expect(apigw.eventSourceType).to.eql(Request.SOURCE_APIGW);
         expect(apigw.isALB()).to.eql(false);
         expect(apigw.isAPIGW()).to.eql(true);
      });
   });

   describe('protocol / secure properties', () => {

      it('parses proper values - APIGW', () => {
         let evt, req;

         // APIGW should always be HTTPS, and not care about headers
         req = new Request(app, apiGatewayRequest(), handlerContext());
         app.disable('trust proxy');
         expect(req.protocol).to.eql('https');
         expect(req.secure).to.eql(true);
         app.enable('trust proxy');
         expect(req.protocol).to.eql('https');
         expect(req.secure).to.eql(true);

         evt = apiGatewayRequest();
         evt.headers['X-Forwarded-Proto'] = 'http';
         evt.multiValueHeaders['X-Forwarded-Proto'] = [ 'http' ];
         app.disable('trust proxy');
         expect(req.protocol).to.eql('https');
         expect(req.secure).to.eql(true);
         app.enable('trust proxy');
         expect(req.protocol).to.eql('https');
         expect(req.secure).to.eql(true);
      });

      it('parses proper values - ALB', () => {
         let req;

         // ALB uses the headers, so only has a protocol when 'trust proxy' is enabled
         _.each([ albRequest(), albMultiValHeadersRequest() ], (evt) => {
            app.disable('trust proxy');
            req = new Request(app, evt, handlerContext());
            expect(req.protocol).to.eql(undefined);
            expect(req.secure).to.eql(false);
            app.enable('trust proxy');
            req = new Request(app, evt, handlerContext());
            expect(req.protocol).to.eql('http');
            expect(req.secure).to.eql(false);

            if (evt.headers) {
               evt.headers['x-forwarded-proto'] = 'https';
            }
            if (evt.multiValueHeaders) {
               evt.multiValueHeaders['x-forwarded-proto'] = [ 'https' ];
            }
            app.disable('trust proxy');
            req = new Request(app, evt, handlerContext());
            expect(req.protocol).to.eql(undefined);
            expect(req.secure).to.eql(false);
            app.enable('trust proxy');
            req = new Request(app, evt, handlerContext());
            expect(req.protocol).to.eql('https');
            expect(req.secure).to.eql(true);

            // and if the header doesn't exist:
            if (evt.headers) {
               delete evt.headers['x-forwarded-proto'];
            }
            if (evt.multiValueHeaders) {
               delete evt.multiValueHeaders['x-forwarded-proto'];
            }
            app.disable('trust proxy');
            req = new Request(app, evt, handlerContext());
            expect(req.protocol).to.eql(undefined);
            expect(req.secure).to.eql(false);
            app.enable('trust proxy');
            req = new Request(app, evt, handlerContext());
            expect(req.protocol).to.eql(undefined);
            expect(req.secure).to.eql(false);
         });
      });
   });

   describe('xhr property', () => {
      it('parses proper values', () => {
         _.each(allEventTypes, (evt) => {
            let req = new Request(app, evt, handlerContext());

            expect(req.xhr).to.eql(false);

            if (evt.headers) {
               evt.headers['x-requested-with'] = 'XMLHttpRequest';
            }
            if (evt.multiValueHeaders) {
               evt.multiValueHeaders['x-requested-with'] = [ 'XMLHttpRequest' ];
            }
            req = new Request(app, evt, handlerContext());
            expect(req.xhr).to.eql(true);
         });
      });
   });

   describe('query strings', () => {

      it('parses simple values correctly', () => {
         _.each(allEventTypes, (evt) => {
            const req = new Request(app, evt, handlerContext());

            expect(req.query.y).to.eql('z');
         });
      });

      it('parses arrays of values correctly - when multi-value is supported', () => {
         _.each([ apiGatewayRequest(), albMultiValHeadersRequest() ], (evt) => {
            const req = new Request(app, evt, handlerContext());

            expect(req.query.x).to.eql([ '1', '2' ]);
         });
      });

      it('parses arrays of values correctly - uses last when multi-value is NOT supported', () => {
         const req = new Request(app, albRequest(), handlerContext());

         expect(req.query.x).to.eql('2');
      });

      it('parses objects correctly', () => {
         const test = (evt: RequestEvent, expected: any): void => {
            const req = new Request(app, evt, handlerContext());

            expect(req.query.foo).to.not.eql(undefined);
            expect(isKeyValueStringObject(req.query.foo)).to.eql(true);
            if (isKeyValueStringObject(req.query.foo)) {
               expect(req.query.foo.a).to.eql(expected);
            }
         };

         test(apiGatewayRequest(), [ 'bar b', 'baz c' ]);
         test(albRequest(), 'baz c');
         test(albMultiValHeadersRequest(), [ 'bar b', 'baz c' ]);
      });

      it('only contains the expected data', () => {
         let req = new Request(app, apiGatewayRequest(), handlerContext());

         expect(req.query).to.eql({
            foo: { a: [ 'bar b', 'baz c' ] },
            x: [ '1', '2' ],
            y: 'z',
         });

         req = new Request(app, albRequest(), handlerContext());

         expect(req.query).to.eql({
            foo: { a: 'baz c' },
            x: '2',
            y: 'z',
         });

         req = new Request(app, albMultiValHeadersRequest(), handlerContext());

         expect(req.query).to.eql({
            foo: { a: [ 'bar b', 'baz c' ] },
            x: [ '1', '2' ],
            y: 'z',
         });
      });

   });

   describe('body parsing functionality', () => {

      it('sets body to null for empty values', () => {
         _.each([ null, undefined, '' ], (body) => {
            let req = new Request(app, _.extend(apiGatewayRequest(), { body }), handlerContext());

            expect(req.body).to.strictlyEqual(null);
         });
      });

      it('parses valid JSON objects', () => {
         const bodies = [
            { a: 'b', 1: 2 },
            [ 1, 2, 3, 5, 8 ],
            'test',
         ];

         _.each(bodies, (o) => {
            let ext = { body: JSON.stringify(o), multiValueHeaders: { 'Content-Type': [ 'application/json; charset=utf-8' ] } },
                req = new Request(app, _.extend(apiGatewayRequest(), ext), handlerContext());

            expect(req.body).to.eql(o);
         });
      });

      it('sets body to null for unparseable objects', () => {
         const bodies = [ '{', '[}', '{"a":dfd}' ];

         _.each(bodies, (body) => {
            let ext = { body, multiValueHeaders: { 'Content-Type': [ 'application/json; charset=utf-8' ] } },
                req = new Request(app, _.extend(apiGatewayRequest(), ext), handlerContext());

            expect(req.body).to.strictlyEqual(null);
         });
      });


      it('sets body to string value for unknown content types', () => {
         const bodies = [ '{', '[}', '{"a":dfd}' ];

         _.each(bodies, (body) => {
            let ext = { body, multiValueHeaders: { 'Content-Type': [ 'foo/bar; charset=utf-8' ] } },
                req = new Request(app, _.extend(apiGatewayRequest(), ext), handlerContext());

            expect(req.body).to.strictlyEqual(body);
         });
      });

   });

   describe('`url` property', () => {

      it('should be able to be updated', () => {
         let req = new Request(app, apiGatewayRequest(), handlerContext()),
             newURL = '/test';

         // Assert that we have a valid test
         expect(req.url).to.not.strictlyEqual(newURL);

         req.url = newURL;
         expect(req.url).to.strictlyEqual(newURL);
      });

      it('should accept blank values', () => {
         let req = new Request(app, apiGatewayRequest(), handlerContext()),
             newURL = '';

         // Assert that we have a valid test
         expect(req.url).to.not.strictlyEqual(newURL);

         req.url = newURL;
         expect(req.url).to.strictlyEqual(newURL);
      });

      it('should update `path` when `url` changes', () => {
         let req = new Request(app, apiGatewayRequest(), handlerContext()),
             newURL = '/test';

         // Assert that we have a valid test
         expect(req.path).to.not.strictlyEqual(newURL);

         req.url = newURL;
         expect(req.path).to.strictlyEqual(newURL);
      });

      it('should update the parent request\'s `url` and related properties when a sub-request\'s `url` is updated', () => {
         let event = apiGatewayRequest(),
             req, subReq, subSubReq;

         // Assert that we have a valid test
         expect(event.path).to.not.strictlyEqual('/path/path/old');

         event.path = '/path/path/old';

         req = new Request(app, event, handlerContext());
         subReq = req.makeSubRequest('/path');
         subSubReq = subReq.makeSubRequest('/path');

         subSubReq.url = '/new';

         expect(subSubReq.url).to.strictlyEqual('/new');
         expect(subSubReq.baseUrl).to.strictlyEqual('/path/path');
         expect(subSubReq.originalUrl).to.strictlyEqual(`/path/path/old${apiGatewayRequestRawQuery}`);

         expect(subReq.url).to.strictlyEqual('/path/new');
         expect(subReq.baseUrl).to.strictlyEqual('/path');
         expect(subReq.originalUrl).to.strictlyEqual(`/path/path/old${apiGatewayRequestRawQuery}`);

         expect(req.url).to.strictlyEqual('/path/path/new');
         expect(req.baseUrl).to.strictlyEqual('');
         expect(req.originalUrl).to.strictlyEqual(`/path/path/old${apiGatewayRequestRawQuery}`);
      });

   });

   describe('`log` property', () => {

      function testLog(req: Request): void {
         let consoleSpy = sinon.spy(console, 'log'),
             logLine: DebugLogObject;

         expect(req.log).to.be.an.instanceOf(ConsoleLogger);

         // Set level to `debug` to test full debug log line
         req.log.setLevel('debug');
         req.log.debug('test', { test: true });

         sinon.assert.calledOnce(consoleSpy);

         logLine = JSON.parse(consoleSpy.firstCall.args[0]);
         expect(logLine.msg).to.strictlyEqual('test');
         expect(logLine.data).to.eql({ test: true });
         expect(logLine.remaining).to.be.a('number');
         expect(logLine.timer).to.be.a('number');

         consoleSpy.restore();
      }

      it('exists and logs messages', () => {
         let req = new Request(app, apiGatewayRequest(), handlerContext());

         testLog(req);
      });

      it('is inherited from parent requests to sub-requests', () => {
         let req = new Request(app, apiGatewayRequest(), handlerContext()),
             subReq = req.makeSubRequest('');

         testLog(subReq);
         expect(subReq.log).to.strictlyEqual(req.log);
      });

   });

});
