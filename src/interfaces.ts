/* istanbul ignore next */

import Request from './Request';
import Response from './Response';
import { LogLevel } from './logging/logging-types';

/**
 * The function that is passed to request processors for them to signal that they are done
 * performing their processing of the request. If an error occurred during the processing
 * of the request, the processor should pass the error as the only argument to the
 * callback.
 *
 * Once the callback is called (with no error argument), control is handed over to the
 * next request processor in the chain. On the other hand, if an error argument was passed
 * to the callback, all other standard request processors will be skipped and control will
 * be handed over to the first error-handling request processor in the chain.
 */
export interface NextCallback {
   (err?: unknown): void;
}

/**
 * A function used to process each request (or each request for the route the processor is
 * added to). Request processors generally fall into one of two categories:
 *
 *    1. Middleware: where common functionality that needs to be used across multiple
 *       routes or has nothing to do with the business logic of a given route lives.
 *    2. Route handlers: where the business logic for a given route lives.
 */
export interface RequestProcessor {

   /**
    * For use by middleware and request handlers. Typically middleware will be declared as
    * taking all three arguments (including the `next` callback function), whereas request
    * handlers (for a given route) typically do not need the `next` callback function
    * because they will call a method on the response that completes the request.
    *
    * All functions passed to `use`, `get`, and other route-handling methods will be
    * passed a `next` callback and *MUST* call the callback or a response-sending function
    * (e.g. `send`, `body`, or `json`) on the response in order to complete the
    * processing. Failure to either send a response or call `next` will result in a hung
    * process.
    *
    * If this function returns a Promise object, a `catch` method will automatically be
    * attached to the promise. If the promise is rejected, that `catch` method will call
    * `next`, passing along the rejected value or an error if the value is empty. If the
    * returned promise is resolved, `next` will *not* be called automatically. It is up to
    * the handler to call `next` when appropriate.
    *
    * @param req The request to be handled
    * @param resp The response that will be sent when the request-handling process is
    *             complete
    * @param next Callback that should be called when the handler is done with its work
    *             processing the request (see notes above)
    */
   (req: Request, resp: Response, next: NextCallback): unknown;
}

/**
 * When an error is thrown (or passed to the `next` callback) by any standard middleware
 * or route handler, the error, request, and response are all passed to any error handling
 * request processors for the application and route.
 */
export interface ErrorHandlingRequestProcessor {

   /**
    * See the documentation on `RequestProcessor` for details about the request, response,
    * and especially the `next` callback.
    *
    * @param err The error that was thrown (or passed to the `next` callback). Since any
    *            type of object can be thrown or passed to the `next` callback, there is
    *            no guarantee that this error will be a subclass of `Error`.
    * @param req The request to be handled
    * @param resp The response that will be sent when the request-handling process is
    *             complete
    * @param next Callback that should be called when the handler is done with its work
    *             processing the request (see notes above)
    */
   (err: unknown, req: Request, resp: Response, next: NextCallback): unknown;
}

export type AnyRequestProcessor = RequestProcessor | ErrorHandlingRequestProcessor;
export type ProcessorOrProcessors = AnyRequestProcessor | AnyRequestProcessor[];
export type PathParams = string | RegExp | Array<string | RegExp>;

export interface RouteMatchingProcessorAppender<T> {

   /**
    * @param path one or more paths to mount the provided request processors to.
    * @param handlers the processors to mount to this path / these paths
    */
   (path: PathParams, ...handlers: ProcessorOrProcessors[]): T;
}

export interface ApplicationLoggingOptions {
   level: LogLevel;
}

export interface RouterOptions {

   /**
    * If URL pattern matching should be case-sensitive, set this to `true`. By default it
    * is false, meaning that `/Foo` and `/foo` are the same, so if either of those
    * requests came in, they would match to a route that you defined for `/foo`. With
    * case-sensitivity enabled, only the second request would match that route.
    */
   caseSensitive: boolean;

   logging: ApplicationLoggingOptions;
}

export interface IRouter {

   readonly routerOptions: RouterOptions;

   /**
    * Add request processors to all requests on the given path - regardless of request
    * method.
    */
   all: RouteMatchingProcessorAppender<this>;

   /**
    * Add request processors to all `GET` requests on the given path.
    */
   get: RouteMatchingProcessorAppender<this>;

   /**
    * Add request processors to all `POST` requests on the given path.
    */
   post: RouteMatchingProcessorAppender<this>;

   /**
    * Add request processors to all `PUT` requests on the given path.
    */
   put: RouteMatchingProcessorAppender<this>;

   /**
    * Add request processors to all `DELETE` requests on the given path.
    */
   delete: RouteMatchingProcessorAppender<this>;

   /**
    * Add request processors to all `PATCH` requests on the given path.
    */
   patch: RouteMatchingProcessorAppender<this>;

   /**
    * Add request processors to all `OPTIONS` requests on the given path.
    */
   options: RouteMatchingProcessorAppender<this>;

   /**
    * Add request processors to all `HEAD` requests on the given path.
    */
   head: RouteMatchingProcessorAppender<this>;

   /**
    * Add request processors to all routes handled by this router - regardless of path or
    * method.
    *
    * @param handlers the processors to use on all requests handled by this router
    */
   use(...handlers: ProcessorOrProcessors[]): this;

   /**
    * Add request processors to all requests for the given (HTTP) method on the given
    * path.
    *
    * @param method an HTTP method, e.g. "GET", "POST", "HEAD", "OPTIONS". Arguments will
    *               be normalized to all uppercase so that the actual method string you
    *               provide is case-insensitive
    * @param path one or more paths to mount the provided request processors to.
    * @param handlers the processors to mount to this path / these paths for the give
    *                 method
    */
   mount(method: string, path: PathParams, ...handlers: ProcessorOrProcessors[]): this;


   /**
    * Handles a request, optionally starting it with an error (for use when this router is
    * not the first request processor to have handled the request, and a previous one
    * already generated an error).
    */
   handle(err: unknown, req: Request, resp: Response, done: NextCallback): void;

   /**
    * Returns an instance of a route-building helper class, which you can then use to
    * handle HTTP verbs with optional middleware. Use app.route() to avoid duplicate route
    * names (and thus typo errors). For example:
    *
    * ```
    * app.route('/hello')
    *    .all(function(req, res, next) {
    *       // Runs for all HTTP verbs
    *    })
    *    .get(function(req, res, next) {
    *       // Handle GETs to /hello
    *       res.json(...);
    *    })
    *    .post(function(req, res, next) {
    *       // Handle POSTs to /hello
    *    });
    * ```
    */
   route(path: PathParams): IRoute;

}

export interface IRoute {

   /**
    * Express-standard routing method for adding handlers that get invoked regardless of
    * the request method (e.g. `OPTIONS`, `GET`, `POST`, etc) for a specific path (or set
    * of paths).
    */
   all: RouteProcessorAppender<this>;

   /**
    * Express-standard routing method for `HEAD` requests.
    */
   head: RouteProcessorAppender<this>;

   /**
    * Express-standard routing method for `GET` requests.
    */
   get: RouteProcessorAppender<this>;

   /**
    * Express-standard routing method for `POST` requests.
    */
   post: RouteProcessorAppender<this>;

   /**
    * Express-standard routing method for `PUT` requests.
    */
   put: RouteProcessorAppender<this>;

   /**
    * Express-standard routing method for `DELETE` requests.
    */
   delete: RouteProcessorAppender<this>;

   /**
    * Express-standard routing method for `PATCH` requests.
    */
   patch: RouteProcessorAppender<this>;

   /**
    * Express-standard routing method for `OPTIONS` requests.
    */
   options: RouteProcessorAppender<this>;

}

export interface RouteProcessorAppender<T> {

   /**
    * @param handlers the processors to mount to this route's path
    */
   (...handlers: ProcessorOrProcessors[]): T;
}
