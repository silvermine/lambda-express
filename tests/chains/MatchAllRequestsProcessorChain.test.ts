import { Application, Request } from '../../src';
import { handlerContext, makeAPIGatewayRequestEvent } from '../samples';
import { IRequestMatchingProcessorChain } from '../../src/chains/ProcessorChain';
import { MatchAllRequestsProcessorChain } from '../../src/chains/MatchAllRequestsProcessorChain';
import { expect } from 'chai';


describe('MatchAllRequestsProcessorChain', () => {
   let app: Application, req: Request;

   beforeEach(() => {
      app = new Application();
      req = new Request(app, makeAPIGatewayRequestEvent(), handlerContext());
   });

   it('always says yes', () => {
      const chain: IRequestMatchingProcessorChain = new MatchAllRequestsProcessorChain([]);

      expect(chain.matches(req)).to.eql(true);
   });
});
