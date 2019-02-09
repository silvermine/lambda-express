# Lambda Express

[![NPM Version](https://img.shields.io/npm/v/@silvermine/lambda-express.svg)](https://www.npmjs.com/package/@silvermine/lambda-express)
[![License](https://img.shields.io/github/license/silvermine/lambda-express.svg)](./LICENSE)
[![Build Status](https://travis-ci.com/silvermine/lambda-express.svg?branch=master)](https://travis-ci.com/silvermine/lambda-express)
[![Coverage Status](https://coveralls.io/repos/github/silvermine/lambda-express/badge.svg?branch=master)](https://coveralls.io/github/silvermine/lambda-express?branch=master)
[![Dependency Status](https://david-dm.org/silvermine/lambda-express.svg)](https://david-dm.org/silvermine/lambda-express)
[![Dev Dependency Status](https://david-dm.org/silvermine/lambda-express/dev-status.svg)](https://david-dm.org/silvermine/lambda-express#info=devDependencies&view=table)


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

TODO: fill in details and examples here.


## License

This software is released under the MIT license. See [the license file](LICENSE) for more
details.

