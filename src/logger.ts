import { Request, Response } from 'express'
import { IncomingHttpHeaders } from 'http'

// tslint:disable:object-literal-sort-keys
export const LogLevels = {
  debug: 10,
  log: 20,
  info: 30,
  warn: 40,
  error: 50,

  none: 100,
}
// tslint:enable:object-literal-sort-keys

export type Logger = ConsoleLike & {
  lazy: LazyLogger,
}

type ResolvableLogArguments = () => (any | any[])
type LazyLogger = { [P in keyof ConsoleLike]: (func: ResolvableLogArguments) => void }

export interface ConsoleLike {
  trace(message?: any, ...optionalParams: any[]): void
  warn(message?: any, ...optionalParams: any[]): void
  info(message?: any, ...optionalParams: any[]): void
  debug(message?: any, ...optionalParams: any[]): void
  log(message?: any, ...optionalParams: any[]): void
  error(message?: any, ...optionalParams: any[]): void
}

export const NONE_LOGGER = createLogger(LogLevels.none)

/**
 * Extract logger from Response locals
 *
 * @export
 * @param {Response} res
 * @returns {ConsoleLike}
 */
export function logger(res: Response): Logger {
  return res.locals.logger || NONE_LOGGER
}

function lazy(unwrapped: ConsoleLike): LazyLogger {
  return (Object.keys(unwrapped) as Array<keyof ConsoleLike>).reduce((result, method) => {
    const original = unwrapped[method]
    result[method] = original === noop
      ? noop
      : (resolvable: ResolvableLogArguments) => {
        const resolved = resolvable()
        const [message, ...optionalParams] = Array.isArray(resolved)
          ? resolved
          : [resolved]

        original(message, ...optionalParams)
      }
    return result
  } , {} as { [P in keyof LazyLogger]: LazyLogger[P] }) as LazyLogger
}

type LogLevelName = keyof typeof LogLevels

// tslint:disable-next-line:variable-name
function noop(_message?: any, ..._optionalParams: any[]) { /* noop */ }

/**
 * Create a new Logger
 *
 * @export
 * @param {number|LogLevelName} [level=LogLevels[process.env.LOG_LEVEL] || LogLevels.info]
 * @param {ConsoleLike} [output=console]
 * @param {boolean} [initialInfo=true]
 * @returns {Logger} Logger instance
 */
export function createLogger(
  level: (number | LogLevelName) = LogLevels[process.env.LOG_LEVEL as LogLevelName] || LogLevels.info,
  output: ConsoleLike = console,
  initialInfo: boolean = true,
): Logger {
  const logLevel = LogLevels[level as (keyof typeof LogLevels)] || level

  const consoleLike: ConsoleLike = {
    debug: logLevel <= LogLevels.debug ? output.debug : noop,
    error: logLevel <= LogLevels.error ? output.error : noop,
    info: logLevel <= LogLevels.info ? output.info : noop,
    log: logLevel <= LogLevels.log ? output.log : noop,
    trace: process.env.TRACE ? output.trace : noop,
    warn: logLevel <= LogLevels.warn ? output.warn : noop,
  }

  const instance: Logger = { ...consoleLike, lazy: lazy(consoleLike) }

  if (initialInfo) {
    instance.info('[logger] level set at: ' + logLevel)
  }

  return instance
}

interface HeadersLookup { [K: string]: boolean }

const HEADERS_TO_LOG = [
  'accept',
  'accept-encoding',
  'accept-language',
  'authorization',
  'cache-control',
  'content-type',
  'if-match',
  'if-modified-since',
  'if-none-match',
  'if-range',
  'if-unmodified-since',
  'user-agent',
  'warning',
].reduce((result, header) => ({ ...result, [header]: true }), {} as HeadersLookup)

const HEADERS_TO_SCRUB = [
  'authorization',
].reduce((result, header) => ({ ...result, [header]: true }), {} as HeadersLookup)

/**
 * Stringifies a request to make it loggable
 *
 * @export
 * @param {Request} req the request
 * @param [headersToLog=HEADERS_TO_LOG] headers included in the output
 * @param [headersToScrub=HEADERS_TO_SCRUB] values which are scrubbed to <present> or <empty>
 * @returns {string} loggable request representation
 */
export function requestToLog(req: Request, headersToLog = HEADERS_TO_LOG, headersToScrub = HEADERS_TO_SCRUB): string {
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
  const headers = (Object.keys(req.headers) as Array<keyof IncomingHttpHeaders>).reduce((result, header) => {
    if (headersToLog[header]) {
      const value = req.headers[header]
      result[header] = headersToScrub[header] ? (value && '<present>' || '<empty>') : value
    }
    return result
  }, {} as IncomingHttpHeaders)

  const log = {
    headers,
    method: req.method,
    url,
  }

  return JSON.stringify(log)
}

/**
 * Returns requestToLog prefixed with the locals.requestTag
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 * @returns {string}
 */
export function taggedRequestToLog(req: Request, res: Response): string {
  return `${res.locals.requestTag}: ${requestToLog(req)}`
}

/**
 * Creates a prefix from the time it took since the request came in
 *
 * @export
 * @param {Response} res
 * @returns {string|null}
 */
export function responseTime(res: Response): string | null {
  if (!res || !res.locals.requestTime) {
    return null
  }

  const difference = process.hrtime(res.locals.requestTime)
  const time = ((difference[0] * 1e9 + difference[1]) / 1e6).toFixed(2)

  return `[+${time}ms]`
}
