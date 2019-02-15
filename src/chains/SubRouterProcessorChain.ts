import { IRequestMatchingProcessorChain } from './ProcessorChain';
import { PathParams, IRouter, NextCallback } from '../interfaces';
import { Request, Response } from '..';
const pathToRegexp = require('path-to-regexp');

export class SubRouterProcessorChain implements IRequestMatchingProcessorChain {

   private readonly _matcher: RegExp;
   private readonly _router: IRouter;

   public constructor(path: PathParams, router: IRouter) {
      // TODO: case sensitivity settings (strict and end need to remain false here):
      this._matcher = pathToRegexp(path, [], { sensitive: false, strict: false, end: false });
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
