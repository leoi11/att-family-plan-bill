request = require 'request'

data = require './data.json'

request.post 'http://52.26.219.233:3500/data', {json: true, body: data}, (err, res, body) ->
  throw err if err
  if res.statusCode != 200
    throw body
  console.log 'Done'

