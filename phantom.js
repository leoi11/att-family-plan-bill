var webpage = require('webpage');
var page = webpage.create();

// Global loading flog
var loading = false;
// Global load jquery flag
var loadJQ = false;

// Credentials file
var config = require('./config');

page.onLoadStarted = function() {
  loading = true;
  loadJQ = true;
};

page.onLoadFinished = function() {
  loading = false;
};

// Step index
var index = 0;

var data = {};

var steps = [
  function() {
    page.open("https://www.att.com");
  },
  function() {
    // Enter credentials
    page.evaluate(function(user, password){
      $('form#ssoLoginForm input#userid').val(user);
      $('form#ssoLoginForm input#userPassword').val(password);
    }, config.user, config.password);
  },
  function() {
    // Enter login
    page.evaluate(function() {
      $('form#ssoLoginForm').submit();
    });
  },
  function() {
    // Hack to wait for passcode field to appear
    var result = page.evaluate(function() {
      return document.querySelector("form input#passcode0");
    });
    if (!result) {
      index--;
    } else {
      // Enter passcode
      page.evaluate(function(passcode) {
        $('form input#passcode0').val(passcode);
      }, config.passcode);
    }
  },
  function() {
    // Login
    page.evaluate(function() {
      $('.btnRt .button.small.primary').click()
    })
  },
  function() {
    // Go to bill detail page
    page.open("https://www.att.com/olam/passthroughAction.myworld?actionType=ViewBillDetails");
  },
  function() {
    // Hack to wait for report
    var result = page.evaluate(function() {
      return $(".bPOD-bill-title.PadBot3imp.MarTop10:nth(1)");
    });
    if (!result) {
      index--;
    } else {
      // Following code is compiled from coffeescript, may be confusing
      data.lines = page.evaluate(function() {
        var SUBTITLE_REGEX, bill, number, numberTitle, ref, ref1, ref2, subGroup;
        bill = {};
        // Regex for matching item title
        SUBTITLE_REGEX = /(Monthly|Surcharges|Government|Data|Equipment|International|Smartphone|iPhone|30GB|National|Access)/;
        // Div containing the line number
        numberTitle = $('.bPOD-bill-title.PadBot3imp.MarTop10:nth(1)').next();
        // Srapge until it cannot find the line number div
        while (numberTitle) {
          // Scrape the line number
          number = (ref = numberTitle.find('a')) != null ? (ref1 = ref.text()) != null ? (ref2 = ref1.match(/([A-Z -]+)([0-9\-]+)/)) != null ? ref2[2] : void 0 : void 0 : void 0;
          if (!number) {
            break;
          }
          // Bill table for the line
          subGroup = numberTitle.next();
          bill[number] = {};
          subGroup.find('.sub-group-title').each(function(index, elem) {
            var ref3, title;
            title = (ref3 = $(elem).find('a').text().match(SUBTITLE_REGEX)) != null ? ref3[1].toLowerCase() : void 0;
            if (title === 'monthly') {
              // Go into details of monthly charges
              return $(elem).next().find('.botDotBorder, .BotSolidBorder').each(function(index, elem) {
                var ref4;
                title = (ref4 = $(elem).find('.accRow:nth(0)').text().match(SUBTITLE_REGEX)) != null ? ref4[1].toLowerCase() : void 0;
                return bill[number][title] = parseFloat($(elem).find('.accRow:nth(1)').text().replace(/( |\$|\n|\t)/g, '').replace(/−/g, '-'));
              });
            } else {
              // Otherwise just save the amount with title
              return bill[number][title] = parseFloat($(elem).find('.flipper').text().replace(/( |\$|\n|\t)/g, '').replace(/−/g, '-'));
            }
          });
          // Scrape next line
          numberTitle = subGroup.next();
        }
        return bill;
      });
    }
  },
  function() {
    // Go to usage detail page
    page.open("https://www.att.com/olam/billUsageTiles.myworld");
  },
  function() {
    // Hack again
    var result = page.evaluate(function() {
      return $('#usageTableToggleId tbody tr');
    });
    if (!result) {
      index--;
    } else {
      // Scrape usages
      data.usages = page.evaluate(function() {
        var usages;
        usages = {};
        $('#usageTableToggleId tbody tr').each(function(index, elem) {
          var number, usage;
          number = $(elem).find('td:nth(0) span').text().replace(/(\n| |\t)/g, '').replace(/\./g, '-');
          usage = parseFloat($(elem).find('td:nth(1) a span strong').text());
          return usages[number] = usage;
        });
        return usages;
      });
    }
  }
]


// Steps iterator with 2s interval
setInterval(function() {
  // Only proceed to next step when page is fully loaded, otherwise, wait for next iteration
  if (!loading && steps[index]) {
    if (loadJQ) {
      // Inject jquery for scraping if it hasn't been injected yet
      page.injectJs("jquery-1.12.0.min.js")
      loadJQ = false;
    }
    steps[index]();
    index++;
  }
  // Finshed
  if (!steps[index]) {
    var fs = require('fs');
    // Write data to data.json
    fs.write('data.json', JSON.stringify(data, null, 2), 'w');
    phantom.exit();
  }
}, 2000);
