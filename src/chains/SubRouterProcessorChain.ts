import { IRequestMatchingProcessorChain } from './ProcessorChain';
import { PathParams, IRouter, NextCallback, RouterOptions } from '../interfaces';
import { Request, Response } from '..';
const pathToRegexp = require('path-to-regexp');

export class SubRouterProcessorChain implements IRequestMatchingProcessorChain {

   private readonly _matcher: RegExp;
   private readonly _router: IRouter;

   public constructor(path: PathParams, router: IRouter, parentRouterOptions: RouterOptions) {
      // Although we use the subrouter to handle matched routes, we use the parent
      // router's case-sensitivity setting to match the route path that this subrouter is
      // mounted to because that's what Express does. For example:
      //
      // ```
      // const express = require('express'),
      //       app = express(),
      //       router = express.Router({ caseSensitive: false });
      //
      // app.enable('case sensitive routing');
      // app.use('/hello', router);
      // router.get('/world', (req, resp) => { resp.send('Hello world'); });
      // ```
      //
      // In the example above, the `/hello` part of the path is case-sensitive, and the
      // `/world` part of the path is case-insensitive. Therefore, GET requests to
      // `/hello/WORLD` would match the `/world` handler but requests to `/HELLO/world`
      // would not. To replicate this in Lambda Express, we have to use the parent
      // router's case sensitivity settings (`app`, in this example) for the mounting
      // point (`/world`).
      this._matcher = pathToRegexp(path, [], { sensitive: parentRouterOptions.caseSensitive, strict: false, end: false });
      this._router = router;
   }

   public run(err: unknown, req: Request, resp: Response, done: NextCallback): void {
      const result = this._matcher.exec(req.path);

      if (!result || result.length === 0) {
         throw new Error(`This subrouter does not match URL "${req.path}": ${this._matcher}`);
      }

      const baseURL = result[0].replace(/\/$/, ''),
            subRequest = req.makeSubRequest(baseURL);

      this._router.handle(err, subRequest, resp, done);
   }

   public matches(req: Request): boolean {
      return this._matcher.test(req.path);
   }

}
