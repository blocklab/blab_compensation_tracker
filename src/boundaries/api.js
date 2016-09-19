var members = require('../stubs/fake_members');
var Reports = require('../model/reports');
var UserReport = require('../model/user_report');
var UserChosenReportContents = require('../model/user_chosen_report_contents');
var Report = require('../model/report');
var ReportVerification = require('../actions/report_verification');

var toJSONAPI = require('./to_jsonapi');

var express = require('express');
var jwt = require('express-jwt');
var tokenSecret = require('../security/tokensecret');
var tokenProvider = require('../security/token_provider');

var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json({
  type: 'application/vnd.api+json'
}));

var useTokenInAuthorizationHeader = function fromHeader (req) {
  var authorizationHeader = req.get('Authorization');
  if (authorizationHeader) {
    return authorizationHeader.substring(7);
  } else {
    return null;
  }
};

var extractMemberIdFromAccessingUser = function(req) {
  return members.memberByMail(tokenProvider.verifiedContent(extractToken(req)).identification).id;
};

var AUTHORIZATION_PATH = '/auth';
app.use(jwt(
  {
    secret: tokenSecret.get(),
    getToken: useTokenInAuthorizationHeader
  }
).unless({path: [AUTHORIZATION_PATH]}));

app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send('invalid token...');
  }
});

var reports = new Reports();
var verification = new ReportVerification(members, reports);

app.post(AUTHORIZATION_PATH, function(req, res) {
  var mail = req.body.username;
  var member = members.memberByMail(mail);
  if (member.passwordMatches(req.body.password)) {
    res.send({
      token: tokenProvider.sign(
        {
          identification: mail,
          id: member.id
        }
      )
    });
  } else {
    res.sendStatus(401);
  }
});

app.get('/members', function(req, res) {
  res.send(toJSONAPI.members(members.members));
});

app.post('/reports', function(req, res) {
  var id = extractMemberIdFromAccessingUser(req);
  var data = req.body.data;
  try {
    var r = new UserChosenReportContents(data.attributes.input, data.attributes.output, data.attributes['created-on']);
    var userReport = new UserReport(r, id);
    var report = reports.add(new Report(userReport.hash(), id, r));
    res.send(toJSONAPI.report(report));
  } catch(err) {
    req.body.errors = [
      {
        'status': 422,
        'title': 'Invalid Attribute',
        'source': {
          'pointer': 'data/attributes/input'
        },
        'detail': err.message
      }
    ];
    res.status(422)
      .send(req.body);
  }
});

app.get('/verifications/:member_id', function(req, res) {
  var member = {id: req.params.member_id};
  res.send(toJSONAPI.member(member));
});

app.post('/verifications', function(req, res) {
  var data = req.body.data;
  var memberId = extractMemberIdFromAccessingUser(req);
  var reportId = data.relationships.report.data.id;
  verification.verify(memberId, reportId);
  req.body.data.relationships.member = {
    data: {
      type: 'members',
      id: memberId
    }
  };
  res.send(req.body);
});

app.get('/reports/:report_id', function(req, res) {
  res.send(toJSONAPI.report(reports.fetch(req.params.report_id)));
});

app.get('/reports', function(req, res) {
  res.send(toJSONAPI.reports(reports.all()));
});

app.get('/verified', function(req, res) {
  res.send(reports.verified());
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});