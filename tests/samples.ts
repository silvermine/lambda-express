import _ from 'underscore';
import {
   APIGatewayEventRequestContext,
   ApplicationLoadBalancerEventRequestContext,
   APIGatewayRequestEvent,
   HandlerContext,
   ApplicationLoadBalancerRequestEvent } from '../src/request-response-types';

export const SAMPLE_HANDLER_CONTEXT: HandlerContext = {
   callbackWaitsForEmptyEventLoop: true,
   logGroupName: '/aws/lambda/echo-api-prd-echo',
   logStreamName: '2019/01/31/[$LATEST]bb001267fb004ffa8e1710bba30b4ae7',
   functionName: 'echo-api-prd-echo',
   memoryLimitInMB: 1024,
   functionVersion: '$LATEST',
   awsRequestId: 'ed6cac60-bb31-4c1f-840d-dd34c80eb9a3',
   invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:echo-api-prd-echo',
   getRemainingTimeInMillis: () => 100,
   done: () => undefined,
   fail: () => undefined,
   succeed: () => undefined,
};

export const SAMPLE_APIGW_REQUEST_CONTEXT: APIGatewayEventRequestContext = {
   accountId: '123456789012',
   apiId: 'someapi',
   authorizer: null,
   httpMethod: 'GET',
   identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      sourceIp: '8.8.8.8',
      user: null,
      userAgent: 'curl/7.54.0',
      userArn: null,
   },
   path: '/prd',
   stage: 'prd',
   requestId: 'a507736b-259e-11e9-8fcf-4f1f08c4591e',
   requestTimeEpoch: 1548969891530,
   resourceId: 'reas23acc',
   resourcePath: '/',
};

export const SAMPLE_APIGW_REQUEST_EVENT: APIGatewayRequestEvent = {
   body: null,
   httpMethod: 'GET',
   isBase64Encoded: false,
   path: '/echo/asdf/a',
   resource: '/{proxy+}',
   pathParameters: { proxy: 'echo/asdf/a' },
   stageVariables: null,
   requestContext: SAMPLE_APIGW_REQUEST_CONTEXT,
   headers: {
      Accept: '*/*',
      'CloudFront-Forwarded-Proto': 'https',
      'CloudFront-Is-Desktop-Viewer': 'true',
      'CloudFront-Is-Mobile-Viewer': 'false',
      'CloudFront-Is-SmartTV-Viewer': 'false',
      'CloudFront-Is-Tablet-Viewer': 'false',
      'CloudFront-Viewer-Country': 'US',
      Host: 'b5gee6dacf.execute-api.us-east-1.amazonaws.com',
      'User-Agent': 'curl/7.54.0',
      Via: '2.0 4ee511e558a0400aa4b9c1d34d92af5a.cloudfront.net (CloudFront)',
      'X-Amz-Cf-Id': 'xn-ohXlUAed-32bae2cfb7164fd690ffffb87d36b032==',
      'X-Amzn-Trace-Id': 'Root=1-4b5398e2-a7fbe4f92f2e911013cba76b',
      'X-Forwarded-For': '8.8.8.8, 2.3.4.5',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
   },
   multiValueHeaders: {
      Accept: [ '*/*' ],
      Foo: [ 'bar', 'baz' ],
      'CloudFront-Forwarded-Proto': [ 'https' ],
      'CloudFront-Is-Desktop-Viewer': [ 'true' ],
      'CloudFront-Is-Mobile-Viewer': [ 'false' ],
      'CloudFront-Is-SmartTV-Viewer': [ 'false' ],
      'CloudFront-Is-Tablet-Viewer': [ 'false' ],
      'CloudFront-Viewer-Country': [ 'US' ],
      Host: [ 'b5gee6dacf.execute-api.us-east-1.amazonaws.com' ],
      'User-Agent': [ 'curl/7.54.0' ],
      Via: [ '2.0 4ee511e558a0400aa4b9c1d34d92af5a.cloudfront.net (CloudFront)' ],
      'X-Amz-Cf-Id': [ 'xn-ohXlUAed-32bae2cfb7164fd690ffffb87d36b032==' ],
      'X-Amzn-Trace-Id': [ 'Root=1-4b5398e2-a7fbe4f92f2e911013cba76b' ],
      'X-Forwarded-For': [ '8.8.8.8, 2.3.4.5' ],
      'X-Forwarded-Port': [ '443' ],
      'X-Forwarded-Proto': [ 'https ' ],
   },
   queryStringParameters: {
      'foo[a]': 'bar b',
      x: '2',
      y: 'z',
   },
   multiValueQueryStringParameters: {
      'foo[a]': [ 'bar b', 'baz c' ],
      x: [ '1', '2' ],
      y: [ 'z' ],
   },
};

export const SAMPLE_ALB_REQUEST_CONTEXT: ApplicationLoadBalancerEventRequestContext = {
   elb: {
      targetGroupArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/alb-lambda-prd-tg1/180d40bbdb377b34',
   },
};

const SAMPLE_ALB_REQUEST_EVENT_BASE: ApplicationLoadBalancerRequestEvent = {
   body: '',
   httpMethod: 'GET',
   isBase64Encoded: false,
   path: '/echo/asdf/a',
   requestContext: SAMPLE_ALB_REQUEST_CONTEXT,
};

export const SAMPLE_ALB_REQUEST_EVENT: ApplicationLoadBalancerRequestEvent = _.extend({}, SAMPLE_ALB_REQUEST_EVENT_BASE, {
   queryStringParameters: {
      'foo%5Ba%5D': 'baz%20c',
      x: '2',
      y: 'z',
   },
   headers: {
      accept: '*/*',
      foo: 'baz',
      host: 'alb-lambda-prd-123456806.us-east-1.elb.amazonaws.com',
      'user-agent': 'curl/7.54.0',
      'x-amzn-trace-id': 'Root=1-4b5398e2-a7fbe4f92f2e911013cba76b',
      'x-forwarded-for': '8.8.8.8',
      'x-forwarded-port': '80',
      'x-forwarded-proto': 'http',
   },
});

export const SAMPLE_ALB_MULTI_VAL_HEADERS_REQUEST_EVENT: ApplicationLoadBalancerRequestEvent = _.extend({}, SAMPLE_ALB_REQUEST_EVENT_BASE, {
   multiValueQueryStringParameters: {
      'foo%5Ba%5D': [ 'bar%20b', 'baz%20c' ],
      x: [ '1', '2' ],
      y: [ 'z' ],
   },
   'multiValueHeaders': {
      accept: [ '*/*' ],
      foo: [ 'bar', 'baz' ],
      host: [ 'alb-lambda-prd-123456806.us-east-1.elb.amazonaws.com' ],
      'user-agent': [ 'curl/7.54.0' ],
      'x-amzn-trace-id': [ 'Root=1-4b5398e2-a7fbe4f92f2e911013cba76b' ],
      'x-forwarded-for': [ '8.8.8.8' ],
      'x-forwarded-port': [ '80' ],
      'x-forwarded-proto': [ 'http' ],
   },
});
