import _ from 'underscore';
import { AnyRequestProcessor, NextCallback, ErrorHandlingRequestProcessor } from '../interfaces';
import { Request, Response } from '..';
import { isPromise } from './common-types';

function isErrorHandler(rh: AnyRequestProcessor): rh is ErrorHandlingRequestProcessor {
   return rh.length === 4;
}

export function wrapRequestProcessor(rp: AnyRequestProcessor): ErrorHandlingRequestProcessor {
   if (isErrorHandler(rp)) {
      return (err: unknown, req: Request, resp: Response, next: NextCallback) => {
         if (err) {
            const returned: any = rp(err, req, resp, next);

            if (isPromise(returned)) {
               returned.then(null, (newErr: unknown) => {
                  next(newErr || new Error('Rejected promise'));
               });
            }

            return;
         }

         // Error handlers should not get invoked if there is no error, so we simply
         // call next so that we keep chaining down to the next non-error handler.
         next();
      };
   }

   return (err: unknown, req: Request, resp: Response, next: NextCallback) => {
      if (err) {
         // If there's an error, regular request processors don't handle it, so we
         // simply call next so that we keep chaining down to the first real error
         // handler.
         return next(err);
      }

      const returned: any = rp(req, resp, next);

      if (isPromise(returned)) {
         returned.then(null, (newErr: unknown) => {
            next(newErr || new Error('Rejected promise'));
         });
      }
   };
}

export function wrapRequestProcessors(processors: AnyRequestProcessor[]): ErrorHandlingRequestProcessor[] {
   return _.map(processors, (rp) => { return wrapRequestProcessor(rp); });
}
