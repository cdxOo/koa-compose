'use strict'
/**
  * vim: set shiftwidth=2
  */
const util = require('util')

/**
 * @param {Array} middleware
 * @return {Function}
 */
const composeSlim = (middleware) => async (ctx, next) => {
  const dispatch = (i) => async () => {
    const fn = i === middleware.length
      ? next
      : middleware[i]
    if (!fn) return
    return await fn(ctx, dispatch(i + 1))
  }
  return dispatch(0)()
}

/** @typedef {import("koa").Middleware} Middleware */

/**
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 *
 * @param {...(Middleware | Middleware[])} middleware
 * @return {Middleware}
 * @api public
 */

const compose = (...middleware) => {
  const funcs = middleware.flat()

  for (const [ix, fn] of funcs.entries()) {
    if (typeof fn !== 'function') {
      const msg = (
        'Middleware must be composed of functions!' +
        formatExtraErrorInfo(funcs, ix)
      )
      throw new TypeError(msg)
    }
  }

  if (process.env.NODE_ENV === 'production') return composeSlim(funcs)

  return async (ctx, next) => {
    const dispatch = async (i) => {
      const fn = i === funcs.length
        ? next
        : funcs[i]
      if (!fn) return

      let nextCalled = false
      let nextResolved = false
      const nextProxy = async () => {
        if (nextCalled) {
          throw Error(
            'next() called multiple times' +
            formatExtraErrorInfo(funcs, i - 1)
          )
        }
        nextCalled = true
        try {
          return await dispatch(i + 1)
        } finally {
          nextResolved = true
        }
      }
      const result = await fn(ctx, nextProxy)
      if (nextCalled && !nextResolved) {
        throw Error(
          'Middleware resolved before downstream.\n\tYou are probably missing an await or return'
        )
      }
      return result
    }
    return dispatch(0)
  }
}

function formatExtraErrorInfo (middleware, index) {
  const fn = middleware[index]
  return (
    ` {\n\tMiddleware: "${fndebug(fn)}"` +
    `\n\tMiddleware Index: ${index}` +
    `\n\tMiddleware List: ${stackdebug(middleware)}` +
    '\n}'
  )
}

function fndebug (fn) {
  return util.format(fn)
}

function stackdebug (middleware) {
  return util.format(
    [...middleware.entries()].map(([ix, fn]) => ({ [ix]: fn }))
  )
}

compose.named = (middleware, name) => {
    var composition = compose(...middleware)
    composition._name = name // NOTE: for koajs debug
    return composition
}

/**
 * Expose compositor.
 */

module.exports = compose
