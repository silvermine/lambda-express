import { Callback } from 'aws-lambda';
import Router from './Router';
import { RequestEvent, HandlerContext } from './request-response-types';
import { Request, Response } from '.';

export default class Application extends Router {

   private _settings: { [k: string]: any } = {};

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
    *
    * @param name The name of the setting
    * @param val The value to assign to the setting
    */
   public setSetting(name: string, val: any): Application {
      this._settings[name] = val;
      return this;
   }

   /**
    * See `app.setSetting(name, val)`.
    */
   public getSetting(name: string): any {
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
   public async run(evt: RequestEvent, context: HandlerContext, cb: Callback): Promise<void> {
      const req = new Request(this, evt, context),
            resp = new Response(this, req, cb);

      console.log(evt, context, req, resp); // eslint-disable-line no-console
      cb(undefined, {});
   }

}
