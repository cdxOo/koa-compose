'use strict'
/**
  * vim: set shiftwidth=2
  */
var util = require('util');

/**
 * Expose compositor.
 */

module.exports = compose

/**
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 *
 * @param {Array} middleware
 * @return {Function}
 * @api public
 */

function compose (middleware) {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const [ ix, fn ] of middleware.entries()) {

    if (typeof fn !== 'function') {
      var stackdebug = util.format(
        [ ...middleware.entries() ].map(([ ix, fn ]) => ({ [ix]: fn }))
      );
      var msg = (
        `Middleware must be composed of functions!`
        + `\n\tMiddleware Index: ${ix}`
        + `\n\tMiddleware List: ${stackdebug}`
      );
      throw new TypeError(msg);
    }
  }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */

  return function (context, next) {
    // last called middleware #
    let index = -1
    return dispatch(0)
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
