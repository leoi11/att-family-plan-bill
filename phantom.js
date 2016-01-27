var webpage = require('webpage');
var page = webpage.create();

var loading = false;
var loadJQ = false;

var config = require('./config');

page.onLoadStarted = function() {
  loading = true;
  loadJQ = true;
};

page.onLoadFinished = function() {
  loading = false;
};

var index = 0;

var data = {};

var steps = [
  function() {
    page.open("https://www.att.com");
  },
  function() {
    page.evaluate(function(user, password){
      $('form#ssoLoginForm input#userid').val(user);
      $('form#ssoLoginForm input#userPassword').val(password);
    }, config.user, config.password);
  },
  function() {
    page.evaluate(function() {
      $('form#ssoLoginForm').submit();
    });
  },
  function() {
    var result = page.evaluate(function() {
      return document.querySelector("form input#passcode0");
    });
    if (!result) {
      index--;
    } else {
      page.evaluate(function(passcode) {
        $('form input#passcode0').val(passcode);
      }, config.passcode);
    }
  },
  function() {
    page.evaluate(function() {
      $('.btnRt .button.small.primary').click()
    })
  },
  function() {
    page.open("https://www.att.com/olam/passthroughAction.myworld?actionType=ViewBillDetails");
  },
  function() {
    var result = page.evaluate(function() {
      return $(".bPOD-bill-title.PadBot3imp.MarTop10:nth(1)");
    });
    if (!result) {
      index--;
    } else {
      data.lines = page.evaluate(function() {
        var SUBTITLE_REGEX, bill, number, numberTitle, ref, ref1, ref2, subGroup;
        bill = {};
        SUBTITLE_REGEX = /(Monthly|Surcharges|Government|Data|Equipment|International|Smartphone|iPhone|30GB|National|Access)/;
        numberTitle = $('.bPOD-bill-title.PadBot3imp.MarTop10:nth(1)').next();
        while (numberTitle) {
          number = (ref = numberTitle.find('a')) != null ? (ref1 = ref.text()) != null ? (ref2 = ref1.match(/(WENGCHEONG SIN )([0-9\-]+)/)) != null ? ref2[2] : void 0 : void 0 : void 0;
          if (!number) {
            break;
          }
          subGroup = numberTitle.next();
          bill[number] = {};
          subGroup.find('.sub-group-title').each(function(index, elem) {
            var ref3, title;
            title = (ref3 = $(elem).find('a').text().match(SUBTITLE_REGEX)) != null ? ref3[1].toLowerCase() : void 0;
            if (title === 'monthly') {
              return $(elem).next().find('.botDotBorder, .BotSolidBorder').each(function(index, elem) {
                var ref4;
                title = (ref4 = $(elem).find('.accRow:nth(0)').text().match(SUBTITLE_REGEX)) != null ? ref4[1].toLowerCase() : void 0;
                return bill[number][title] = parseFloat($(elem).find('.accRow:nth(1)').text().replace(/( |\$|\n|\t)/g, '').replace(/−/g, '-'));
              });
            } else {
              return bill[number][title] = parseFloat($(elem).find('.flipper').text().replace(/( |\$|\n|\t)/g, '').replace(/−/g, '-'));
            }
          });
          numberTitle = subGroup.next();
        }
        return bill;
      });
    }
  },
  function() {
    page.open("https://www.att.com/olam/billUsageTiles.myworld");
  },
  function() {
    var result = page.evaluate(function() {
      return $('#usageTableToggleId tbody tr');
    });
    if (!result) {
      index--;
    } else {
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


setInterval(function() {
  if (!loading && steps[index]) {
    if (loadJQ) {
      page.injectJs("jquery-1.12.0.min.js")
      loadJQ = false;
    }
    steps[index]();
    index++;
  }
  if (!steps[index]) {
    var fs = require('fs');
    fs.write('data.json', JSON.stringify(data, null, 2), 'w');
    phantom.exit();
  }
}, 2000);
