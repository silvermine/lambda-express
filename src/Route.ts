import { IRoute, PathParams, ProcessorOrProcessors } from './interfaces';
import Router from './Router';

export default class Route implements IRoute {

   protected _router: Router;

   public constructor(path: PathParams, parentRouter: Router) {
      this._router = new Router(parentRouter.routerOptions);
      parentRouter.addSubRouter(path, this._router);
   }

   public all(...handlers: ProcessorOrProcessors[]): this {
      this._router.all('/', ...handlers);
      return this;
   }

   public head(...handlers: ProcessorOrProcessors[]): this {
      this._router.head('/', ...handlers);
      return this;
   }

   public get(...handlers: ProcessorOrProcessors[]): this {
      this._router.get('/', ...handlers);
      return this;
   }

   public post(...handlers: ProcessorOrProcessors[]): this {
      this._router.post('/', ...handlers);
      return this;
   }

   public put(...handlers: ProcessorOrProcessors[]): this {
      this._router.put('/', ...handlers);
      return this;
   }

   public delete(...handlers: ProcessorOrProcessors[]): this {
      this._router.delete('/', ...handlers);
      return this;
   }

   public patch(...handlers: ProcessorOrProcessors[]): this {
      this._router.patch('/', ...handlers);
      return this;
   }

   public options(...handlers: ProcessorOrProcessors[]): this {
      this._router.options('/', ...handlers);
      return this;
   }

}
