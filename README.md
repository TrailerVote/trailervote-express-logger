# TrailerVote Express Logger

[![Build Status](https://travis-ci.com/TrailerVote/trailervote-express-logger.svg?branch=master)](https://travis-ci.com/TrailerVote/trailervote-express-logger)
[![NPM Package Version](https://badge.fury.io/js/@trailervote%2Fexpress-logger.svg)](https://npmjs.org/package/@trailervote/express-logger)

Packages that provide a logger for express based services in the TrailerVote ecosystem.

```bash
yarn add @trailervote/express-logger
```

```typescript
import { createLogger, LogLevels } from '@trailervote/express-logger'

const logger = createLogger(LogLevels.info)

logger.error('Something went horribly wrong')
logger.lazy.debug(() => 'This will never be executed')
```
