// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
const path = require('path');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appDirectory = path.resolve(__dirname);
const {presets} = require(`${appDirectory}/babel.config.js`);

const compileNodeModules = [

    // Add every react-native package that needs compiling
    '@babel/runtime',
    '@react-native-community/async-storage',
    '@react-native-community/cameraroll',
    '@react-native-community/clipboard',
    '@react-native-community/masked-view',
    '@react-native-community/netinfo',
    '@react-navigation/native',
    '@react-navigation/stack',
    '@rudderstack/rudder-sdk-react-native',
    '@sentry/react-native',
    'analytics-react-native',
    'commonmark',
    'commonmark-react-renderer',
    'core-js',
    'deep-equal',
    'deepmerge',
    'emoji-regex',
    'form-data',
    'fuse.js',
    'intl',
    'jail-monkey',
    'mime-db',
    'moment-timezone',
    'prop-types',
    'react',
    'react-intl',
    'react-native',
    'react-native-android-open-settings',
    'react-native-animatable',
    'react-native-button',
    'react-native-calendars',
    'react-native-cookies',
    'react-native-device-info',
    'react-native-document-picker',
    'react-native-elements',
    'react-native-exception-handler',
    'react-native-fast-image',
    'react-native-file-viewer',
    'react-native-gesture-handler',
    'react-native-haptic-feedback',
    'react-native-hw-keyboard-event',
    'react-native-image-picker',
    'react-native-keyboard-aware-scrollview',
    'react-native-keyboard-tracking-view',
    'react-native-keychain',
    'react-native-linear-gradient',
    'react-native-local-auth',
    'react-native-localize',
    'react-native-mmkv-storage',
    'react-native-navigation',
    'react-native-notifications',
    'react-native-passcode-status',
    'react-native-permissions',
    'react-native-reanimated',
    'react-native-redash',
    'react-native-safe-area',
    'react-native-safe-area-context',
    'react-native-screens',
    'react-native-section-list-get-item-layout',
    'react-native-share',
    'react-native-slider',
    'react-native-status-bar-size',
    'react-native-svg',
    'react-native-vector-icons',
    'react-native-video',
    'react-native-web',
    'react-native-webview',
    'react-native-youtube',
    'react-redux',
    'redux',
    'redux-action-buffer',
    'redux-batched-actions',
    'redux-persist',
    'redux-persist-transform-filter',
    'redux-thunk',
    'reselect',
    'rn-fetch-blob',
    'rn-placeholder',
    'semver',
    'serialize-error',
    'shallow-equals',
    'tinycolor2',
    'url-parse',
].map((moduleName) => path.resolve(appDirectory, `node_modules/${moduleName}`));

const babelLoaderConfiguration = {
    test: /\.(js|tsx|ts)$/,

    // Add every directory that needs to be compiled by Babel during the build.
    include: [
        path.resolve(__dirname, 'index.web.js'), // Entry to your application
        path.resolve(__dirname, 'app'),
        path.resolve(__dirname, 'assets'),
        path.resolve(__dirname, 'share_extension'),
        path.resolve(__dirname, 'mattermost.js'), // Change this to your main App file
        ...compileNodeModules,
    ],
    use: {
        loader: 'babel-loader',
        options: {
            cacheDirectory: true,
            presets,
            plugins: ['react-native-web'],
        },
    },
};

const svgLoaderConfiguration = {
    test: /\.svg$/,
    use: [
        {
            loader: '@svgr/webpack',
        },
    ],
};

const imageLoaderConfiguration = {
    test: /\.(gif|jpe?g|png)$/,
    use: {
        loader: 'url-loader',
        options: {
            name: '[name].[ext]',
        },
    },
};

module.exports = {
    entry: {
        app: path.join(__dirname, 'index.web.js'),
    },
    output: {
        path: path.resolve(appDirectory, 'dist'),
        publicPath: '/',
        filename: 'mattermost.bundle.js',
    },
    resolve: {
        extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.json'],
        alias: {
            'react-native$': 'react-native-web',
            'react-native-video$': 'react-native-web-video',
            './KeyboardTrackingView$': './KeyboardTrackingView.android',
            './src/KeyboardTrackingView$': './src/KeyboardTrackingView.android',
            './LocalAuth$': './LocalAuth.android',
        },
    },
    module: {
        rules: [
            babelLoaderConfiguration,
            imageLoaderConfiguration,
            svgLoaderConfiguration,
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'index.html'),
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.DefinePlugin({

            // See: https://github.com/necolas/react-native-web/issues/349
            __DEV__: JSON.stringify(true),
        }),
    ],
};

