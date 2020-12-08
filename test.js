'use strict'

const test = require('tape')
const plugin = require('.') // eslint-disable-line
const single = require('@telemetry-js/metric').single
const summary = require('@telemetry-js/metric').summary
const Writable = require('readable-stream').Writable
const tmp = require('os').tmpdir()
const fs = require('fs')
const path = require('path')

test('single metric', function (t) {
  t.plan(1)

  const lines = []
  const stream = new Writable({
    objectMode: true,
    write (line, enc, next) {
      lines.push(line)
      next()
    },
    final (callback) {
      t.same(lines, [
        '{"name":"test.count","time":1556883174812,"value":1,"unit":"count","statistic":"average","tags":{}}\n',
        '{"name":"test.count","time":1556883174812,"value":-100.2,"unit":"count","statistic":"sum","tags":{}}\n'
      ])
      callback()
    }
  })

  const publisher = plugin({ stream })
  const date = new Date(1556883174812)

  publisher.publish(single('test.count', { unit: 'count', value: 1, date }))
  publisher.publish(single('test.count', { unit: 'count', value: Infinity, date }))
  publisher.publish(single('test.count', { unit: 'count', value: -100.2, date, statistic: 'sum' }))

  stream.end()
})

test('summary metric', function (t) {
  t.plan(1)

  const lines = []
  const stream = new Writable({
    objectMode: true,
    write (line, enc, next) {
      lines.push(line)
      next()
    },
    final (callback) {
      t.same(lines, [
        '{"name":"test.count","time":1556883174812,"stats":{"sum":0,"min":null,"max":null,"count":0},"unit":"count","statistic":"average","tags":{}}\n',
        '{"name":"test.count","time":1556883174812,"stats":{"sum":5,"min":2,"max":3,"count":2},"unit":"count","statistic":"average","tags":{"foo":"bar"}}\n'
      ])
      callback()
    }
  })

  const publisher = plugin({ stream })
  const date = new Date(1556883174812)

  publisher.publish(summary('test.count', {
    unit: 'count',
    stats: {
      sum: 0,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      count: 0
    },
    date
  }))

  publisher.publish(summary('test.count', {
    unit: 'count',
    stats: {
      sum: 5,
      min: 2,
      max: 3,
      count: 2
    },
    date,
    tags: {
      foo: 'bar'
    }
  }))

  stream.end()
})

test('overflow', function (t) {
  t.plan(3)

  const emitWarning = process.emitWarning

  process.emitWarning = function (msg, type) {
    t.is(msg, 'Destination of publisher-ndjson is overflowing')
    t.is(type, 'TelemetryWarning')
  }

  const lines = []
  const stream = new Writable({
    objectMode: true,
    highWaterMark: 1,
    write (line, enc, next) {
      lines.push(line)
      next()
    },
    final (callback) {
      t.is(lines.length, 2)
      process.emitWarning = emitWarning
      callback()
    }
  })

  const publisher = plugin({ stream })

  publisher.publish(single('test.count', { unit: 'count', value: 1 }))
  publisher.publish(single('test.count', { unit: 'count', value: 2 }))

  stream.end()
})

test('single metric to objectMode stream', function (t) {
  t.plan(1)

  const metric = single('test.count', { unit: 'count', value: 1 })
  const stream = new Writable({
    objectMode: true,
    write (obj, enc, next) {
      t.ok(obj === metric)
      next()
    }
  })

  plugin({ stream, objectMode: true }).publish(metric)
})

test('repeated single metric to file', function (t) {
  t.plan(1)

  const file = path.join(tmp, `publisher-ndjson-test1-${Date.now()}.ndjson`)
  const fixture = path.join(__dirname, 'fixture.ndjson')

  fs.writeFileSync(file, 'existing content should be kept\n')

  const date = new Date(1556883174812)
  const publisher = plugin({ file })

  publisher._stream.on('ready', function () {
    for (let i = 0; i < 500; i++) {
      publisher.publish(single('test.count', {
        unit: 'count',
        value: i,
        date,
        tags: {
          host: 'test',
          forgiving: 1
        }
      }))
    }

    publisher._stream.end()
  })

  publisher._stream.on('close', function () {
    // Uncomment to update the fixture
    // fs.writeFileSync(fixture, fs.readFileSync(file, 'utf8'))

    const actual = fs.readFileSync(file, 'utf8')
    const expected = fs.readFileSync(fixture, 'utf8')

    t.ok(actual === expected)
  })
})
