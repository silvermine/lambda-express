import _ from 'underscore';
import { Application, Request } from '.';
import { StringMap, isStringMap, StringArrayOfStringsMap } from './utils/common-types';
import { CookieOpts } from './request-response-types';
import { Callback } from 'aws-lambda';

/**
 * Valid HTTP status codes for redirection.
 * @see https://www.ietf.org/assignments/http-status-codes/http-status-codes.xml
 */
type RedirectCode = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;


export default class Response {

   public readonly app: Application;
   public readonly headersSent: boolean;

   // properties used internally in the class
   private readonly _request: Request;
   private _body: string | null = null;
   private _statusCode: number = 200;
   private _statusMessage: string = 'OK';
   private _headers: StringArrayOfStringsMap = {};
   private _beforeWriteHeadersListeners: Array<() => unknown> = [];
   private _afterWriteListeners: Array<() => unknown> = [];
   private _lambdaCallback: Callback;

   public constructor(app: Application, req: Request, cb: Callback) {
      this.app = app;
      this.headersSent = false;
      this._request = req;
      this._lambdaCallback = cb;
   }

   // FUNCTIONS RELATED TO SETTING RESPONSE HEADERS AND CODES THAT DO NOT SEND RESPONSES

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
      if (_.isString(arg0) && _.isString(arg1)) {
         this._headers[arg0] = [ arg1 ];
      } else if (isStringMap(arg0)) {
         _.each(arg0, (v, k) => { this.set(k, v); });
      }
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
      console.log(key, values); // eslint-disable-line no-console
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
    * Sets the [HTTP status
    * code](https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html).
    *
    * @param code the status code to send with the response
    */
   public status(code: number): Response {
      console.log(code); // eslint-disable-line no-console
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
      this.set('Content-Type', type);
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
    * `Link: <http://api.example.com/users?page=2>; rel="next", <http://api.example.com/users?page=5>; rel="last"`
    *
    * @param links The links to send in the `Link` response header
    */
   public links(links: StringMap): Response {
      console.log(links); // eslint-disable-line no-console
      return this;
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
      this.set('Location', path);
      return this;
   }

   /**
    * Sets cookie `name` to `value`, optionally with the specified cookie options. See
    * `CookieOpts`.
    *
    * TODO: how does a user see the documentation for `CookieOpts`?
    *
    * @param name the name of the cookie
    * @param value the value of the cookie
    * @param opts the options (such as domain, path, etc)
    */
   public cookie(name: string, value: string, opts?: CookieOpts): Response {
      console.log(name, value, opts); // eslint-disable-line no-console
      return this;
   }

   /**
    * Clears the cookie specified by `name`. For details about the `options` object, see
    * `res.cookie()`.
    *
    * @param name the name of the cookie
    * @param opts the options (such as domain, path, etc)
    */
   public clearCookie(name: string, opts: CookieOpts): Response {
      console.log(name, opts); // eslint-disable-line no-console
      return this;
   }

   // FUNCTIONS RELATED TO SENDING RESPONSES

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

   // FUNCTIONS THAT SEND RESPONSES

   /**
    * Ends the response process by calling the Lambda callback with the response headers
    * and body, if they have been supplied.
    *
    * Use to quickly end the response without any data. If you need to respond with data,
    * instead use methods such as `res.send()` and `res.json()`.
    */
   public end(): Response {
      // We will need to use the request in our response - at least to determine if this
      // is an ALB or APIGW invocation so that we can respond correctly
      console.log(this._request, this._lambdaCallback, this._body); // eslint-disable-line no-console
      // Also, call listeners for before/after write.
      // Also, set headersSent
      // TODO: This is where we will actually create the response object that Lambda needs
      // for APIGW/ALB integration and invoke the callback with it.
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
   public json(o: any): Response {
      console.log(o); // eslint-disable-line no-console
      return this;
   }

   /**
    * Sends a JSON response with JSONP support. This method is identical to `res.json()`,
    * except that it opts-in to JSONP callback support.
    *
    * By default, the JSONP callback name is simply `callback`. Optionally, you can pass a
    * second argument to specify the query string parameter from which to get the callback
    * name.
    *
    * TODO: Figure out how we want to allow application-wide overrides of the callback
    * name. Express says this: Override this with the `jsonp callback name` setting.
    *
    * Calling this method ends (sends) the response, after which headers can not be
    * changed and more data can not be sent.
    *
    * @param o the object to send in the response
    * @param paramName the query string parameter to get the name of the callback function
    *                  from
    */
   public jsonp(o: any, paramName: string): Response {
      console.log(o, paramName); // eslint-disable-line no-console
      return this;
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
   public redirect(code: RedirectCode, path: string): Response;
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

      return this.status(code).location(path).end();
   }

   /**
    * Sends the HTTP response.
    *
    * The body parameter can be a `Buffer` object, a `string`, an `object`, or an `array`.
    *
    * This method automatically assigns the `Content-Length` HTTP response header field
    * (unless previously set).
    *
    * TODO: evaluate whether we should do the other "useful tasks" that Express does, e.g.
    * [it] "provides automatic HEAD and HTTP cache freshness support". See
    * https://expressjs.com/en/api.html#res.send
    *
    * When the parameter is a `Buffer` object, the method sets the Content-Type response
    * header field to `application/octet-stream`, unless previously set.
    *
    * When the parameter is a `string`, the method sets the Content-Type to `text/html`.
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
      console.log(typeof body); // eslint-disable-line no-console
      return this;
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
      console.log(code); // eslint-disable-line no-console
      return this;
   }

   // TODO: look at adding functions:
   // download: https://expressjs.com/en/api.html#res.download
   // attachment: https://expressjs.com/en/api.html#res.attachment
   // format: https://expressjs.com/en/api.html#res.format
   // sendFile: https://expressjs.com/en/api.html#res.sendFile

}
