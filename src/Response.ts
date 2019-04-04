import _ from 'underscore';
import cookie from 'cookie';
import { Application, Request } from '.';
import { StringMap, isStringMap, StringArrayOfStringsMap } from '@silvermine/toolbox';
import { CookieOpts, ResponseResult } from './request-response-types';
import { StatusCodes } from './status-codes';
import { Callback } from 'aws-lambda';
import mimeLookup from './mime/mimeLookup';

export default class Response {

   public readonly app: Application;
   public headersSent: boolean = false;

   // properties used internally in the class
   private readonly _request: Request;
   private _body: string = '';
   private _statusCode: number = 200;
   private _statusMessage: string = 'OK';
   private _headers: StringArrayOfStringsMap = {};
   private _beforeWriteHeadersListeners: Array<() => unknown> = [];
   private _afterWriteListeners: Array<() => unknown> = [];
   private _lambdaCallback: Callback;

   public constructor(app: Application, req: Request, cb: Callback) {
      this.app = app;
      this._request = req;
      this._lambdaCallback = cb;
   }

   // METHODS RELATED TO SETTING RESPONSE HEADERS AND CODES THAT DO NOT SEND RESPONSES

   /**
    * Sets the response's HTTP header field to value. To set multiple fields at once, pass
    * an object as the parameter.
    *
    * ```
    * res.set('Content-Type', 'text/plain');
    * // OR:
    * res.set({
    *    'Content-Type': 'text/plain',
    *    'Content-Length': '123',
    *    'ETag': '12345',
    * });
    * ```
    */
   public set(headers: StringMap): Response;
   public set(key: string, value: string): Response;
   public set(arg0: (StringMap | string), arg1?: string): Response {
      if (this.headersSent) {
         throw new Error('Can\'t set headers after they are sent.');
      }
      if (_.isString(arg0) && _.isString(arg1)) {
         this._headers[arg0] = [ arg1 ];
      } else if (isStringMap(arg0)) {
         _.each(arg0, (v, k) => { this.set(k, v); });
      }
      return this;
   }

   /**
    * Deletes a response header that may have been previously set.
    */
   public delete(headerName: string): Response {
      delete this._headers[headerName];
      return this;
   }

   /**
    * Appends one or more response header values to the response. For example:
    *
    * ```
    * res.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
    * res.append('Warning', '199 Miscellaneous warning');
    * ```
    *
    * Would result in this in your response:
    *
    * ```
    * Link: <http://localhost/>
    * Link: <http://localhost:3000/>
    * Warning: 199 Miscellaneous warning
    * ```
    *
    * @param key the name of the response header to add values to
    * @param values the value (single string) or values (array of strings) to add for the
    *               specified response header
    */
   public append(key: string, values: (string | string[])): Response {
      if (this.headersSent) {
         throw new Error('Can\'t set headers after they are sent.');
      }

      if (!(key in this._headers)) {
         this._headers[key] = [];
      }

      if (_.isArray(values)) {
         _.each(values, (v) => { this._headers[key].push(v); });
      } else {
         this._headers[key].push(values); // single string
      }

      return this;
   }

   /**
    * Get the response headers in their current state. Modifications to the object
    * returned by this method will not be reflected in the response headers - you must use
    * the response methods (e.g. `res.set(k, v)`) to manipulate response headers.
    */
   public getHeaders(): StringArrayOfStringsMap {
      // TODO: We should make it so that the caller can not directly manipulate this
      // object.
      return this._headers;
   }

   /**
    * Returns true if response has a header by the name `name`.
    */
   public hasHeader(name: string): boolean {
      return !!(name in this._headers);
   }

   /**
    * Sets the [HTTP status
    * code](https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html).
    *
    * @param code the status code to send with the response
    */
   public status(code: number): Response {
      this._statusCode = code;
      this._statusMessage = StatusCodes[code] || String(code);
      return this;
   }

   /**
    * Get the current response status code and message (e.g. "200 OK"). Modifications to
    * the object returned by this method will not be reflected in the response itself -
    * you must use the response methods (e.g. `res.status(n)`) to manipulate response
    * status.
    */
   public getStatus(): { code: number; message: string } {
      return { code: this._statusCode, message: this._statusMessage };
   }

   /**
    * Sets the `Content-Type` HTTP header to the MIME type as determined by
    * [mime.lookup()](https://www.npmjs.com/package/mime) for the specified type. If type
    * contains the `/` character, then it sets the `Content-Type` to the argument (without
    * a lookup). For example:
    *
    * ```
    * res.type('.html');              // Sets header to 'text/html'
    * res.type('html');               // Sets header to 'text/html'
    * res.type('json');               // Sets header to 'application/json'
    * res.type('application/json');   // Sets header to 'application/json'
    * res.type('png');                // Sets header to 'image/png'
    * ```
    *
    * @param type the content type of the response
    */
   public type(type: string): Response {
      if (type.indexOf('/') === -1) {
         this.set('Content-Type', mimeLookup(type) || type);
      } else {
         this.set('Content-Type', type);
      }
      return this;
   }

   /**
    * Joins the links provided as properties of the parameter to populate the response's
    * `Link` HTTP header field.
    *
    * For example, the following call:
    *
    * ```
    * res.links({
    *    next: 'http://api.example.com/users?page=2',
    *    last: 'http://api.example.com/users?page=5',
    * });
    * ```
    *
    * Would result in this header:
    * ```
    * Link: <http://api.example.com/users?page=2>; rel="next", <http://api.example.com/users?page=5>; rel="last"
    * ```
    *
    * Note that any subsequent call to `resp.links(...)` will *overwrite* the values that
    * were already in the header.
    *
    * @param links The links to send in the `Link` response header
    */
   public links(links: StringMap): Response {
      return this.set('Link', _.reduce(links, (memo, v, k) => {
         const prefix = (memo === '' ? '' : ', ');

         return memo + `${prefix}<${v}>; rel="${k}"`;
      }, ''));
   }

   /**
    * Sets the response `Location` HTTP header to the specified `path` parameter.
    *
    * A path value of `back` has a special meaning; it refers to the URL specified in the
    * `Referer` header of the request. If the `Referer` header was not specified, the
    * location will be set to `/`.
    *
    * The URL set in the `Location` header will automatically be URL-encoded for you. For
    * example:
    *
    * ```
    * res.location('https://example.com/a b/')
    * // => Location: 'https://example.com/a%20b/'
    * ```
    *
    * @param path path to redirect to (or `back` - see above)
    */
   public location(path: string): Response {
      let value = path;

      if (path === 'back') {
         value = this._request.get('referer') || '/';
      }

      this.set('Location', value);
      return this;
   }

   /**
    * Sets cookie `name` to `value`, optionally with the specified cookie options. See
    * `CookieOpts`.
    *
    * Generally cookie values are strings, but you can also supply a JS object, which will
    * be stringified with `JSON.stringify(userVal)` and prefixed with `j:`. This matches
    * what Express does with response cookies and what their cookie parser middleware does
    * with incoming (request) cookie headers.
    *
    * @see https://github.com/expressjs/cookie-parser/blob/1dc306b0ebe86ab98521811cc090740b4bef48e7/index.js#L84-L86
    * @see https://github.com/expressjs/express/blob/dc538f6e810bd462c98ee7e6aae24c64d4b1da93/lib/response.js#L836-L838
    *
    * TODO: how does a user see the documentation for `CookieOpts`?
    *
    * @param name the name of the cookie
    * @param userVal the value of the cookie
    * @param userOpts the options (such as domain, path, etc)
    */
   public cookie(name: string, userVal: unknown, userOpts?: CookieOpts): Response {
      const opts = _.extend({ path: '/' }, userOpts) as CookieOpts,
            value = (_.isObject(userVal) ? `j:${JSON.stringify(userVal)}` : String(userVal));

      if (opts.maxAge !== undefined) {
         opts.expires = new Date(Date.now() + opts.maxAge);
         opts.maxAge = (opts.maxAge / 1000); // cookie lib takes seconds, not millis
      }

      return this.append('Set-Cookie', cookie.serialize(name, value, opts));
   }

   /**
    * Clears the cookie specified by `name`. For details about the `options` object, see
    * `res.cookie()`.
    *
    * @param name the name of the cookie
    * @param userOpts the options (such as domain, path, etc)
    */
   public clearCookie(name: string, userOpts?: CookieOpts): Response {
      return this.cookie(name, '', _.extend({ expires: new Date(1), path: '/' }, userOpts));
   }

   /**
    * Sets the appropriate caching headers (`Expires`, `Cache-Control`, and `Pragma`) to
    * cache content for a specific number of seconds. If zero or any negative number of
    * seconds is passed in, the headers are set to disallow caching.
    */
   public cacheForSeconds(seconds: number): Response {
      const now = new Date(),
            expiry = new Date(now.getTime() + (seconds * 1000));

      if (seconds > 0) {
         this.delete('Pragma');
         this.set({
            'Expires': expiry.toUTCString(),
            'Cache-Control': `must-revalidate, max-age=${seconds}`,
         });
      } else {
         this.set({
            'Expires': 'Thu, 19 Nov 1981 08:52:00 GMT',
            'Cache-Control': 'no-cache, max-age=0, must-revalidate',
            'Pragma': 'no-cache',
         });
      }
      return this;
   }

   /**
    * Convenience wrapper for `resp.cacheForSeconds`. Same semantics, but allows for
    * easier-to-read code by allowing the developer to express the number of minutes
    * without having to do multiplication (or division when you read the code.)
    */
   public cacheForMinutes(minutes: number): Response {
      return this.cacheForSeconds(minutes * 60);
   }

   /**
    * Convenience wrapper for `resp.cacheForSeconds`. Same semantics, but allows for
    * easier-to-read code by allowing the developer to express the number of hours without
    * having to do multiplication (or division when you read the code.)
    */
   public cacheForHours(hours: number): Response {
      return this.cacheForMinutes(hours * 60);
   }

   // METHODS RELATED TO SENDING RESPONSES

   /**
    * Add a listener that will get called just before headers are written to the response.
    * For example:
    *
    * ```
    * api.use(function(req: Request, resp: Response, next: NextCallback) {
    *    const started = new Date();
    *
    *    resp.set('X-Page-Built', new Date().toUTCString());
    *    resp.set('X-RequestID', req.context.awsRequestId);
    *
    *    database.disconnect();
    *
    *    resp.onBeforeWriteHeaders(() => {
    *       const elapsed = (new Date().getTime() - started.getTime());
    *       resp.set('X-Elapsed-Millis', elapsed.toString());
    *    });
    *
    *    resp.onAfterWrite(() => {
    *       database.disconnect();
    *    });
    *    next();
    * });
    * ```
    *
    * @param cb function to be called before headers are written
    */
   public onBeforeWriteHeaders(cb: () => unknown): Response {
      this._beforeWriteHeadersListeners.push(cb);
      return this;
   }

   /**
    * Add a listener that will get called after the response is written, as part of a
    * cleanup phase of request handling. See the example in `res.onBeforeWriteHeaders()`.
    *
    * @param cb function to be called during cleanup
    */
   public onAfterWrite(cb: () => unknown): Response {
      this._afterWriteListeners.push(cb);
      return this;
   }

   // HELPER METHODS

   public isALB(): boolean {
      return this._request.isALB();
   }

   public isAPIGW(): boolean {
      return this._request.isAPIGW();
   }

   // METHODS THAT SEND RESPONSES

   /**
    * Ends the response process by calling the Lambda callback with the response headers
    * and body, if they have been supplied.
    *
    * Use to quickly end the response without any data. If you need to respond with data,
    * instead use methods such as `res.send()` and `res.json()`.
    */
   public end(): Response {
      _.each(this._beforeWriteHeadersListeners, (l) => { l(); });

      const output: ResponseResult = {
         isBase64Encoded: false,
         statusCode: this._statusCode,
         multiValueHeaders: { ...this._headers },
         body: this._body,
      };

      if (this.isALB()) {
         // There are some differences in the response format between APIGW and ALB. See
         // https://serverless-training.com/articles/api-gateway-vs-application-load-balancer-technical-details/#application-load-balancer-response-event-format-differences

         // 1) If you're running your Lambda behind Application Load Balancer, the ELB/ALB
         //    requires the statusDescription. However, API Gateway will throw an error
         //    (respond with "Internal server error") if you include a statusDescription
         //    field in your response for APIGW. ¯\_(ツ)_/¯.
         output.statusDescription = (this._statusCode + ' ' + this._statusMessage);

         // 2) With ELB you *must* supply either `headers` or `multiValueHeaders`,
         //    depending on the type of request that invoked the function. If the request
         //    had a `multiValueHeaders` field in it, it means that the
         //    `lambda.multi_value_headers.enabled` attribute is `true` on the ELB, and
         //    you *must* supply `multiValueHeaders`. If there was no `multiValueHeaders`
         //    in the request, then the value for the `lambda.multi_value_headers.enabled`
         //    attribute was `false`, and you *must* supply `headers`. The ELB does not
         //    complain if you supply *both* fields, so we just default to doing that
         //    because it's the safest thing to do. Note that even if you have no headers
         //    to send, you must at least supply an empty object (`{}`) for ELB, whereas
         //    with APIGW it's okay to send `null`.
         output.headers = _.reduce(output.multiValueHeaders, (memo, v, k) => {
            memo[k] = v[v.length - 1];
            return memo;
         }, {} as StringMap);

         // Finally, note that ELB requires that all header values be strings already,
         // whereas APIGW will allow booleans / integers as values, which it would then
         // convert. As long as you're using this library from a TypeScript project, the
         // method signatures to add headers to the response will enforce this string-only
         // rule. However, if someone is using the library in JS and ignoring the types,
         // they could potentially `resp.set('Foo', 1234)`, which could cause them a
         // problem if they're using this behind ALB; that's on them I suppose. ¯\_(ツ)_/¯
      }

      this._lambdaCallback(undefined, output);
      this.headersSent = true;

      _.each(this._afterWriteListeners, (l) => { l(); });
      return this;
   }

   /**
    * Sends a JSON response. This method sends a response (with the correct content-type)
    * that is the parameter converted to a JSON string using
    * [JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).
    *
    * The parameter can be any JSON type, including `object`, `array`, `string`,
    * `Boolean`, `number`, or `null`.
    *
    * Calling this method ends (sends) the response, after which headers can not be
    * changed and more data can not be sent.
    *
    * @param o the object to send in the response
    */
   public json(o: unknown): Response {
      this._body = JSON.stringify(o);
      return this.type('application/json; charset=utf-8').end();
   }

   /**
    * Sends a JSON response with JSONP support. This method is identical to `res.json()`,
    * except that it opts-in to JSONP callback support.
    *
    * The JSONP function name that will be invoked should be sent in the query string of
    * the request. The query string parameter, by default, is simply `callback` (e.g.
    * `/some-url?callback=myFunction`). To override the name of the query string
    * parameter, set the application setting named `jsonp callback name`. For example,
    * `app.setSetting('jsonp callback name', 'cb')` would support URLs like
    * `/some-url?cb=myFunction`.
    *
    * Calling this method ends (sends) the response, after which headers can not be
    * changed and more data can not be sent.
    *
    * @param o the object to send in the response
    */
   public jsonp(o: unknown): Response {
      const queryParamName = this.app.getSetting('jsonp callback name') || 'callback';

      let callbackFunctionName = this._request.query[queryParamName as string];

      if (_.isArray(callbackFunctionName)) {
         callbackFunctionName = callbackFunctionName[0];
      }

      if (_.isString(callbackFunctionName) && this._isValidJSONPCallback(callbackFunctionName)) {
         const stringified = JSON.stringify(o)
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');

         // NOTE: The `/**/` is a security mitigation for "Rosetta Flash JSONP abuse", see
         // silvermine/lambda-express#38. The `typeof` is to prevent errors on the client
         // if the callback function doesn't exist, see expressjs/express#1773.
         this._body = `/**/ typeof ${callbackFunctionName} === 'function' && ${callbackFunctionName}(${stringified});`;

         return this.type('text/javascript; charset=utf-8')
            // `nosniff` is set to mitigate "Rosetta Flash JSONP abuse", see
            // silvermine/lambda-express#38
            .set('X-Content-Type-Options', 'nosniff')
            .end();
      }

      return this.json(o);
   }

   /**
    * Redirects to the URL derived from the specified path, with specified status, a
    * positive integer that corresponds to an [HTTP status
    * code](https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html).
    *
    * If `code` not specified, status defaults to `302 "Found"`. Other most common option
    * is `301`, which is the code for "Moved Permanently".
    *
    * The `path` is passed to `res.location()`, so the same notes about the functionality
    * of the path (e.g. special value `back`) apply to this function.
    *
    * Calling this method ends (sends) the response, after which headers can not be
    * changed and more data can not be sent.
    *
    * @param code Optionally, the status code to send (number between 300 and 308
    *             inclusive). Defaults to 302 ("Found", for non-permanent redirects).
    * @param path The path to redirect to (including `back` - see `res.location()`)
    * @see https://www.ietf.org/assignments/http-status-codes/http-status-codes.xml
    */
   public redirect(code: number, path: string): Response;
   public redirect(path: string): Response;
   public redirect(...args: any[]): Response {
      let code = 302,
          path: string;

      if (_.isNumber(args[0])) {
         code = args[0];
         path = args[1];
      } else {
         path = args[0];
      }

      // NOTE: We must set the status and location before creating the response body. The
      // status and location functions contain logic needed to properly create the body.
      // (e.g. status message creation and 'back' handling)
      this.status(code).location(path);

      const target = _.first(this.getHeaders().Location);

      // TODO: Once Request supports parsing the accept headers, add support for returning
      // an HTML response (assuming the request accepts HTML back). See:
      // https://github.com/expressjs/express/blob/3d10279826f59bf68e28995ce423f7bc4d2f11cf/lib/response.js#L930-L933
      const body = this.getStatus().message + '. Redirecting to ' + target;

      if (this._request.method !== 'HEAD') {
         this._body = body;
      }

      return this.end();
   }

   /**
    * Sends the HTTP response.
    *
    * The body parameter can be a `Buffer` object, a `string`, an `object`, or an `array`.
    *
    * Unlike Express, this method will not set the `Content-Length` header because API
    * Gateway and Application Load Balancer already handle that when they get the response
    * from the Lambda function (because the function must return the entire response and
    * can not stream a response back, there's no situation where APIGW/ALB can't compute
    * the length before they send the headers).
    *
    * TODO: evaluate whether we should do the other "useful tasks" that Express does, e.g.
    * [it] "provides automatic HEAD and HTTP cache freshness support". See
    * https://expressjs.com/en/api.html#res.send
    *
    * When the parameter is a `Buffer` object, the method sets the Content-Type response
    * header field to `application/octet-stream`, unless previously set.
    *
    * When the parameter is a `string`, the method sets the Content-Type to `text/html`
    * (unless the type has already been set).
    *
    * When the parameter is an `array` or `object`, Express responds with the JSON
    * representation. (See `res.json`)
    *
    * Calling this method ends (sends) the response, after which headers can not be
    * changed and more data can not be sent.
    *
    * @param body the response body to send
    */
   public send(body: (Buffer | string | object | [])): Response {
      let type: string | null = null;

      if (Buffer.isBuffer(body)) {
         type = 'application/octet-stream';
         // isBase64Encoded will need to be true
         // this._body = body; // toString??
         throw new Error('TODO: Buffer sending is not yet supported');
      } else if (_.isString(body)) {
         type = 'text/html';
         this._body = body;
      } else {
         return this.json(body);
      }

      if (type !== null && !this.hasHeader('Content-Type')) {
         this.type(type);
      }

      return this.end();
   }


   /**
    * Sets the response HTTP status code to statusCode and send its string representation
    * as the response body.
    *
    * ```
    * res.sendStatus(200); // equivalent to res.status(200).send('OK')
    * res.sendStatus(403); // equivalent to res.status(403).send('Forbidden')
    * res.sendStatus(404); // equivalent to res.status(404).send('Not Found')
    * res.sendStatus(500); // equivalent to res.status(500).send('Internal Server Error')
    * ```
    *
    * If an unsupported status code is specified, the HTTP status is still set to
    * `statusCode` and the string version of the code is sent as the response body. For
    * example:
    *
    * ```
    * res.sendStatus(9999); // equivalent to res.status(9999).send('9999')
    * ```
    *
    * Calling this method ends (sends) the response, after which headers can not be
    * changed and more data can not be sent.
    *
    * @param code the status code to send, with its standard string response
    */
   public sendStatus(code: number): Response {
      return this.status(code).end();
   }

   // TODO: look at adding methods:
   // download: https://expressjs.com/en/api.html#res.download
   // attachment: https://expressjs.com/en/api.html#res.attachment
   // format: https://expressjs.com/en/api.html#res.format
   // sendFile: https://expressjs.com/en/api.html#res.sendFile

   protected _isValidJSONPCallback(name?: string): boolean {
      // The "disable" is due to eslint erring because of the `\[`
      // eslint-disable-next-line no-useless-escape
      return !name || _.isEmpty(name) ? false : /^[\[\]\w$.]+$/.test(name);
   }

}
