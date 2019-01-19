var should = require("should");
var shell = require('shelljs');
var path = require("path");
var dnr = require("../../red/runtime/dnr")

describe("dnr node installation", function() {
  it('installs only the node definition without resolving dependencies and rebuild ', function(done) {
		var installingModule = "node-red-contrib-audio";
		var userDir = path.join(__dirname, "dnr-editor-test");

		shell.rm('-rf', userDir);
		shell.mkdir(userDir);
		shell.cd(userDir);
		shell.exec('npm init -y');

		dnr.dnrModuleInstall(installingModule, userDir, (err, stdout, stderr) => {
			should.equal(err, null);
			should.equal(stdout, 'Installation succeed');
			
			installationSucceed(installingModule, userDir);
			done(err);
		});
	});
	
	it('installs module package with weird tarball folder name', function(done) {
		var installingModule = "node-red-contrib-msg-speed";
		var userDir = path.join(__dirname, "dnr-editor-test");

		shell.rm('-rf', userDir);
		shell.mkdir(userDir);
		shell.cd(userDir);
		shell.exec('npm init -y');

		dnr.dnrModuleInstall(installingModule, userDir, (err, stdout, stderr) => {
			should.equal(err, null);
			should.equal(stdout, 'Installation succeed');
			
			installationSucceed(installingModule, userDir);
			done(err);
		});
  });
});

function installationSucceed(installingModule, userDir){
	shell.cd(userDir);
	shell.ls().some(file => file === "node_modules").should.be.true();
	should.equal(shell.ls('node_modules').length, 1);
	should.equal(shell.ls('node_modules')[0], installingModule);
	should.notEqual(shell.cat('package.json').indexOf(installingModule), -1);
}




