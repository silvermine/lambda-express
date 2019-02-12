import { Application, Request } from '../../src';
import { apiGatewayRequest, handlerContext } from '../samples';
import { IRequestMatchingProcessorChain } from '../../src/chains/ProcessorChain';
import { MatchAllRequestsProcessorChain } from '../../src/chains/MatchAllRequestsProcessorChain';
import { expect } from 'chai';


describe('MatchAllRequestsProcessorChain', () => {
   let app: Application, req: Request;

   beforeEach(() => {
      app = new Application();
      req = new Request(app, apiGatewayRequest(), handlerContext());
   });

   it('always says yes', () => {
      const chain: IRequestMatchingProcessorChain = new MatchAllRequestsProcessorChain([]);

      expect(chain.matches(req)).to.eql(true);
   });
});
