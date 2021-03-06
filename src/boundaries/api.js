var members = require('../stubs/fake_members');
var Reports = require('../model/reports');
var UserReport = require('../model/user_report');
var UserChosenReportContents = require('../model/user_chosen_report_contents');
var Report = require('../model/report');
var ReportVerification = require('../actions/report_verification');
var InvalidAttribute = require('./errors/invalid_attribute');
var RequestWrapper = require('./wrapper/request_wrapper');

var toJSONAPI = require('./to_jsonapi');

var express = require('express');

var readToken = require('../security/read_token');
var authApi = require('./auth_api');

var bodyParser = require('body-parser');
var app = express();

var extractMemberIdFromAccessingUser = function(req) {
  return readToken.idFromRequest(new RequestWrapper(req));
};

var reports = new Reports();
var verification = new ReportVerification(members, reports);

app.use(bodyParser.json({
  type: 'application/vnd.api+json'
}));

app = authApi.setup(app);
app.get('/members', function(req, res) {
  res.send(toJSONAPI.members(members.members));
});

app.patch('/reports/:report_id', function(req, res) {
  var report = reports.fetch(req.params.report_id);
  report.publish();
  res.send(toJSONAPI.report(report));
});

app.post('/reports', function(req, res) {
  var memberId = extractMemberIdFromAccessingUser(req);
  var data = req.body.data;
  try {
    var userChosenReportContents = new UserChosenReportContents(data.attributes.input, data.attributes.output, data.attributes['created-on']);
    var userReport = new UserReport(userChosenReportContents, memberId);
    var report = reports.add(new Report(userReport.hash(), memberId, userChosenReportContents));
    res.send(toJSONAPI.report(report));
  } catch(err) {
    req.body.errors = new InvalidAttribute('input', err.message).value();
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
  if (req.query.filter.published === 'false') {
    var memberId = extractMemberIdFromAccessingUser(req);
    res.send(toJSONAPI.reports(reports.unpublishedFor(memberId)))
  } else {
    res.send(toJSONAPI.reports(reports.allPublished()));
  }
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});