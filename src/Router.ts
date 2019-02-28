// TODO: look at whether we can remove the dependency on underscore
import _ from 'underscore';
import {
   IRouter,
   ProcessorOrProcessors,
   PathParams,
   RouterOptions,
   NextCallback,
   ErrorHandlingRequestProcessor,
} from './interfaces';
import { IRequestMatchingProcessorChain } from './chains/ProcessorChain';
import { Request, Response } from '.';
import { wrapRequestProcessor, wrapRequestProcessors } from './utils/wrapRequestProcessor';
import { RouteMatchingProcessorChain } from './chains/RouteMatchingProcessorChain';
import { MatchAllRequestsProcessorChain } from './chains/MatchAllRequestsProcessorChain';
import { SubRouterProcessorChain } from './chains/SubRouterProcessorChain';

const DEFAULT_OPTS: RouterOptions = {
   caseSensitive: false,
};

export default class Router implements IRouter {

   public readonly routerOptions: RouterOptions;
   private readonly _processors: IRequestMatchingProcessorChain[] = [];

   public constructor(options?: RouterOptions) {
      this.routerOptions = _.defaults(options, DEFAULT_OPTS);
   }

   // TODO: do we need `router.route`?
   // https://expressjs.com/en/guide/routing.html#app-route
   // https://expressjs.com/en/4x/api.html#router.route
   // If we do add it, we need to set the case-sensitivity of the sub-router it creates
   // using the case-sensitivity setting of this router.

   public handle(originalErr: unknown, req: Request, resp: Response, done: NextCallback): void {
      const processors = this._processors;

      let index = 0;

      const processRequest = (err: unknown, processorReq: Request, processorResp: Response, next: NextCallback): void => {
         let processor = processors[index];

         index += 1;

         if (processor === undefined) {
            // We've looped through all available processors.
            return next(err);
         } else if (processor.matches(processorReq)) {
            // ^^^^ User-defined route handlers may change the request object's URL to
            // re-route the request to other route handlers. Therefore, we must re-check
            // whether the current processor matches the request object after every
            // processor is run.
            processor.run(err, processorReq, processorResp, (processorError) => {
               processRequest(processorError, processorReq, processorResp, next);
            });
         } else {
            // Current processor does not match. Continue.
            processRequest(err, processorReq, processorResp, next);
         }
      };

      processRequest(originalErr, req, resp, done);
   }

   /**
    * Mounts a sub-router to this router. In Express, this is part of the overloaded `use`
    * method, but we separated it out in Lambda Express to allow better type safety and
    * code hinting / auto-completion.
    */
   public addSubRouter(path: PathParams, router: Router): this {
      // Note: this overriding of the case sensitivity of the passed-in router is likely
      // ineffective for most usecases because the user probably created their router and
      // added a bunch of routes to it before adding that router to this one. When the
      // routes are created (technically the `IRequestMatchingProcessorChain` objects, in
      // particular `RouteMatchingProcessorChain`), the case sensitivity is already set
      // (inherited from the router that created the chain).
      router.routerOptions.caseSensitive = this.routerOptions.caseSensitive;
      this._processors.push(new SubRouterProcessorChain(path, router));
      return this;
   }

   /**
    * Mounts middleware, error handlers, or route handlers to a specific HTTP method and
    * route. Not included in standard Express, this is specific to Lambda Express.
    *
    * Note that this method creates a route-chain of all the handlers passed to it so that
    * they are treated as a single handler. That allows any of the handlers passed to this
    * method to call `next('route')` to skip to the next route handler (or route handler
    * chain) for this route.
    */
   public mount(method: string | undefined, path: PathParams, ...processors: ProcessorOrProcessors[]): this {
      const wrapped: ErrorHandlingRequestProcessor[] = wrapRequestProcessors(_.flatten(processors)),
            isCaseSensitive = this.routerOptions.caseSensitive;

      this._processors.push(new RouteMatchingProcessorChain(wrapped, path, isCaseSensitive, method));
      return this;
   }

   /**
    * Express-standard routing method for adding middleware and handlers that get invoked
    * for all routes handled by this router.
    */
   public use(...processors: ProcessorOrProcessors[]): this {
      _.each(_.flatten(processors), (rp: ErrorHandlingRequestProcessor) => {
         this._processors.push(new MatchAllRequestsProcessorChain([ wrapRequestProcessor(rp) ]));
      });
      return this;
   }

   /**
    * Express-standard routing method for adding handlers that get invoked regardless of
    * the request method (e.g. `OPTIONS`, `GET`, `POST`, etc) for a specific path (or set
    * of paths).
    */
   public all(path: PathParams, ...processors: ProcessorOrProcessors[]): this {
      return this.mount(undefined, path, ...processors);
   }

   /**
    * Express-standard routing method for `HEAD` requests.
    */
   public head(path: PathParams, ...processors: ProcessorOrProcessors[]): this {
      return this.mount('HEAD', path, ...processors);
   }

   /**
    * Express-standard routing method for `GET` requests.
    */
   public get(path: PathParams, ...processors: ProcessorOrProcessors[]): this {
      return this.mount('GET', path, ...processors);
   }

   /**
    * Express-standard routing method for `POST` requests.
    */
   public post(path: PathParams, ...processors: ProcessorOrProcessors[]): this {
      return this.mount('POST', path, ...processors);
   }

   /**
    * Express-standard routing method for `PUT` requests.
    */
   public put(path: PathParams, ...processors: ProcessorOrProcessors[]): this {
      return this.mount('PUT', path, ...processors);
   }

   /**
    * Express-standard routing method for `DELETE` requests.
    */
   public delete(path: PathParams, ...processors: ProcessorOrProcessors[]): this {
      return this.mount('DELETE', path, ...processors);
   }

   /**
    * Express-standard routing method for `PATCH` requests.
    */
   public patch(path: PathParams, ...processors: ProcessorOrProcessors[]): this {
      return this.mount('PATCH', path, ...processors);
   }

   /**
    * Express-standard routing method for `OPTIONS` requests.
    */
   public options(path: PathParams, ...processors: ProcessorOrProcessors[]): this {
      return this.mount('OPTIONS', path, ...processors);
   }

}
