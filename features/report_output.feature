Feature: Report achieved output
  In order to receive compensation
  As a member
  I want to report the output i have achieved

  Scenario: Reporting achieved output
    Given an input of 3 hours which achieved output of "something" on date "1473526945806" by member 1
    When fetching a list of unverified reports
    Then the list consists of the report "8019080947503e42c0e9e1747dabf838801f5775a26c0f00ed057cc9c08dc008" by member 1