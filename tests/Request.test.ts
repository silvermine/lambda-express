import { expect } from 'chai';
import { Request, Application } from '../src';
import {
   SAMPLE_APIGW_REQUEST_EVENT,
   SAMPLE_HANDLER_CONTEXT,
   SAMPLE_ALB_REQUEST_EVENT,
   SAMPLE_ALB_MULTI_VAL_HEADERS_REQUEST_EVENT } from './samples';

describe('Request', () => {
   it('can be constructed', () => {
      const app: Application = new Application(),
            req1: Request = new Request(app, SAMPLE_APIGW_REQUEST_EVENT, SAMPLE_HANDLER_CONTEXT),
            req2: Request = new Request(app, SAMPLE_ALB_REQUEST_EVENT, SAMPLE_HANDLER_CONTEXT),
            req3: Request = new Request(app, SAMPLE_ALB_MULTI_VAL_HEADERS_REQUEST_EVENT, SAMPLE_HANDLER_CONTEXT);

      expect(req1).to.eql(req1);
      expect(req2).to.eql(req2);
      expect(req3).to.eql(req3);
      // TODO: figure out what's wrong with this (bad typings it seems):
      // expect(req).to.be.ok();
      // TODO: get this working (see https://github.com/silvermine/chai-strictly-equal/issues/3)
      // expect(req).to.strictlyEqual(req);
   });
});
