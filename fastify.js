const { isEmpty, split } = require('lodash')

const memory = require('../bytes-memory')
const time = require('../moment-time')
const { getEnv } = require('../helpers')

const apiVersion = getEnv('API_VERSION', 'service-f0.0.0')

module.exports = Object.freeze({
  callback
})

/**
 * Makes a callback implementation of fastify
 *
 * @param {*} controller
 * @returns a fastify async (request, reply) function to implement the controller
 */
function callback (controller) {
  return async (request, reply) => {
    const log = require('debug')('callback:fastify')
    const response = makeResponse(reply)
    try {
      const { files, ...body } = request.body
      const httpRequest = {
        user: request.user,
        query: request.query,
        body,
        files,
        params: request.params,
        headers: request.headers,
        id: request.id,
        log: request.log,
        ip: request.ip,
        ips: request.ips,
        hostname: request.hostname
      }
      log('httpRequest:', httpRequest)

      const hrstart = process.hrtime()
      const memstart = process.memoryUsage().heapUsed
      const httpResponse = await controller(httpRequest)
      const memoryUsage = memory.heapdiff(memstart)
      const elapsedTime = time.getDurationInMilliseconds(hrstart)
      log('httpResponse:', httpResponse)

      if (httpResponse.statusCode !== 200) return response({ memoryUsage, elapsedTime, error: httpResponse })

      response({ memoryUsage, elapsedTime, data: httpResponse.body })
    } catch (error) {
      log('error:', error)
      response({
        memory_usage: error.memoryUsage,
        elapse_time: error.elapsedTime,
        error: {
          code: error.httpResponse.statusCode,
          message: error.httpResponse.body || error.body
        }
      })
    }
  }
}

/**
 * Makes a response function which implements fastify `reply` object
 *
 * @param {*} reply : `reply` object from fastify
 * @returns response()
 *
 * @usage response({ memoryUsage, elapsedTime, error: {}, data: {} })
 */
function makeResponse (reply) {
  return function response ({ lang = 'en', error = {}, data = {}, memoryUsage = undefined, elapsedTime = undefined }) {
    reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ api_version: apiVersion, memory_usage: memoryUsage, elapse_time: elapsedTime, lang, error, data })
  }
}
