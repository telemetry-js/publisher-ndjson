'use strict'

const fastJson = require('fast-json-stringify')
const SonicBoom = require('sonic-boom')

module.exports = function plugin (options) {
  return new NDJSONPublisher(options)
}

const schema = {
  abstract: {
    definitions: {
      name: { type: 'string' },
      time: { type: 'integer' },
      unit: { type: 'string' },
      statistic: { type: 'string' },
      tags: {
        type: 'object',
        additionalProperties: {
          type: 'string'
        }
      }
    }
  }
}

const stringifySingle = fastJson({
  title: 'single',
  type: 'object',
  properties: {
    name: { $ref: 'abstract#/definitions/name' },
    time: { $ref: 'abstract#/definitions/time' },
    value: { type: 'number' },
    unit: { $ref: 'abstract#/definitions/unit' },
    statistic: { $ref: 'abstract#/definitions/statistic' },
    tags: { $ref: 'abstract#/definitions/tags' }
  }
}, { schema })

const stringifySummary = fastJson({
  title: 'summary',
  type: 'object',
  properties: {
    name: { $ref: 'abstract#/definitions/name' },
    time: { $ref: 'abstract#/definitions/time' },
    stats: {
      type: 'object',
      properties: {
        sum: { type: 'number' },
        min: { type: 'number', nullable: true },
        max: { type: 'number', nullable: true },
        count: { type: 'number' }
      }
    },
    unit: { $ref: 'abstract#/definitions/unit' },
    statistic: { $ref: 'abstract#/definitions/statistic' },
    tags: { $ref: 'abstract#/definitions/tags' }
  }
}, { schema })

const REUSE_SINGLE = {
  name: '',
  time: 0,
  value: 0,
  unit: '',
  statistic: '',
  tags: {}
}

const REUSE_SUMMARY = {
  name: '',
  time: 0,
  stats: {
    sum: 0,
    min: null,
    max: null,
    count: 0
  },
  unit: '',
  statistic: '',
  tags: {}
}

let warnedPretty = false

class NDJSONPublisher {
  constructor (options) {
    if (typeof options === 'string') {
      options = { file: options }
    } else if (typeof options === 'number') {
      options = { fd: options }
    } else if (!options) {
      options = {}
    }

    if (typeof options.file === 'string') {
      this._stream = new SonicBoom(options.file, 0, options.sync !== false)

      // Support log rotation
      process.on('SIGUSR2', () => {
        this._stream.reopen()
      })
    } else if (typeof options.fd === 'number') {
      this._stream = new SonicBoom(options.fd, 0, options.sync !== false)
    } else if (options.stream) {
      this._stream = options.stream
    } else if (options.stderr) {
      this._stream = process.stderr
    } else {
      this._stream = process.stdout
    }

    this._pretty = !!options.pretty
    this._objectMode = options.stream ? !!options.objectMode : false
    this._warnedDestroyed = false
    this._warnedOverflow = false

    if (this._pretty && !warnedPretty) {
      warnedPretty = true
      process.emitWarning(
        'The "pretty" option is deprecated and will be removed in a future version',
        'TelemetryWarning'
      )
    }
  }

  publish (metric) {
    let chunk

    if (metric.date === undefined) {
      return
    } else if (this._objectMode) {
      chunk = metric
    } else if (this._pretty) {
      // Note that pretty output isn't valid NDJSON
      chunk = JSON.stringify(metric, null, 2) + '\n'
    } else if (metric.isSingle() && Number.isFinite(metric.value)) {
      REUSE_SINGLE.name = metric.name
      REUSE_SINGLE.time = metric.date.valueOf()
      REUSE_SINGLE.value = metric.value
      REUSE_SINGLE.unit = metric.unit
      REUSE_SINGLE.statistic = metric.statistic || 'average'
      REUSE_SINGLE.tags = metric.tags

      chunk = stringifySingle(REUSE_SINGLE) + '\n'
    } else if (metric.isSummary() && Number.isFinite(metric.stats.sum)) {
      REUSE_SUMMARY.name = metric.name
      REUSE_SUMMARY.time = metric.date.valueOf()
      REUSE_SUMMARY.stats.sum = metric.stats.sum
      REUSE_SUMMARY.stats.min = metric.stats.count === 0 ? null : metric.stats.min
      REUSE_SUMMARY.stats.max = metric.stats.count === 0 ? null : metric.stats.max
      REUSE_SUMMARY.stats.count = metric.stats.count
      REUSE_SUMMARY.unit = metric.unit
      REUSE_SUMMARY.statistic = metric.statistic || 'average'
      REUSE_SUMMARY.tags = metric.tags

      chunk = stringifySummary(REUSE_SUMMARY) + '\n'
    } else {
      return
    }

    if (!this._stream.destroyed) {
      const ok = this._stream.write(chunk)

      if (!ok && !this._warnedOverflow) {
        this._warnedOverflow = true
        process.emitWarning('Destination of publisher-ndjson is overflowing', 'TelemetryWarning')
      }
    } else if (!this._warnedDestroyed) {
      this._warnedDestroyed = true
      process.emitWarning('Destination of publisher-ndjson was destroyed', 'TelemetryWarning')
    }
  }
}
