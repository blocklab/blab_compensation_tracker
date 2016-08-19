function TimeSpent(members, timespentSubmitterId) {
  this._verificationCount = 0;
  this._timespentSubmitterId = timespentSubmitterId;
  this._isValid = false;
  this._verfiers = [];

  this.verify = function(verifierId) {
    if (notTryingToSelfValidate.call(this, verifierId)) {
      if (hasNotVerifiedYet.call(this, verifierId)) {
        this._verfiers.push(verifierId);
        this._verificationCount++;
        if (enoughValidationsReached.call(this)) {
          this._isValid = true;
        }
      }
    }
  };

  this.isValid = function() {
    return this._isValid;
  };

  function notTryingToSelfValidate(verifierId) {
    return this._timespentSubmitterId !== verifierId;
  }

  function hasNotVerifiedYet(verifierId) {
    return this._verfiers.indexOf(verifierId) === -1;
  }

  function enoughValidationsReached() {
    return this._verificationCount === members.requiredMajority();
  }

}

module.exports = TimeSpent;