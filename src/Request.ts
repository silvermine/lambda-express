import _ from 'underscore';
import qs from 'qs';
import cookie from 'cookie';
import Application from './Application';
import { RequestEvent, HandlerContext, RequestEventRequestContext } from './request-response-types';
import { StringMap, KeyValueStringObject, StringArrayOfStringsMap } from './utils/common-types';

export default class Request {

   public static readonly SOURCE_ALB = 'ALB';
   public static readonly SOURCE_APIGW = 'APIGW';

   /**
    * The application that is running this request.
    */
   public readonly app: Application;

   /**
    * The URL path on which a router instance was mounted.
    *
    * The `req.baseUrl` property is similar to the `mountpath` property of the app object,
    * except `app.mountpath` returns the matched path pattern(s).
    *
    * For example:
    *
    * ```
    * var greet = express.Router();
    *
    * app.use('/greet', greet); // load the router on '/greet'
    * greet.get('/jp', function (req, res) {
    *    console.log(req.baseUrl); // '/greet'
    *    res.send('Konichiwa!');
    * });
    * ```
    *
    * Even if you use a path pattern or a set of path patterns to load the router, the
    * `baseUrl` property returns the matched string, not the pattern(s). In the following
    * example, the greet router is loaded on two path patterns.
    *
    * ```
    * // load the router on '/gre+t' and '/hel{2}o':
    * app.use(['/gre+t', '/hel{2}o'], greet);
    * ```
    * When a request is made to `/greet/jp`, `req.baseUrl` is `/greet`. When a request is
    * made to `/hello/jp`, `req.baseUrl` is `/hello`.
    */
   public readonly baseUrl: string;

   /**
    * Contains cookies sent by the request (key/value pairs). If the request contains no
    * cookies, it defaults to `{}`.
    */
   public readonly cookies: StringMap;

   /**
    * Contains the hostname derived from the `Host` HTTP header.
    *
    * When the `trust proxy` app setting is truthy, this property will instead have the
    * value of the `X-Forwarded-Host` header field. This header can be set by the client
    * or by the proxy.
    *
    * ```
    * // Host: "example.com:3000"
    * req.hostname // => "example.com"
    * ```
    */
   public readonly hostname: string | undefined;

   /**
    * When an IP address is supplied by the Lambda integration (e.g. API Gateway supplies
    * `evt.requestContext.identity.sourceIp`), that value is used. Contains the remote IP
    * address of the request.
    *
    * Otherwise, when the `trust proxy` setting on the application is truthy, the value of
    * this property is derived from the left-most entry in the `X-Forwarded-For` header.
    * This header can be set by the client or by the proxy.
    */
   public readonly ip: string | undefined;

   /**
    * The HTTP method used in this request (e.g. `GET`, `POST`, etc). Will always be all
    * uppercase.
    */
   public readonly method: string;

   /**
    * This property is much like `req.url`; however, it retains the original request URL,
    * allowing you to rewrite `req.url` freely for internal routing purposes. For example,
    * the "mounting" feature of `app.use()` will rewrite `req.url` to strip the mount
    * point.
    *
    * ```
    * // GET /search?q=something
    * req.originalUrl
    * // => "/search?q=something"
    * ```
    *
    * In a middleware function, `req.originalUrl` is a combination of `req.baseUrl` and
    * `req.path`, as shown in the following example.
    *
    * ```
    * app.use('/admin', function(req, res, next) {  // GET 'http://www.example.com/admin/new'
    *    console.log(req.originalUrl); // '/admin/new'
    *    console.log(req.baseUrl); // '/admin'
    *    console.log(req.path); // '/new'
    *    next();
    * });
    * ```
    */
   public readonly originalUrl: string;

   /**
    * This property is an object containing properties mapped to the named route
    * "parameters". For example, if you have the route `/user/:name`, then the "name"
    * property is available as `req.params.name`. This object defaults to `{}`.
    *
    * ```
    * // GET /user/tj
    * req.params.name // => "tj"
    * ```
    *
    * When you use a regular expression for the route definition, capture groups are
    * provided in the array using `req.params[n]`, where `n` is the nth capture group.
    * This rule is applied to unnamed wild card matches with string routes such as
    * `/file/*`:
    *
    * ```
    * // GET /file/javascripts/jquery.js
    * req.params[0] // => "javascripts/jquery.js"
    * ```
    *
    * Middleware and route handlers are not able to change param values.
    *
    * NOTE: Lambda Express automatically decodes the values in `req.params` (using
    * `decodeURIComponent`).
    */
   public readonly params: StringMap;

   /**
    * Contains the path part of the request URL.
    *
    * ```
    * // example.com/users?sort=desc
    * req.path // => "/users"
    * ```
    *
    * When called from a middleware, the mount point is not included in req.path. See
    * `req.originalUrl` for more details.
    */
   public readonly path: string;

   /**
    * Contains the request protocol string: either `http` or (for TLS requests) `https`
    * (always lowercase).
    *
    * When the `trust proxy` setting does not evaluate to false, this property will use
    * the value of the `X-Forwarded-Proto` header field if present. This header can be set
    * by the client or by the proxy.
    *
    * When the request comes from API Gateway, the protocol is `https` regardless of
    * whether the proxy is set (the `X-Forwarded-Proto` header is not consulted) because
    * API Gateway only supports HTTPS.
    */
   public readonly protocol: string | undefined;

   /**
    * This property is an object containing a property for each query string parameter in
    * the route. If there is no query string, it is an empty object `{}`.
    *
    * ```
    * // GET /search?q=tobi+ferret
    * req.query.q // => "tobi ferret"
    *
    * // GET /shoes?order=desc&shoe[color]=blue&shoe[type]=converse
    * req.query.order // => "desc"
    * req.query.shoe.color // => "blue"
    * req.query.shoe.type // => "converse"
    *
    * // GET /shoes?brand=abc&brand=def&color=blue
    * req.query.brand = [ 'abc', 'def' ]
    * req.query.color = 'blue'
    * ```
    */
   public readonly query: KeyValueStringObject;

   /**
    * A Boolean property that is `true` if a TLS connection is established. Equivalent to
    * `'https' == req.protocol`.
    */
   public readonly secure: boolean;

   /**
    * A Boolean property that is `true` if the request's `X-Requested-With` header field
    * is `XMLHttpRequest`, indicating that the request was issued by a client library such
    * as jQuery.
    */
   public readonly xhr: boolean;

   /**
    * Events passed to Lambda handlers by API Gateway and Application Load Balancers
    * contain a "request context", which is available in this property.
    */
   public readonly requestContext: RequestEventRequestContext;

   /**
    * Contains the `context` object passed to the Lambda function's handler. Rarely used
    * by middleware or route handlers.
    */
   public readonly context: HandlerContext;

   /**
    * Flag for determining which type of event source caused this request (Application
    * Load Balancer, `ALB`, or API Gateway, `APIGW`). See `Request.SOURCE_ALB` and
    * `Request.SOURCE_APIGW`.
    */
   public readonly eventSourceType: ('ALB' | 'APIGW');

   // TODO: maybe some of those properties should not be read-only ... for example, how
   // would some middleware do the equivalent of an internal redirect? How does Express
   // handle that?

   /**
    * The body of the request. If the body is an empty value (e.g. `''`), `req.body` will
    * be `null` to make body-exists checks (e.g. `if (req.body)`) simpler.
    *
    * Middleware can be plugged in to support body parsing, e.g. JSON and multi-part form
    * bodies.
    */
   public body?: any;

   private readonly _headers: StringArrayOfStringsMap;

   public constructor(app: Application, event: RequestEvent, context: HandlerContext) {
      this.app = app;
      this._headers = this._parseHeaders(event);
      this.method = (event.httpMethod || '').toUpperCase();
      this.body = this._parseBody(event.body);

      this.eventSourceType = ('elb' in event.requestContext) ? Request.SOURCE_ALB : Request.SOURCE_APIGW;

      // TODO: should something be done to limit what's exposed by these contexts? For
      // example, make properties read-only and don't expose the callback function, etc.
      this.context = context;
      this.requestContext = event.requestContext;

      // Fields that depend on headers:
      this.cookies = this._parseCookies();
      this.hostname = this._parseHostname();
      this.ip = this._parseIP();
      this.protocol = this._parseProtocol();
      this.query = this._parseQuery(event.multiValueQueryStringParameters || {}, event.queryStringParameters || {});
      this.secure = (this.protocol === 'https');
      this.xhr = (this.get('x-requested-with') === 'XMLHttpRequest');

      // Fields related to routing:
      this.path = 'foo';
      this.baseUrl = 'foo';
      this.originalUrl = 'foo';
      this.params = {};
   }

   /** CONVENIENCE FUNCTIONS */

   public isALB(): boolean {
      return this.eventSourceType === Request.SOURCE_ALB;
   }

   public isAPIGW(): boolean {
      return this.eventSourceType === Request.SOURCE_APIGW;
   }

   /** INTERFACE FUNCTIONS */

   /**
    * Returns the specified HTTP request header field (case-insensitive match). The
    * Referrer and Referer fields are interchangeable.
    *
    * If the request included multiple headers with the same name, this method will return
    * to you the _last_ one sent in the request. This is what API Gateway does when
    * accessing its `evt.headers` field. If you need _all_ of the values sent for a header
    * with the same name, use `req.getMultiValueHeader(name)`.
    *
    * @param headerName the name of the header to get
    */
   public get(headerName: string): string | undefined {
      return _.last(this._headers[this._getHeaderKey(headerName)]);
   }

   /**
    * Alias for `req.get(headerName)`.
    *
    * @param headerName the name of the header to get
    */
   public header(headerName: string): string | undefined {
      return this.get(this._getHeaderKey(headerName));
   }

   /**
    * Uses the same logic as `req.get(name)`, but returns to you an array containing _all_
    * of the values sent for the header with `headerName`. If you only need one value, use
    * `req.get(name)` instead.
    *
    * @param headerName the name of the header to get
    */
   public headerAll(headerName: string): string[] | undefined {
      return this._headers[this._getHeaderKey(headerName)];
   }

   /** EVENT PARSING FUNCTIONS */

   private _parseBody(body: string | null): any {
      if (!body || _.isEmpty(body)) {
         return null;
      }

      // TODO: add support for other content types
      if (this._getContentTypeEssence() === 'application/json') {
         try {
            // TODO: by default we are suppressing body-parsing errors, but we should
            // allow the user to get them somehow ... logging, error handling or something
            return JSON.parse(body);
         } catch(err) {
            return null;
         }
      }

      return body;
   }

   private _getContentTypeEssence(): string | undefined {
      const type = this.get('content-type');

      return _.isString(type) ? type.replace(/;.*/, '').trim().toLowerCase() : undefined;
   }

   private _parseHeaders(evt: RequestEvent): StringArrayOfStringsMap {
      const headers = evt.multiValueHeaders || _.mapObject(evt.headers, (v) => { return [ v ]; });

      return _.reduce(headers, (memo: StringArrayOfStringsMap, v, k) => {
         const key = k.toLowerCase();

         memo[key] = v;

         if (key === 'referer') {
            memo.referrer = v;
         } else if (key === 'referrer') {
            memo.referer = v;
         }

         return memo;
      }, {});
   }

   private _parseCookies(): StringMap {
      const cookieHeader = this.get('cookie') || '';

      if (_.isEmpty(cookieHeader)) {
         return {};
      }

      return cookie.parse(cookieHeader);
   }

   private _parseHostname(): string | undefined {
      const host = (this.get('host') || '').replace(/:[0-9]*$/, '');

      return _.isEmpty(host) ? undefined : host;
   }

   private _parseIP(): string | undefined {
      if ('identity' in this.requestContext && !_.isEmpty(this.requestContext.identity.sourceIp)) {
         return this.requestContext.identity.sourceIp;
      }

      if (!this.app.isEnabled('trust proxy')) {
         return;
      }

      let ip = (this.get('x-forwarded-for') || '').replace(/,.*/, '');

      return _.isEmpty(ip) ? undefined : ip;
   }

   private _parseProtocol(): string | undefined {
      if (this.isAPIGW()) {
         return 'https';
      }

      if (this.app.isEnabled('trust proxy')) {
         const header = this.get('x-forwarded-proto') || '';

         return _.isEmpty(header) ? undefined : header.toLowerCase();
      }
   }

   private _parseQuery(multiValQuery: StringArrayOfStringsMap, query: StringMap): KeyValueStringObject {
      let queryString;

      if (_.isEmpty(multiValQuery)) {
         queryString = _.reduce(query, (memo, v, k) => {
            return memo + `&${k}=${v}`;
         }, '');
      } else {
         queryString = _.reduce(multiValQuery, (memo, vals, k) => {
            _.each(vals, (v) => {
               memo += `&${k}=${v}`;
            });
            return memo;
         }, '');
      }

      return qs.parse(queryString);
   }

   private _getHeaderKey(headerName: string): string {
      let key = headerName.toLowerCase();

      return (key === 'referrer') ? 'referer' : key;
   }
}
