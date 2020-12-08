# publisher-ndjson

> **Publish metrics as NDJSON to a file (synchronously), stream, stdout or stderr.**  
> A [`telemetry`](https://github.com/telemetry-js/telemetry) plugin.

[![npm status](http://img.shields.io/npm/v/telemetry-js/publisher-ndjson.svg)](https://www.npmjs.org/package/@telemetry-js/publisher-ndjson)
[![node](https://img.shields.io/node/v/@telemetry-js/publisher-ndjson.svg)](https://www.npmjs.org/package/@telemetry-js/publisher-ndjson)
[![Test](https://github.com/telemetry-js/publisher-ndjson/workflows/Test/badge.svg?branch=main)](https://github.com/telemetry-js/publisher-ndjson/actions)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Table of Contents

<details><summary>Click to expand</summary>

- [Usage](#usage)
- [Options](#options)
- [Install](#install)
- [Acknowledgements](#acknowledgements)
- [License](#license)

</details>

## Usage

```js
const telemetry = require('@telemetry-js/telemetry')()
const ndjson = require('@telemetry-js/publisher-ndjson')

telemetry.task()
  .collect(..)
  .schedule(..)
  .publish(ndjson, './metrics.ndjson')
```

## Options

_Yet to document._

## Install

With [npm](https://npmjs.org) do:

```
npm install @telemetry-js/publisher-ndjson
```

## Acknowledgements

This project is kindly sponsored by [Reason Cybersecurity Inc](https://reasonsecurity.com).

[![reason logo](https://cdn.reasonsecurity.com/github-assets/reason_signature_logo.png)](https://reasonsecurity.com)

## License

[MIT](LICENSE) © Vincent Weevers
