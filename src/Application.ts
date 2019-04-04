import { Callback, Context } from 'aws-lambda';
import Router from './Router';
import { RequestEvent, HandlerContext } from './request-response-types';
import { StringUnknownMap, Writable } from '@silvermine/toolbox';
import { Request, Response } from '.';
import _ from 'underscore';

export default class Application extends Router {

   private _settings: StringUnknownMap = {};

   /**
    * Assigns setting `name` to `value`. You may store any value that you want, but
    * certain names can be used to configure the behavior of the server. These special
    * names are listed in the app settings table.
    *
    * Calling `app.setSetting('foo', true)` for a `Boolean` property is the same as
    * calling `app.enable('foo')`. Similarly, calling `app.setSetting('foo', false)` for a
    * `Boolean` property is the same as calling `app.disable('foo')`.
    *
    * Retrieve the value of a setting with `app.getSetting()`.
    *
    * ```
    * app.setSetting('title', 'My Site');
    * app.getSetting('title'); // "My Site"
    * ```
    *
    * ## App Settings Used By Lambda Express:
    *
    *  * `trust proxy` (default `false`): Determines whether `X-Forwarded-*` headers are
    *    trusted or not. Be careful when enabling this setting because these headers are
    *    easily spoofed.
    *  * `case sensitive routing` (default `false`): Determines whether routing is
    *    case-sensitive. When enabled, "/Foo" and "/foo" are different routes. When
    *    disabled, "/Foo" and "/foo" are treated the same. NOTE: Sub-apps (routers mounted
    *    by calling `addSubRouter`, or those created implicitly by calling `.route(path)`)
    *    will inherit the value of this setting.
    *
    * @param name The name of the setting
    * @param val The value to assign to the setting
    */
   public setSetting(name: string, val: unknown): Application {
      this._settings[name] = val;

      if (name === 'case sensitive routing') {
         this.routerOptions.caseSensitive = !!val;
      }
      return this;
   }

   /**
    * See `app.setSetting(name, val)`.
    */
   public getSetting(name: string): unknown {
      return this._settings[name];
   }

   /**
    * See `app.enable(name)` and `app.disable(name)`.
    * @param name the name of the setting to test
    */
   public isEnabled(name: string): boolean {
      return !!this.getSetting(name);
   }

   /**
    * Enable a setting with `name`, e.g. `app.enable('trust proxy')`.
    * @param name setting name
    */
   public enable(name: string): Application {
      return this.setSetting(name, true);
   }

   /**
    * Disable a setting with `key`, e.g. `app.disable('trust proxy')`.
    * @param name setting key
    */
   public disable(name: string): Application {
      return this.setSetting(name, false);
   }

   /**
    * Run the app for a Lambda invocation.
    *
    * @param evt The event provided to the Lambda handler
    * @param context The context provided to the Lambda handler
    * @param cb The callback provided to the Lambda handler
    */
   public run(evt: RequestEvent, context: Context, cb: Callback): void {
      const req = new Request(this, evt, this._createHandlerContext(context)),
            resp = new Response(this, req, cb);

      this.handle(undefined, req, resp, (err: unknown): void => {
         // handler of last resort:
         if (err) {
            resp.sendStatus(500);
         } else {
            resp.sendStatus(404);
         }
      });
   }

   private _createHandlerContext(context: Context): HandlerContext {
      // keys should exist on both `HandlerContext` and `Context`
      const keys: (keyof HandlerContext & keyof Context)[] = [
         'functionName', 'functionVersion', 'invokedFunctionArn', 'memoryLimitInMB',
         'awsRequestId', 'logGroupName', 'logStreamName', 'identity', 'clientContext',
         'getRemainingTimeInMillis',
      ];

      let handlerContext: Writable<HandlerContext>;

      handlerContext = _.reduce(keys, (memo, key) => {
         let contextValue = context[key];

         if (typeof contextValue === 'object' && contextValue) {
            // Freeze sub-objects
            memo[key] = Object.freeze(_.extend({}, contextValue));
         } else if (typeof contextValue !== 'undefined') {
            memo[key] = contextValue;
         }
         return memo;
      }, {} as Writable<HandlerContext>);

      return Object.freeze(handlerContext);
   }

}
