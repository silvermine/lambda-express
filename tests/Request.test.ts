import _ from 'underscore';
import { expect } from 'chai';
import { Request, Application } from '../src';
import { RequestEvent } from '../src/request-response-types';
import { apiGatewayRequest, handlerContext, albRequest, albMultiValHeadersRequest } from './samples';
import { isKeyValueStringObject } from '../src/utils/common-types';

describe('Request', () => {
   let app: Application, allRequestTypes: Request[], allEventTypes: RequestEvent[];

   beforeEach(() => {
      app = new Application();
      allEventTypes = [ apiGatewayRequest(), albRequest(), albMultiValHeadersRequest() ];
      allRequestTypes = [
         new Request(app, apiGatewayRequest(), handlerContext()),
         new Request(app, albRequest(), handlerContext()),
         new Request(app, albMultiValHeadersRequest(), handlerContext()),
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

   describe('cookie functionality', () => {

      it('parses cookies correctly, including decoding values', () => {
         _.each(allRequestTypes, (req) => {
            expect(req.cookies.uid).to.eql('abc');
            expect(req.cookies.baz).to.eql('foo[a]');
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

});
