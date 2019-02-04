import { IRouter, ProcessorOrProcessors, PathParams, RouterOptions } from './interfaces';
import { defaults } from 'underscore';
// TODO: look at whether we can remove the dependency on underscore

const DEFAULT_OPTS: RouterOptions = {
   caseSensitive: false,
};

export default class Router implements IRouter {

   public constructor(options?: RouterOptions) {
      this.options = defaults(options, DEFAULT_OPTS);
   }

   public addSubRouter(path: PathParams, router: Router): this {
      console.log(path, router); // eslint-disable-line no-console
      return this;
   }

   public use(...handlers: ProcessorOrProcessors[]): this {
      console.log(this.options); // eslint-disable-line no-console
      console.log(handlers); // eslint-disable-line no-console
      return this;
   }

   public mount(method: string, path: PathParams, ...handlers: ProcessorOrProcessors[]): this {
      console.log(method, path, handlers); // eslint-disable-line no-console
      return this;
   }

   public head(path: PathParams, ...handlers: ProcessorOrProcessors[]): this {
      return this.mount('HEAD', path, ...handlers);
   }

   public all(path: PathParams, ...handlers: ProcessorOrProcessors[]): this {
      return this.mount('ALL', path, ...handlers);
   }

   public get(path: PathParams, ...handlers: ProcessorOrProcessors[]): this {
      return this.mount('GET', path, ...handlers);
   }

   public post(path: PathParams, ...handlers: ProcessorOrProcessors[]): this {
      return this.mount('POST', path, ...handlers);
   }

   public put(path: PathParams, ...handlers: ProcessorOrProcessors[]): this {
      return this.mount('PUT', path, ...handlers);
   }

   public delete(path: PathParams, ...handlers: ProcessorOrProcessors[]): this {
      return this.mount('DELETE', path, ...handlers);
   }

   public patch(path: PathParams, ...handlers: ProcessorOrProcessors[]): this {
      return this.mount('PATCH', path, ...handlers);
   }

   public options(path: PathParams, ...handlers: ProcessorOrProcessors[]): this {
      return this.mount('OPTIONS', path, ...handlers);
   }

}
