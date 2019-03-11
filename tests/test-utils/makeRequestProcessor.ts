import _ from 'underscore';
import { SinonSpy, spy } from 'sinon';
import { NextCallback, AnyRequestProcessor } from '../../src/interfaces';
import { Request, Response } from '../../src';

interface MakeFunctionOpts {
   handlesErrors?: boolean;
   callsNext?: boolean;
   throwsError?: boolean;
   callsNextWithError?: boolean;
   callsNextRoute?: boolean;
   passesErrorToNext?: boolean;
   returnsResolvedPromise?: boolean;
   returnsRejectedPromise?: boolean;
   returnsEmptyRejectedPromise?: boolean;
}

const DEFAULT_OPTS: MakeFunctionOpts = {
   handlesErrors: false,
   callsNext: true,
   throwsError: false,
   callsNextWithError: false,
   callsNextRoute: false,
   passesErrorToNext: false,
   returnsResolvedPromise: false,
   returnsRejectedPromise: false,
   returnsEmptyRejectedPromise: false,
};

function delay(value: unknown, ms: number = 4): Promise<unknown> {
   return new Promise((resolve) => {
      setTimeout(() => {
         resolve(value);
      }, ms);
   });
}

/**
 * When using sinon assertions (especially for asserting that many functions were called,
 * and that call order was correct), it's best to have named functions. So, this function
 * makes named functions that are passed to sinon spies to act as middleware, route
 * handlers, and error handlers. It will reduce hundreds of lines of copy and paste
 * function creation in the tests that use it..
 */
export default function makeRequestProcessor(name: string, userOpts?: MakeFunctionOpts): SinonSpy {
   let opts = _.defaults(userOpts, DEFAULT_OPTS),
       rp: AnyRequestProcessor;

   if (opts.handlesErrors) {
      rp = (err: unknown, _req: Request, _resp: Response, next: NextCallback): void | Promise<unknown> => {
         if (opts.throwsError) {
            throw new Error(`Error from "${name}"`);
         } else if (opts.callsNextWithError) {
            return next(`Error from "${name}"`);
         } else if (opts.callsNextRoute) {
            return next('route');
         } else if (opts.passesErrorToNext) {
            return next(err);
         } else if (opts.returnsRejectedPromise) {
            return delay(Promise.reject(`Rejection from "${name}"`));
         } else if (opts.returnsEmptyRejectedPromise) {
            return delay(Promise.reject());
         } else if (opts.returnsResolvedPromise && opts.callsNext) {
            return delay(undefined).then(() => {
               next(); // eslint-disable-line callback-return
            });
         } else if (opts.returnsResolvedPromise) {
            return delay(Promise.resolve());
         } else if (opts.callsNext) {
            return next();
         }
      };
   } else {
      if (opts.passesErrorToNext) {
         throw new Error(`Invalid makeFunction options: ${JSON.stringify(opts)}`);
      }
      rp = (_req: Request, _resp: Response, next: NextCallback): void | Promise<unknown> => {
         if (opts.throwsError) {
            throw new Error(`Error from "${name}"`);
         } else if (opts.callsNextWithError) {
            return next(`Error from "${name}"`);
         } else if (opts.callsNextRoute) {
            return next('route');
         } else if (opts.returnsRejectedPromise) {
            return delay(Promise.reject(`Rejection from "${name}"`));
         } else if (opts.returnsEmptyRejectedPromise) {
            return delay(Promise.reject());
         } else if (opts.returnsResolvedPromise && opts.callsNext) {
            return delay(undefined).then(() => {
               next(); // eslint-disable-line callback-return
            });
         } else if (opts.returnsResolvedPromise) {
            return delay(Promise.resolve());
         } else if (opts.callsNext) {
            return next();
         }
      };
   }

   // Name the function for better sinon error messages (e.g. "expected call order mw1,
   // mw2, mw3 but was mw3, mw2, mw1" is infintely better than "expected call order spy,
   // spy, spy but was spy, spy, spy")
   Object.defineProperty(rp, 'name', { value: name, writable: false });

   return spy(rp);
}
