import ProcessorChain, { IRequestMatchingProcessorChain } from './ProcessorChain';

export class MatchAllRequestsProcessorChain extends ProcessorChain implements IRequestMatchingProcessorChain {

   public matches(): boolean {
      return true;
   }

}
