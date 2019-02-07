import {
   APIGatewayEventRequestContext as OrigAPIGatewayEventRequestContext,
   APIGatewayProxyEvent,
   Context,
   APIGatewayProxyResult,
} from 'aws-lambda';
import { StringMap, StringArrayOfStringsMap } from './utils/common-types';

/* COMBO TYPES */

/**
 * The `evt` argument passed to a Lambda handler that represents the request (from API
 * Gateway or ALB).
 */
export type RequestEvent = ApplicationLoadBalancerRequestEvent | APIGatewayRequestEvent;

/**
 * The "request context", which is accessible at `evt.requestContext`.
 */
export type RequestEventRequestContext = APIGatewayEventRequestContext | ApplicationLoadBalancerEventRequestContext;

export interface ResponseResult extends APIGatewayProxyResult {
   multiValueHeaders: StringArrayOfStringsMap;
   statusDescription?: string;
}

/**
 * The `context` object passed to a Lambda handler.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface HandlerContext extends Context {}


/* API GATEWAY TYPES (we export these with our own names to make it easier to modify them
if needed at a later time) */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface APIGatewayRequestEvent extends APIGatewayProxyEvent {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface APIGatewayEventRequestContext extends OrigAPIGatewayEventRequestContext {}


/* APPLICATION LOAD BALANCER TYPES (these are not yet included in aws-lambda) */

export interface ApplicationLoadBalancerRequestEvent {
   body: string | null;
   httpMethod: string;
   isBase64Encoded: boolean;
   path: string;
   headers?: StringMap;
   multiValueHeaders?: StringArrayOfStringsMap;
   queryStringParameters?: StringMap;
   multiValueQueryStringParameters?: StringArrayOfStringsMap;
   requestContext: ApplicationLoadBalancerEventRequestContext;
}

export interface ApplicationLoadBalancerEventRequestContext {
   elb: {
      targetGroupArn: string;
   };
}


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
