/* global cmd */
var cli = require('optimist'),
  p = require('path'),
  wrapwidth = 60,
  wrap = require('wordwrap')(wrapwidth);
require('colors');

var argv = cli
  .usage('Usage: ngn help <command>')
  .describe('command'.bold, 'Specify a command to view it\'s help. For example,\n' + 'ngn help install'.blue.bold + ' or ' + 'ngn help init'.blue.bold + '.')
  .check(function (argv) {
    if (argv.help === true) {
      throw ('');
    }
  })
  .argv;

cmd = argv.help || argv.h;

switch (cmd) {
case 'configure':
  console.log('The configuration wizard asks the following questions:\n');
  var data = [{
    q: 'Server Name',
    c: 'This is the descriptive name/title of this server. This should be unique within a group of servers.',
    d: 'Untitled'
    }, {
    q: 'Server Description',
    c: 'This is a description of this server, typically used to help identify the use, location, or other metadata useful to an administrator.',
    d: 'NGN Server <v>'
    }, {
    q: 'Service Bus Port',
    c: 'The port on which the NGN Manager backround service runs. Processes and applications connect to this port, making the applications accessible to the NGN Shell.',
    d: '55555'
    }, {
    q: 'Admin Email',
    c: 'The primary NGN administrator. It is recommended to use an email address, but this is not required. However; this value is used to send alerts to the administrator.',
    d: 'admin@localhost'
    }, {
    q: 'Admin Password',
    c: 'The plain text password used by the administrator to access NGN. This value is automatically encrypted using strong encryption.',
    d: ''
    }, {
    q: 'Enable Process Security',
    c: 'NGN processes/applications can register themselves with the NGN Manager. Enabling security requires processes to send an encrypted secret when it connects. Failed attempts will not stop the process from running, but it will not be registered with the NGN Manager.',
    d: 'Y(es)'
    }, {
    q: 'Process Secret',
    c: 'The shared secret (automatically encrypted) used for process security. This can be autogenerated & saved in plain text on the server (not with the client process).',
    d: 'auto'
    }];

  data.forEach(function (v) {
    if (v.q !== data[0].q) {
      var s = '';
      for (var i = 0; i < wrapwidth; i++) {
        s += '-';
      }
      //console.log('\n'+s+'\n');
      console.log('');
    }
    console.log(v.q.cyan.bold + ' ' + (v.d.trim().length > 0 ? ('[Default: ' + v.d.bold + ']').blue.underline : ''));
    console.log(wrap(v.c));
  });

  break;
case 'help':
  console.log('You\'re looking at it.');
  break;
case 'init':
  console.log('Prepare a directory to use NGN via:\n\n' + '  ngn init'.yellow + '\n');
  var str = wrap(
    'Running this command in a project directory will make the NGN ' + 'namespace accessible to node scripts in that directory. These ' + 'files need to require NGN, i.e.\n'
  );
  console.log(str);
  console.log('  require(\'ngn\');\n  console.log(NGN);\n'.cyan);
  break;
case 'add':
  console.log('Add support for a specific feature using:\n\n' + '  ngn add <feature|group>'.yellow + '\n');
  console.log('Features can be added one at a time or in bulk.');
  console.log('\nFEATURES'.underline);
  var d = require(p.join(__dirname, '..', '..', 'package.json')).ngn;
  console.log(wrap(Object.keys(d.modules).sort().join(', ')).bold.cyan);
  console.log('\nGROUPS'.underline + ' (Bulk Add)'.grey);
  d.groups.all = '';
  console.log(wrap(Object.keys(d.groups).sort().join(', ')).bold.magenta);
  break;
case 'remove':
  console.log('Removes support for a specific feature using:\n\n' + '  ngn remove <feature|group>'.red.bold + '\n');
  console.log('Features can be removed one at a time or in bulk.');
  console.log('\nFEATURES'.underline);
  var d = require(p.join(__dirname, '..', '..', 'package.json')).ngn;
  console.log(wrap(Object.keys(d.modules).sort().join(', ')).bold.cyan);
  console.log('\nGROUPS'.underline + ' (Bulk Add)'.grey);
  d.groups.all = '';
  console.log(wrap(Object.keys(d.groups).sort().join(', ')).bold.magenta);
  break;
case 'uninstall':
  console.log('Removes all of the NGN features and NGN itself.');
  break;
case 'shell':
  console.log('The shell is launched using the command: ' + 'ngn shell'.bold + '.');
  console.log('');
  console.log(wrap('The NGN shell provides shell accesss to the NGN Manager service. With this utility, it is possible to manage processes, datasources, servers, configurations, and other features of NGN.'));
  console.log(wrap('\nRunning the shell requires NGN ' + 'administrator privileges'.bold + ', as defined in th configuration. Once authenticated, the shell will connect to the local running instance of NGN Manager.'));
  console.log('\nThe shell has it\'s own help system.'.bold);
  break;
case 'start':
  console.log('Start is not implemented yet.');
  break;
case 'stop':
  console.log('Stop is not implemented yet.');
  break;
case 'version':
  console.log('Typing ' + 'ngn version'.bold + ' outputs the version of NGN running on this computer.');
  break;
default:
  console.log('*' + (cmd.toString()).bold + '* is not a recognized command.');
  cli.usage();
  break;
}
