# Lambda Express

[![NPM Version](https://img.shields.io/npm/v/@silvermine/lambda-express.svg)](https://www.npmjs.com/package/@silvermine/lambda-express)
[![License](https://img.shields.io/github/license/silvermine/lambda-express.svg)](./LICENSE)
[![Build Status](https://travis-ci.com/silvermine/lambda-express.svg?branch=master)](https://travis-ci.com/silvermine/lambda-express)
[![Coverage Status](https://coveralls.io/repos/github/silvermine/lambda-express/badge.svg?branch=master)](https://coveralls.io/github/silvermine/lambda-express?branch=master)
[![Dependency Status](https://david-dm.org/silvermine/lambda-express.svg)](https://david-dm.org/silvermine/lambda-express)
[![Dev Dependency Status](https://david-dm.org/silvermine/lambda-express/dev-status.svg)](https://david-dm.org/silvermine/lambda-express#info=devDependencies&view=table)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)


## What?

An [express](https://expressjs.com/)-like framework for use with AWS Lambda functions that
supports both API Gateway and Application Load Balancer integrations with Lambda.

The entire library is written in TypeScript so you get great autocomplete if you're using
VS Code or similar. It's also very well tested, so you can rest assured that it will do
what you need, and regressions between versions will be rare.


## Why?

You shouldn't have to think about how API Gateway or Application Load Balancer send you
request events, or how you need to respond to them with your responses. There are a lot of
little intricacies, especially if you are using API Gateway for some of your APIs and
Application Load Balancer for others (see [this writeup][apigw-vs-alb] for the
differences).

If you're writing APIs, you've probably already written Express apps, so keeping things
familiar will accelerate your development, allowing you to focus on your business logic.

[apigw-vs-alb]: https://serverless-training.com/articles/api-gateway-vs-application-load-balancer-technical-details/


## Usage

Here's a simple example to get you up and running quickly (assumes your execution environment is Node 12.x):

`npm i @silvermine/lambda-express`

`npm i -D aws-lambda`

```typescript
import { Application, Response, Request } from '@silvermine/lambda-express';
import { RequestEvent } from '@silvermine/lambda-express/dist/types/request-response-types';
import { NextCallback } from '@silvermine/lambda-express/dist/types/interfaces';
import { Context, Callback } from 'aws-lambda';

const app = new Application();

app.all('/*', (_request: Request, response: Response, next: NextCallback) => {
   response.set('Access-Control-Allow-Origin', '*');
   next();
});

app.options('/*', (_request: Request, response: Response) => {
   response.set('Access-Control-Allow-Methods', 'OPTIONS,GET')
      .set('Access-Control-Allow-Credentials', 'false');
   response.send('');
});

app.get('/my-endpoint', async (request: Request, response: Response) => {
   response.send('Hello world!');
});

export const handler = (event: RequestEvent, context: Context, callback: Callback): void => {
   app.run(event, context, callback);
};

export default handler;
```

At this point you should be able to compile, bundle, and deploy this Lambda.
Assuming you have configured APIGW or ALB to forward traffic to your Lambda,
you will now have a very basic working API!

## License

This software is released under the MIT license. See [the license file](LICENSE) for more
details.

