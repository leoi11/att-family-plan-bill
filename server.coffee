_ = require 'lodash'
bodyParser = require 'body-parser'
express = require 'express'
moment = require 'moment'
cors = require 'cors'
engine = require 'ejs-locals'
cp = require 'child_process'
fs = require 'fs'

app = express()

app.engine 'ejs', engine
app.set 'views', "#{__dirname}/views"
app.set 'view engine', 'ejs'


app.use bodyParser.json
  limit: 104900000

app.locals.TITLES =
  'smartphone': 'Line Base Charge'
  'iphone': 'Line Base Charge'
  'access': 'Line Discount'
  'international': 'International Roaming'
  'shared': 'Shared Plan Charges'
  'equipment': 'Equipment Charges'
  'surcharges': 'Surcharges & Fees'
  'sharedSurcharges': 'Shared Surcharges'
  'overage': 'Overage Charge'
  'government': 'Government Fees & Taxes'
  '30gb': 'Plan Base Charge'
  'national': 'Plan Discount'


bill = {}

app.use cors()

app.post '/bill', (req, res, next) ->
  tmpBill =
    plan: {}
    surcharges: {}
    updatedAt: moment().format('MM/DD/YY HH:mm:ss')
    lineCount: 0
    lines: {}
    overage: 0
  for number, detail of req.body
    tmpBill.lineCount += 1
    tmpBill.lines[number] = {}
    for title, amount of detail
      if title in ['surcharges', 'government', '30gb', 'national']
        tmpBill.plan[title] ||= 0
        tmpBill.plan[title] += amount
      else if title in ['data']
        tmpBill.overage += amount
      else if title in ['']
      else
        tmpBill.lines[number][title] = amount
  tmpBill.plan.total = _.sum _.values(tmpBill.plan)
  for number, line of tmpBill.lines
    line.shared = tmpBill.plan.total / tmpBill.lineCount
    line.total = _.sum _.values(line)

  bill = tmpBill
  res.status(200).end()

app.get '/', (req, res, next) ->
  try
    content = fs.readFileSync './data.json', 'utf8'
    data = JSON.parse(content)
  catch e
    return res.render 'loading'

  bill =
    plan: {}
    surcharges: {}
    updatedAt: moment().format('MM/DD/YY HH:mm:ss')
    lineCount: 0
    lines: {}
    overage: {amount: 0, total: 0, lines: {}}
  for number, detail of data.lines
    bill.lineCount += 1
    bill.lines[number] = {}
    for title, amount of detail
      if title in ['30gb', 'national']
        bill.plan[title] ||= 0
        bill.plan[title] += amount
      else if title in ['data']
        bill.overage.amount += amount
      else if title in ['surcharges', 'government']
        bill.surcharges[title] ||= 0
        bill.surcharges[title] += amount
      else
        bill.lines[number][title] = amount

  bill.surcharges.total = _.sum _.values(bill.surcharges)

  bill.plan.total = _.sum _.values(bill.plan)

  for number, usage of data.usages
    if usage > (30 / bill.lineCount)
      bill.overage.total += usage - (30 / bill.lineCount)
      bill.overage.lines[number] = usage - (30 / bill.lineCount)

  total = 0
  for number, line of bill.lines
    line.shared = bill.plan.total / bill.lineCount
    if bill.overage.lines[number]
      line.overage = bill.overage.amount * (bill.overage.lines[number] / bill.overage.total)
    line.total = _.sum _.values(line)
    total += line.total

  for number, line of bill.lines
    line.sharedSurcharges = bill.surcharges.total * (line.total / total)
    line.total = _.sum _.values(_.omit(line, 'total'))

  bill.total = _.sumBy _.values(bill.lines), 'total'

  res.render 'index', {bill}

app.get '/data', (req, res, next) ->
  try
    content = fs.readFileSync './data.json', 'utf8'
    data = JSON.parse(content)
    res.send data
  catch e
    res.send {status: 'not ready'}


app.get '/update', (req, res, next) ->
  try
    fs.unlinkSync './data.json'
  catch
    # Ignore
  cp.exec 'phantomjs phantom.js', (err) ->
    throw err if err
    console.log "Finish scraping"
  res.redirect '/'



app.listen 3500, ->
  console.log "Listening on port 3500"

