'use strict'

let http = require('http')
let SSE = require('ngn-sse')
let test = require('tape')
let busRpcPort = parseInt(process.env.RPC_PORT || 47911, 10) + 3

test('BUS:', function (t) {
  require('../')
  NGN.Log.disable()
  NGN.setup({
    system: 'user',
    secret: 'pass'
  })

  // 1. Mimic the Bridge app
  let heard = []
  let server = new NGN.RPC.Server({
    host: 'localhost',
    port: busRpcPort,
    expose: {
      testing: {
        echo: function (txt, callback) {
          callback(null, txt)
        }
      },
      subscribe: function (callback) {
        callback(null, {
          path: '/sse',
          port: busRpcPort + 7
        })
      },
      send: function (topic, payload, callback) {
        if (!callback) {
          if (typeof payload === 'function') {
            console.warn('No callback specified in client initiated send() method.')
            callback = payload
            payload = null
          }
        }
        if (typeof payload === 'object') {
          payload = JSON.stringify(payload)
        }
        heard.indexOf(topic) < 0 && heard.push(topic)
        _testSseClient_ && _testSseClient_.send({
          event: topic,
          data: payload
        })
        callback && callback()
      },
      configuration: function (user, pass, callback) {
        if (user === 'user' && pass === 'pass') {
          t.pass('NGN.setup used proper authentication settings for configuration request.')
          callback(null, {
            test: 'test'
          })
        } else {
          callback(new Error('Unauthorized'))
        }
      }
    }
  })

  // Mimic SSE server
  let web = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'})
    res.end('okay')
  })

  let _testSseClient_ = null
  web.listen(busRpcPort + 7, '127.0.0.1', function () {
    let sse = new SSE(web)

    sse.on('connection', function (_sseClient_) {
      _testSseClient_ = _sseClient_
      t.pass('Remote connection established to Server-Sent Events web channel.')
      setTimeout(function () {
        _sseClient_.send({
          event: 'remote.test.event',
          data: 'testing'
        })
      }, 300)
    })

    NGN.BUS.connect('127.0.0.1:' + busRpcPort)
  })

  // 2. When the "Bridge" is ready, connect the BUS
  server.once('ready', function () {
    // Make sure the configuration is available.
    NGN.on('configuration.ready', function () {
      t.ok(NGN.config !== null, 'Configuration populated from bridge.')
      t.ok(NGN.config.test === 'test', 'Configuration is accurate.')
    })

    // 3. When the BUS is ready, it's safe to disconnect
    NGN.BUS.once('connect', function () {
      t.ok(NGN.BUS.connected, 'Connected to remote NGN Bridge.')
      t.ok(NGN.BRIDGE !== null, 'NGN.BRIDGE is accessible.')

      // 4. Pause remote event shipping
      NGN.BUS.once('pause', function () {
        t.ok(NGN.BUS.paused, 'Remote event shipping successfully paused.')

        // 5. Resume remote event shipping
        NGN.BUS.once('resume', function () {
          t.ok(!NGN.BUS.paused, 'Remote event shipping successfully resumed.')

          web.on('close', function () {
            server.stop()
          })

          // 6. When the BUS disconnects, close the bridge.
          NGN.BUS.once('disconnect', function () {
            t.ok(!NGN.BUS.connected, 'Disconnected from remote NGN Bridge.')
            t.ok(NGN.BRIDGE === null, 'NGN.BRIDGE cleared upon disconnect.')
            web.close()
          })

          NGN.BUS.on('remote.test.event', function (data) {
            t.pass('Received remote test event.')
            // console.log('----->', arguments)
            // t.ok(data === 'testing', 'Remote test checksum OK.')

            NGN.BUS.healthmonitor.once('health.heartbeat.start', function () {
              t.ok(NGN.BUS.healthmonitor.heartbeatrunning, 'Heartbeat restarted.')

              NGN.BUS.healthmonitor.once('health.status.start', function () {
                t.ok(NGN.BUS.healthmonitor.statusrunning, 'Health: Status monitor restarted.')
                setTimeout(function () {
                  if (heard.indexOf('health.status') >= 0) {
                    t.pass('Health: Status received by remote host.')
                    NGN.Log.enable()
                    console.log('test remote log shipping')
                  }
                }, 350)
              })

              NGN.BUS.healthmonitor.once('health.info.start', function () {
                t.ok(NGN.BUS.healthmonitor.inforunning, 'Health: Device monitor restarted.')
                setTimeout(function () {
                  if (heard.indexOf('health.info') >= 0) {
                    t.pass('Health: Device info received by remote host.')
                    NGN.BUS.healthmonitor.statusWaitTime = 500
                  }
                }, 350)
              })

              NGN.BUS.once('health.heartbeat', function () {
                t.pass('Health: Heartbeat detected.')
                setTimeout(function () {
                  if (heard.indexOf('health.heartbeat')) {
                    t.pass('Health: Heartbeat detected by remote host.')
                    NGN.BUS.healthmonitor.infoWaitTime = 500
                  }
                }, 350)
              })
            })
            NGN.BUS.healthmonitor.heartbeatWaitTime = 500
          })

          NGN.BUS.once('syslog.log', function (data) {
            NGN.Log.disable()
            t.pass('Triggered log event via console object.')

            const d = data[1]

            setTimeout(function () {
              if (heard.indexOf('syslog.log')) {
                t.ok(d === 'test remote log shipping', 'Recognized log event remotely.')
                NGN.BUS.disconnect()
              }
            }, 350)
          })
        })

        NGN.BUS.resume()
      })

      NGN.BUS.pause()
    })
  })

  // 7. When the bridge is closed, run additional tests
  server.once('stop', function () {
    NGN.BUS.once('trigger', function () {
      t.pass('Basic event handling and attaching is supported.')
      NGN.BUS.emit('test.a')
    })

    NGN.BUS.pool('test.', {
      a: function () {
        t.pass('Event pooling works.')
        NGN.BUS.emit('test.b', {payload: 'test'})
      },
      b: function (data) {
        t.ok(data.payload === 'test', 'Event pool successfully provides data.')
        NGN.BUS.bind('binder', ['b.1', 'b.2'], {payload: 'test2'})
        NGN.BUS.emit('binder')

        setTimeout(function () {
          t.ok(bindtest === 2, 'Correct number of events fired with bind().')

          NGN.BUS.once('mature.queue', function () {
            t.pass('NGN.BUS.queue successfully executed a unique delayed event.')
            t.ok(matureValue === 3, 'NGN.BUS.queue triggered in the proper sequence.')
            t.end()
          })

          var matureValue = 0
          var ct = 0
          var queueInterval = setInterval(function () {
            NGN.BUS.queue('mature.queue', 700)
            if (ct > 2) {
              return clearInterval(queueInterval)
            }
            ct += 1
            matureValue += 1
          }, 125)
        }, 500)
      }
    })

    let bindtest = 0
    NGN.BUS.pool('b.', {
      '1': function (data) {
        t.pass('Bind test 1 recognized.')
        bindtest += 1
        t.ok(data.payload === 'test2', 'Bind test 1 passed.')
      },
      '2': function (data) {
        t.pass('Bind test 2 recognized.')
        bindtest += 1
        t.ok(data.payload === 'test2', 'Bind test 2 passed.')
      }
    })

    let fn = function (callback) {
      callback()
    }

    fn(NGN.BUS.attach('trigger'))
  })
})
