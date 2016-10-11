const Browser = require('zombie');

// We're going to make requests to http://example.com/signup
// Which will be routed to our test server localhost:3000
Browser.localhost('localhost', 1818);

describe('DNR Editor', function() {

	this.timeout(5000);

  const browser = new Browser();

  before(function() {
    return browser.visit('/');
  });

  describe('supports constraints', function() {

    it('should be successful', function(done) {
      browser.assert.element('#btn-constraints');
      done();
    });

    // it('should see welcome page', function() {
    //   browser.assert.text('title', 'Welcome To Brains Depot');
    // });
  });
});