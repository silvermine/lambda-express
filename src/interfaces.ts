import Request from './Request';
import Response from './Response';

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
   (err?: any): void;
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
    * handlers (for a given route) typically do not need the the `next` callback function.
    * Any function passed to `use`, `get`, and other route-handling methods will have its
    * arity inspected; if it takes three arguments, it will be passed a `next` callback
    * and *MUST* call the callback or a response-sending function (e.g. `send`, `body`, or
    * `json`) on the response in order to complete the processing. Failure to either send
    * a response or call `next` will result in a hung process.
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
   (err: any, req: Request, resp: Response, next: NextCallback): unknown;
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

export interface RouterOptions {

   /**
    * If URL pattern matching should be case-sensitive, set this to `true`. By default it
    * is false, meaning that `/Foo` and `/foo` are the same, so if either of those
    * requests came in, they would match to a route that you defined for `/foo`. With
    * case-sensitivity enabled, only the second request would match that route.
    */
   caseSensitive: boolean;
}

export interface IRouter {

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

}
