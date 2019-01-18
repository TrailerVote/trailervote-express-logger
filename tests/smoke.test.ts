import test from 'tape'
import { ConsoleLike, createLogger, LogLevels } from '../src/logger'

type LogCall = [any, any[]]
const calls: { [P in keyof ConsoleLike]: LogCall[] } = {
  debug: [],
  error: [],
  info: [],
  log: [],
  trace: [],
  warn: []
}

function record(output: LogCall[]) {
  return (message?: any, ...optionalParams: any[]) =>
    output.push([message, optionalParams])
}

const mockLogger: ConsoleLike = {
  debug: record(calls.debug),
  error: record(calls.error),
  info: record(calls.info),
  log: record(calls.log),
  trace: record(calls.trace),
  warn: record(calls.warn)
}

const debugLogger = createLogger(LogLevels.debug, mockLogger)
const warnLogger = createLogger(LogLevels.warn, mockLogger)

const expected: Array<keyof ConsoleLike> = [
  'debug',
  'log',
  'info',
  'warn',
  'error'
]

test('debuglogger', (t) => {
  expected.forEach((level) => {
    test('it logs ' + level, (p) => {
      calls[level].splice(0)

      debugLogger[level]('Something went horribly wrong')
      p.assert(
        calls[level].length === 1,
        'expected logger to be called at ' + level
      )
      p.end()
    })

    test('it logs lazily ' + level, (p) => {
      calls[level].splice(0)

      debugLogger.lazy[level](() => 'Something went horribly wrong')
      p.assert(
        calls[level].length === 1,
        'expected logger to be called at ' + level
      )
      p.end()
    })
  })

  t.end()
})

const notExpected: Array<keyof ConsoleLike> = ['debug', 'log', 'info']

test('warnLogger', (t) => {
  notExpected.forEach((level) => {
    test('it logs ' + level + ' only if level is correct', (p) => {
      calls[level].splice(0)

      warnLogger[level]('Something went horribly wrong')
      p.assert(
        calls[level].length === 0,
        'expected logger not to be called at ' + level
      )
      p.end()
    })

    test('it logs lazily ' + level + ' only if level is correct', (p) => {
      calls[level].splice(0)

      warnLogger.lazy[level](() => {
        p.fail('expected this not to be called')
        return 'nope'
      })

      p.assert(
        calls[level].length === 0,
        'expected logger not to be called at ' + level
      )
      p.end()
    })
  })

  t.end()
})
