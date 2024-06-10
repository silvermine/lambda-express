/* istanbul ignore next */

import {
   APIGatewayEventRequestContext as OrigAPIGatewayEventRequestContext,
   APIGatewayEventRequestContextV2 as OrigAPIGatewayEventRequestContextV2,
   APIGatewayProxyEvent,
   APIGatewayProxyEventV2,
   Context,
   APIGatewayProxyResult,
   APIGatewayProxyStructuredResultV2,
   ALBEvent,
   ALBEventRequestContext,
   ALBResult,
} from 'aws-lambda';

/* COMBO TYPES */

/**
 * The `evt` argument passed to a Lambda handler that represents the request (from API
 * Gateway or ALB).
 */
export type RequestEvent = ApplicationLoadBalancerRequestEvent | APIGatewayRequestEvent | APIGatewayRequestEventV2;

/**
 * The "request context", which is accessible at `evt.requestContext`.
 */
export type RequestEventRequestContext = APIGatewayEventRequestContext | ApplicationLoadBalancerEventRequestContext;

export type ResponseResult = APIGatewayProxyResult | APIGatewayProxyStructuredResultV2 | ALBResult;

export function isALBResult(evt: ResponseResult, test: boolean): evt is ALBResult {
   // TODO - this type gaurd doesn't do any useful checking
   return test && 'statusCode' in evt;
}

/**
 * The `context` object passed to a Lambda handler.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface HandlerContext extends Readonly<Pick<Context,
   'functionName'
   | 'functionVersion'
   | 'invokedFunctionArn'
   | 'memoryLimitInMB'
   | 'awsRequestId'
   | 'logGroupName'
   | 'logStreamName'
   | 'identity'
   | 'clientContext'
   | 'getRemainingTimeInMillis'
>> {}


/* API GATEWAY TYPES (we export these with our own names to make it easier to modify them
if needed at a later time) */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface APIGatewayRequestEvent extends APIGatewayProxyEvent {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface APIGatewayRequestEventV2 extends APIGatewayProxyEventV2 {}

export function isAPIGatewayRequestEventV2(evt: RequestEvent): evt is APIGatewayRequestEventV2 {
   return ('apiId' in evt.requestContext && 'version' in evt && evt.version === '2.0');
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface APIGatewayEventRequestContext extends OrigAPIGatewayEventRequestContext {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface APIGatewayEventRequestContextV2 extends OrigAPIGatewayEventRequestContextV2 {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApplicationLoadBalancerRequestEvent extends ALBEvent {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApplicationLoadBalancerEventRequestContext extends ALBEventRequestContext {}

/* OTHER TYPES RELATED TO REQUESTS AND RESPONSES */
export interface CookieOpts {

   /**
    * Domain name for the cookie. By default, no domain is set, and most clients will
    * consider the cookie to apply to only the current domain.
    */
   domain?: string;

   /**
    * A synchronous function used for cookie value encoding. Defaults to
    * [encodeURIComponent](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent).
    */
   encode?: (v: string) => string;

   /**
    * Expiry date of the cookie. If not provided, creates a session cookie. See notes on
    * `maxAge`.
    */
   expires?: Date;

   /**
    * Flags the cookie to be accessible only by the web server. Defaults to `true`.
    */
   httpOnly?: boolean;

   /**
    * Convenient option for setting the expiry time relative to the current time in
    * milliseconds.
    *
    * By default, no expiration is set, and most clients will consider this a
    * "non-persistent cookie" and will delete it on a condition like exiting a web browser
    * application.
    *
    * Note that the [cookie storage model
    * specification](https://tools.ietf.org/html/rfc6265#section-5.3) states that if both
    * `expires` and `maxAge` are set, then `maxAge` takes precedence, but it is possible
    * not all clients obey this, so if both are set, they should point to the same date
    * and time. Thus, if you set both `maxAge` and `expires`, the `maxAge` value will be
    * used to override your `expires` so that both values are guaranteed to be the same.
    */
   maxAge?: number;

   /**
    * Path for the cookie. Defaults to `/`.
    */
   path?: string;

   /**
    * Marks the cookie to be used with HTTPS only.
    */
   secure?: boolean;

   /**
    * Value of the `SameSite` `Set-Cookie` attribute. More information at
    * https://tools.ietf.org/html/draft-ietf-httpbis-cookie-same-site-00#section-4.1.1.
    */
   sameSite?: (boolean | 'lax' | 'strict' | undefined);

   // TODO: look at adding cookie signing functionality:
   // https://expressjs.com/en/api.html#res.cookie
   // https://expressjs.com/en/api.html#req.signedCookies
}

/**
 * The types of Lambda event sources that can trigger a Request.
 */
export type LambdaEventSourceType = 'APIGW' | 'ALB';
