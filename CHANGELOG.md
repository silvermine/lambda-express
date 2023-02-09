# Changelog

All notable changes to this project will be documented in this file.
See [our coding standards][commit-messages] for commit guidelines.

### [0.3.1](https://github.com/silvermine/lambda-express/compare/v0.3.0...v0.3.1) (2022-12-23)


### Features

* make last resort error handler return status code found on error ([f4c159d](https://github.com/silvermine/lambda-express/commit/f4c159ddfaf47ac24d38e353cfb097fb35fe7d6f))


### Bug Fixes

* allow badly encoded path parameters to be handled by error handlers ([a98414c](https://github.com/silvermine/lambda-express/commit/a98414c21387316d7ada70ae3f9f42c38273ca4b))
* return 400 when decoding bad path parameters ([6542e13](https://github.com/silvermine/lambda-express/commit/6542e13fcdbf2de4dc83810e930e6ebf95b64ffb))


# [0.2.0](https://github.com/silvermine/lambda-express/compare/v0.1.0...v0.2.0) (2019-04-02)


### Bug Fixes

* case-sensitive routing for sub-router mounting points ([#17](https://github.com/silvermine/lambda-express/issues/17)) ([d7dfe46](https://github.com/silvermine/lambda-express/commit/d7dfe46))
* freeze lambda context object ([#18](https://github.com/silvermine/lambda-express/issues/18)) ([b2c7dac](https://github.com/silvermine/lambda-express/commit/b2c7dac))


### Features

* **routing:** add internal re-routing ([#23](https://github.com/silvermine/lambda-express/issues/23)) ([02adb91](https://github.com/silvermine/lambda-express/commit/02adb91))
* Add basic logger ([#20](https://github.com/silvermine/lambda-express/issues/20)) ([2dca77e](https://github.com/silvermine/lambda-express/commit/2dca77e))
* Add Router `route` method ([#19](https://github.com/silvermine/lambda-express/issues/19)) ([1174414](https://github.com/silvermine/lambda-express/commit/1174414))
* Add support for promises in handlers ([#30](https://github.com/silvermine/lambda-express/issues/30)) ([49f500c](https://github.com/silvermine/lambda-express/commit/49f500c))
* Escape newline/paragraph separators in JSONP responses ([#36](https://github.com/silvermine/lambda-express/issues/36)) ([f681233](https://github.com/silvermine/lambda-express/commit/f681233))
* Sanitize JSONP callback parameter values ([#35](https://github.com/silvermine/lambda-express/issues/35)) ([fe01f3e](https://github.com/silvermine/lambda-express/commit/fe01f3e))
* Set nosniff for JSONP responses ([#38](https://github.com/silvermine/lambda-express/issues/38)) ([5b5b7d9](https://github.com/silvermine/lambda-express/commit/5b5b7d9))
* Use 'prepare' to build dist on 'npm install' from git repo ([#41](https://github.com/silvermine/lambda-express/issues/41)) ([a58bdd7](https://github.com/silvermine/lambda-express/commit/a58bdd7))



# 0.1.0 (2019-02-26)

This is the initial release of `@silvermine/lambda-express`. It is fully-functional and
well-tested. It works with both API Gateway and Application Load Balancer. We are still
planning to add a few more features before we cut a 1.0.0 release. You can grep the code
for "TODO" items at commit 1d4f33e to see the list of those potential features and
changes.

[commit-messages]: https://github.com/silvermine/silvermine-info/blob/master/commit-history.md#commit-messages
