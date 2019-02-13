import _ from 'underscore';
import ProcessorChain, { IRequestMatchingProcessorChain } from './ProcessorChain';
import { ErrorHandlingRequestProcessor, PathParams } from '../interfaces';
import { Request } from '..';
import pathToRegexp from 'path-to-regexp';
import { StringMap } from '../utils/common-types';

export class RouteMatchingProcessorChain extends ProcessorChain implements IRequestMatchingProcessorChain {

   private readonly _method: string | undefined;
   private readonly _matcher: RegExp;
   private readonly _paramKeys: pathToRegexp.Key[] = [];

   public constructor(subprocessors: ErrorHandlingRequestProcessor[], path: PathParams, caseSensitive: boolean = false, method?: string) {
      super(subprocessors);
      this._method = method;
      this._matcher = pathToRegexp(path, this._paramKeys, { sensitive: caseSensitive });
   }

   public matches(req: Request): boolean {
      if (this._method !== undefined && req.method !== this._method) {
         return false;
      }

      return this._matcher.test(req.path);
   }

   /**
    * Only public for the sake of unit testing.
    */
   protected _makeParams(path: string): StringMap {
      const params: StringMap = {},
            matches = this._matcher.exec(path);

      if (matches && matches.length > 0) {
         // the first match returned is the entire URL
         _.each(matches.slice(1), (v, i) => {
            const key = this._paramKeys[i];

            if (key && !_.isEmpty(v)) {
               params[key.name] = decodeURIComponent(v);
            }
         });
      }

      return params;
   }

   /**
    * Only public for the sake of unit testing.
    */
   protected _makeSubRequest(req: Request): Request {
      const params = this._makeParams(req.path);

      return req.makeSubRequest('', params);
   }

}
