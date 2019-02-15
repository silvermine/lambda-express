import _ from 'underscore';
import { ErrorHandlingRequestProcessor, NextCallback } from '../interfaces';
import { Request, Response } from '..';

export interface IProcessorChain {
   run(err: unknown, req: Request, resp: Response, done: NextCallback): void;
}

export interface IRequestMatchingProcessorChain extends IProcessorChain {
   matches(req: Request): boolean;
}

export default class ProcessorChain implements IProcessorChain {

   private readonly _subprocessors: ErrorHandlingRequestProcessor[];

   public constructor(subprocessors: ErrorHandlingRequestProcessor[]) {
      this._subprocessors = subprocessors;
   }

   public run(originalErr: unknown, req: Request, resp: Response, done: NextCallback): void {
      const subRequest = this._makeSubRequest(req);

      const run = _.reduce(this._subprocessors.slice().reverse(), (next: NextCallback, rp: ErrorHandlingRequestProcessor): NextCallback => {
         return (err) => {
            if (err === 'route') {
               return done();
            }
            try {
               rp(err, subRequest, resp, next);
            } catch(newErr) {
               return next(newErr);
            }
         };
      }, done);

      run(originalErr);
   }

   /**
    * Extension point for subclasses to override aspects of the request like baseUrl and
    * params.
    */
   protected _makeSubRequest(req: Request): Request {
      return req;
   }

}
