process.env.PORT = '3101'

const { createApp } = require('../server/index.js')

createApp().listen(3101, '127.0.0.1', () => {
  console.log('Smoke-test API listening on http://127.0.0.1:3101')
})
