var path = require('path');

module.exports = {
  mode: 'development',
  entry: './node_modules/graphql/index.js',
  devtool: 'none',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'graphql.js'
  }
};
