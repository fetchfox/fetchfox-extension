// Do this as the first thing so that any code reading it knows the right env.
require('dotenv').config();

console.log('process.env.SENTRY_AUTH_TOKEN', process.env.SENTRY_AUTH_TOKEN);
throw 'x';

process.env.BABEL_ENV = process.env.NODE_ENV || 'production';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.ASSET_PATH = '/';

if (process.env.NODE_ENV == 'dev') {
  require('dotenv').config({ path: `.env.dev` });
} else {
  require('dotenv').config({ path: `.env.production` });
}


var webpack = require('webpack'),
  path = require('path'),
  fs = require('fs'),
  config = require('../webpack.config'),
  ZipPlugin = require('zip-webpack-plugin');

delete config.chromeExtensionBoilerplate;

config.mode = 'production';

var packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

config.plugins = (config.plugins || []).concat(
  new ZipPlugin({
    filename: `${packageInfo.name}-${packageInfo.version}.zip`,
    path: path.join(__dirname, '../', 'zip'),
  })
);

webpack(config, function (err) {
  if (err) throw err;
});
