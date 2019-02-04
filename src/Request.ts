import Application from './Application';
import { RequestEvent, HandlerContext, RequestEventRequestContext } from './request-response-types';
import { StringMap, KeyValueStringObject } from './utils/common-types';

export default class Request {

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
   public readonly hostname: string;

   /**
    * When an IP address is supplied by the Lambda integration (e.g. API Gateway supplies
    * `evt.requestContext.identity.sourceIp`), that value is used. Contains the remote IP
    * address of the request.
    *
    * Otherwise, when the `trust proxy` setting on the application is truthy, the value of
    * this property is derived from the left-most entry in the `X-Forwarded-For` header.
    * This header can be set by the client or by the proxy.
    */
   public readonly ip: string;

   /**
    * The HTTP method used in this request (e.g. `GET`, `POST`, etc).
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
    * Contains the request protocol string: either `http` or (for TLS requests) `https`.
    *
    * When the `trust proxy` setting does not evaluate to false, this property will use
    * the value of the `X-Forwarded-Proto` header field if present. This header can be set
    * by the client or by the proxy.
    */
   public readonly protocol: string;

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
    * Contains the currently-matched route as a string. For example:
    *
    * ```
    * app.get('/user/:id?', function userIdHandler(req, res) {
    *   console.log(req.route); // => '/user/:id?'
    *   res.send('GET');
    * });
    * ```
    */
   public readonly route: string;

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

   // TODO: maybe some of those properties should not be read-only ... for example, how
   // would some middleware do the equivalent of an internal redirect? How does Express
   // handle that?

   // properties that *may* be set in the constructor and middleware / request handlers
   // may modify
   public body?: any;

   public constructor(app: Application, event: RequestEvent, context: HandlerContext) {
      this.app = app;
      this.method = event.httpMethod;

      // Fields that depend on headers:
      this.cookies = {};
      this.hostname = 'Host';
      this.ip = 'foo';
      this.path = 'foo';
      this.protocol = 'foo';
      this.query = {};
      this.secure = false;
      this.xhr = false;

      // Fields related to routing:
      this.baseUrl = 'foo';
      this.originalUrl = 'foo';
      this.params = {};
      this.route = 'foo';

      // TODO: should something be done to limit what's exposed by these contexts? For
      // example, make properties read-only and don't expose the callback function, etc.
      this.context = context;
      this.requestContext = event.requestContext;
   }

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
   public get(headerName: string): string {
      return `TODO: return value for ${headerName}`;
   }

   /**
    * Alias for `req.get(headerName)`.
    *
    * @param headerName the name of the header to get
    */
   public header(headerName: string): string {
      return this.get(headerName);
   }

   /**
    * Uses the same logic as `req.get(name)`, but returns to you an array containing _all_
    * of the values sent for the header with `headerName`. If you only need one value, use
    * `req.get(name)` instead.
    *
    * @param headerName the name of the header to get
    */
   public headerAll(headerName: string): string[] {
      return [ `TODO: ${headerName}`, `TODO: ${headerName}` ];
   }

}
