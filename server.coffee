_ = require 'lodash'
bodyParser = require 'body-parser'
express = require 'express'
moment = require 'moment'
engine = require 'ejs-locals'
cp = require 'child_process'
fs = require 'fs'

app = express()

app.engine 'ejs', engine
app.set 'views', "#{__dirname}/views"
app.set 'view engine', 'ejs'


app.use bodyParser.json
  limit: 104900000

# Prettify item title
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

app.get '/', (req, res, next) ->
  try
    content = fs.readFileSync './data.json', 'utf8'
    data = JSON.parse(content)
  catch e
    # Render loading page if data.json not exist
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
        # Add to plan charges
        bill.plan[title] ||= 0
        bill.plan[title] += amount
      else if title in ['data']
        # Add to overage chrages
        bill.overage.amount += amount
      else if title in ['surcharges', 'government']
        # Add to surcharges
        bill.surcharges[title] ||= 0
        bill.surcharges[title] += amount
      else
        # Line's charges
        bill.lines[number][title] = amount

  # Compute total of surcharges and plan charges
  bill.surcharges.total = _.sum _.values(bill.surcharges)

  bill.plan.total = _.sum _.values(bill.plan)

  # Compute overage usages
  for number, usage of data.usages
    if usage > (30 / bill.lineCount) # Over average usage
      bill.overage.total += usage - (30 / bill.lineCount)
      bill.overage.lines[number] = usage - (30 / bill.lineCount)

  total = 0
  # Distribute overage charges
  for number, line of bill.lines
    line.shared = bill.plan.total / bill.lineCount
    if bill.overage.lines[number]
      line.overage = bill.overage.amount * (bill.overage.lines[number] / bill.overage.total)
    # Calculate tmp total for distributing surcharges
    line.total = _.sum _.values(line)
    total += line.total

  # Distribute surcharges
  for number, line of bill.lines
    line.sharedSurcharges = bill.surcharges.total * (line.total / total)
    line.total = _.sum _.values(_.omit(line, 'total'))

  # Compute grand total for sanity check
  bill.total = _.sumBy _.values(bill.lines), 'total'

  # Render report page
  res.render 'index', {bill}

app.get '/data', (req, res, next) ->
  try
    content = fs.readFileSync './data.json', 'utf8'
    data = JSON.parse(content)
    res.send data
  catch e
    res.send {status: 'not ready'}

app.post '/data', (req, res, next) ->
  fs.writeFileSync './data.json', JSON.stringify(req.body, null, 2)
  res.status(200).end()


app.get '/update', (req, res, next) ->
  try
    # Delete data.json
    fs.unlinkSync './data.json'
  catch
    # Ignore error for file not exists
  # Start scraping script
  cp.exec 'phantomjs phantom.js', (err) ->
    throw err if err
    console.log "Finish scraping"
  # Redirect for a loading page
  res.redirect '/'



app.listen 3500, ->
  console.log "Listening on port 3500"

