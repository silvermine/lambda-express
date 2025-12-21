import Application from './Application';
import Request from './Request';
import Response from './Response';
import Router from './Router';
import { Context } from 'aws-lambda';
import { RequestEvent, ResponseResult } from './request-response-types';

export {
   Application,
   Request,
   Response,
   Router,
};

/**
 * Creates an async Lambda handler function from an Application instance.
 *
 * @param app The Application instance to use for handling requests
 * @returns An async Lambda handler function
 *
 * @example
 * ```typescript
 * const app = new Application();
 * app.get('/hello', (req, res) => res.send('Hello World!'));
 *
 * export const handler = createAsyncHandler(app);
 * ```
 */
export function createAsyncHandler(app: Application): (event: RequestEvent, context: Context) => Promise<ResponseResult> {
   return (event: RequestEvent, context: Context): Promise<ResponseResult> => {
      return app.runAsync(event, context);
   };
}

// We need to export only types that are used in public interfaces (e.g. those used in
// concrete classes like Application, Request, Response, Router, exported above).
export {
   IRoute,
   IRouter,
   PathParams,
   NextCallback,
   RouterOptions,
   RequestProcessor,
   AnyRequestProcessor,
   ProcessorOrProcessors,
   ErrorHandlingRequestProcessor,
} from './interfaces';

export {
   CookieOpts,
   RequestEvent,
   HandlerContext,
   ResponseResult,
   LambdaEventSourceType,
   APIGatewayRequestEvent,
   RequestEventRequestContext,
   APIGatewayEventRequestContext,
   ApplicationLoadBalancerRequestEvent,
   ApplicationLoadBalancerEventRequestContext,
} from './request-response-types';

export {
   StringMap,
   StringUnknownMap,
   KeyValueStringObject,
   StringArrayOfStringsMap,
} from '@silvermine/toolbox';

export {
   ILogger,
   LogLevel,
} from './logging/logging-types';
