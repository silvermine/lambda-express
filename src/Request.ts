import { ILogger } from './logging/logging-types';
import _ from 'underscore';
import qs from 'qs';
import cookie from 'cookie';
import Application from './Application';
import { RequestEvent, HandlerContext, RequestEventRequestContext, LambdaEventSourceType } from './request-response-types';
import { StringMap, KeyValueStringObject, StringArrayOfStringsMap, StringUnknownMap, isUndefined } from '@silvermine/toolbox';
import ConsoleLogger from './logging/ConsoleLogger';

function safeDecode(s: string): string {
   try {
      // decodeURIComponent does not handle +'s as you might expect
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent#Decoding_query_parameters_from_a_URL
      return decodeURIComponent(s.replace(/\+/g, ' '));
   } catch(err) {
      return '';
   }
}

export default class Request {

   public static readonly SOURCE_ALB: LambdaEventSourceType = 'ALB';
   public static readonly SOURCE_APIGW: LambdaEventSourceType = 'APIGW';

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
    * var greet = new express.Router();
    *
    * app.addSubRouter('/greet', greet); // load the router on '/greet'
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
    * app.addSubRouter(['/gre+t', '/hel{2}o'], greet);
    * ```
    * When a request is made to `/greet/jp`, `req.baseUrl` is `/greet`. When a request is
    * made to `/hello/jp`, `req.baseUrl` is `/hello`.
    */
   public readonly baseUrl: string;

   /**
    * Contains cookies sent by the request (key/value pairs). If the request contains no
    * cookies, it defaults to `{}`.
    *
    * Cookie values are generally strings, but can also be JSON objects. See
    * `Response.cookie` for more details.
    */
   public readonly cookies: StringUnknownMap;

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
    * This property is much like `req.url`; however, it always retains the original URL
    * from the event that triggered the request, allowing you to rewrite `req.url` freely
    * for internal routing purposes. For example, the "mounting" feature of `app.use()`
    * will rewrite `req.url` to strip the mount point:
    *
    * ```
    * // GET 'http://www.example.com/admin/new'
    *
    * let router = new Router();
    *
    * router.get('/new', function(req, res, next) {
    *    console.log(req.originalUrl); // '/admin/new'
    *    console.log(req.baseUrl); // '/admin'
    *    console.log(req.path); // '/new'
    *    console.log(req.url); // '/new'
    *    next();
    * });
    *
    * app.addSubRouter('/admin', router);
    * ```
    *
    * `req.originalUrl` stays the same even when a route handler changes `req.url` for
    * internal re-routing. See `req.url` for an example of internal re-routing.
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
   public readonly params: Readonly<StringMap>;

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
   public readonly eventSourceType: LambdaEventSourceType;

   /**
    * The body of the request. If the body is an empty value (e.g. `''`), `req.body` will
    * be `null` to make body-exists checks (e.g. `if (req.body)`) simpler.
    *
    * Middleware can be plugged in to support body parsing, e.g. JSON and multi-part form
    * bodies.
    */
   public body?: unknown;

   public readonly log: ILogger;

   protected _parentRequest?: Request;
   protected _url: string;
   protected _path: string;

   private readonly _headers: StringArrayOfStringsMap;
   private readonly _event: RequestEvent;

   public constructor(app: Application, eventOrRequest: RequestEvent | Request, context: HandlerContext,
      baseURL: string = '', params: StringMap = {}) {
      let event: RequestEvent,
          url: string,
          originalURL: string,
          query: KeyValueStringObject;

      if (eventOrRequest instanceof Request) {
         // Make this request a sub-request of the request passed into the constructor
         this._parentRequest = eventOrRequest;
         url = this._parentRequest.url.substring(baseURL.length);
         baseURL = this._parentRequest.baseUrl + baseURL;
         event = this._parentRequest._event;
         originalURL = this._parentRequest.originalUrl;
         query = this._parentRequest.query;
      } else {
         event = eventOrRequest;

         const parsedQuery = this._parseQuery(event.multiValueQueryStringParameters || {}, event.queryStringParameters || {});

         // Despite the fact that the Express docs say that the `originalUrl` is `baseUrl
         // + path`, it's actually always equal to the original URL that initiated the
         // request. If, for example, a route handler changes the `url` of a request, the
         // `path` is changed too, *but* `originalUrl` stays the same. This would not be
         // the case if `originalUrl = `baseUrl + path`. See the documentation on the
         // `url` getter for more details.
         url = `${event.path}?${parsedQuery.raw}`;
         originalURL = url;
         query = parsedQuery.parsed;
      }

      this.app = app;
      this._event = event;
      this._headers = this._parseHeaders(event);
      this.method = (event.httpMethod || '').toUpperCase();
      this.body = this._parseBody(event.body);

      this.eventSourceType = ('elb' in event.requestContext) ? Request.SOURCE_ALB : Request.SOURCE_APIGW;

      this.context = context;
      this.requestContext = event.requestContext;

      // Fields that depend on headers:
      this.cookies = this._parseCookies();
      this.hostname = this._parseHostname();
      this.ip = this._parseIP();
      this.protocol = this._parseProtocol();
      this.query = query;
      this.secure = (this.protocol === 'https');
      this.xhr = (this.get('x-requested-with') === 'XMLHttpRequest');

      // Fields related to routing:
      this.baseUrl = baseURL;
      this._url = url;
      this._path = url.split('?')[0];
      this.originalUrl = originalURL;
      this.params = Object.freeze(params);

      if (this._parentRequest) {
         this.log = this._parentRequest.log;
      } else {
         this.log = new ConsoleLogger({
            level: app.routerOptions.logging.level,
            interface: this.eventSourceType,
            fnStartTime: Date.now(),
            getTimeUntilFnTimeout: () => { return context.getRemainingTimeInMillis(); },
         });
      }
   }

   /** PUBLIC PROPERTIES: GETTERS AND SETTERS */

   /**
    * `req.url` is the same as `req.path` in most cases, except that `req.url` includes
    * query string on it.
    *
    * However, route handlers and other middleware may change the value of `req.url` to
    * redirect the request to other registered middleware. For example:
    *
    * ```
    * // GET example.com/admin/users/1337?a=b&c=d
    *
    * const router1 = new express.Router(),
    *       router2 = new express.Router();
    *
    * router1.get('/users/:userID', function(req, res, next) {
    *    // ...
    *    if (req.params.userID === authenticatedUser.id) {
    *       // User ID is the same as the authenticated user's. Re-route to user profile
    *       // handler:
    *       req.url = '/profile?me=true';
    *       return next();
    *    }
    *    // ...
    * });
    *
    * router2.get('/profile', function(req, res) {
    *    console.log(req.originalUrl); // '/admin/users/1337?a=b&c=d'
    *    console.log(req.baseUrl); // '/admin'
    *    console.log(req.path); // '/profile'
    *    console.log(req.url); // '/profile?me=true'
    *    console.log(req.query); // { a: 'b', c: 'd' }
    *    // ...
    * });
    *
    * app.addSubRouter('/admin', router1);
    * app.addSubRouter('/admin', router2);
    * ```
    *
    * In the example above, the `GET` request to `/admin/users/1337?a=b&c=d` is re-routed
    * to the `/profile` handler in `router2`. Any other route handlers on `router1` that
    * would have handled the `/users/1337` route are skipped. Also, notice that `req.url`
    * keeps the value given to it by `router1`'s route handler, but `req.originalUrl`
    * stays the same.
    *
    * If the route handler or middleware that changes `req.url` adds a query string to
    * `req.url`, the query string is retained on the `req.url` property but the query
    * string keys and values are *not* parsed and `req.params` is *not* updated. This
    * follows Express' apparent behavior when handling internal re-routing with URLs that
    * contain query strings.
    */
   public get url(): string {
      return this._url;
   }

   public set url(url: string) {
      url = url || '';

      // Update the parent request's URL with the new URL value
      if (this._parentRequest) {
         let indexOfCurrentURL = this._parentRequest.url.length - this._url.length;

         this._parentRequest.url = this._parentRequest.url.substring(0, indexOfCurrentURL) + url;
      }
      this._url = url;
      // Remove query parameters from the URL to form the new path
      this._path = url.split('?')[0];
   }

   /**
   * Contains the path part of the request URL.
   *
   * ```
   * // example.com/users?sort=desc
   * req.path // => "/users"
   * ```
   *
   * When referenced from middleware, the mount point is not included in `req.path`. See
   * `req.originalUrl` for more details.
   *
   * When any middleware changes the value of `req.url` for internal re-routing,
   * `req.path` is updated also. See `req.url` for an example of internal re-routing.
   */
   public get path(): string {
      return this._path;
   }

   // Disable changing the `path` via the public API by not implementing a setter here.

   /** CLONING FUNCTION */

   public makeSubRequest(baseURL: string, params?: StringMap): Request {
      return new Request(this.app, this, this.context, baseURL, params);
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

   private _parseBody(body: string | null): unknown {
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
         if (isUndefined(v)) {
            return memo;
         }

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

   private _parseCookies(): StringUnknownMap {
      const cookieHeader = this.get('cookie') || '';

      if (_.isEmpty(cookieHeader)) {
         return {};
      }

      const cookies = cookie.parse(cookieHeader);

      // If any cookies were "JSON cookies", parse them. See `Response.cookie`.
      _.each(cookies, (v, k): void => {
         if (_.isString(v) && v.substring(0, 2) === 'j:') {
            try {
               cookies[k] = JSON.parse(v.substring(2));
            } catch(e) {
               // no-op - value of the cookie remains the raw string
            }
         }
      });

      return cookies;
   }

   private _parseHostname(): string | undefined {
      let host = (this.get('host') || '');

      if (this.app.isEnabled('trust proxy')) {
         host = this.get('x-forwarded-host') || host;
      }

      host = host.replace(/:[0-9]*$/, '');

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

   private _parseQuery(multiValQuery: Partial<StringArrayOfStringsMap>, query: Partial<StringMap>): { raw: string; parsed: KeyValueStringObject } {
      let queryString;

      // It may seem strange to encode the URI components immediately after decoding them.
      // But, this allows us to take values that are encoded and those that are not, then
      // decode them to make sure we know they're not encoded, and then encode them so
      // that we make an accurate raw query string to set on the URL parts of the request.
      // If we simply encoded them, and we received a value that was still encoded
      // already, then we would encode the `%` signs, etc, and end up with double-encoded
      // values that were not correct.
      if (_.isEmpty(multiValQuery)) {
         queryString = _.reduce(query, (memo, v, k) => {
            if (isUndefined(v)) {
               return memo;
            }

            return memo + `&${k}=${encodeURIComponent(safeDecode(v))}`;
         }, '');
      } else {
         queryString = _.reduce(multiValQuery, (memo, vals, k) => {
            _.each(vals || [], (v) => {
               memo += `&${k}=${encodeURIComponent(safeDecode(v))}`;
            });
            return memo;
         }, '');
      }

      return { raw: queryString, parsed: qs.parse(queryString) };
   }

   private _getHeaderKey(headerName: string): string {
      let key = headerName.toLowerCase();

      return (key === 'referrer') ? 'referer' : key;
   }
}
