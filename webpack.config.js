const path = require('path');

module.exports = {
    mode: 'development',
    entry: {
        app: './js/bridge.js',
    },
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './',
        publicPath: '/dist/',
        liveReload: false,
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
