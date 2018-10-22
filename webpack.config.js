const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: {
        app: path.join(__dirname, 'app.js'),
    },
    target: 'node',
    mode: 'production',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js'
    },
    resolve: {
        modules: ['.', 'node_modules'],
        extensions: ['.js']
    },
    node: {
        console: true,
        global: true,
        process: true,
        Buffer: true,
        __filename: true,
        __dirname: true,
        setImmediate: true
    }
};
