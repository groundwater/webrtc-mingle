#!/usr/bin/env node

let { spawn } = require('child_process')

spawn(require('electron'), [__dirname + '/src/index.js'])