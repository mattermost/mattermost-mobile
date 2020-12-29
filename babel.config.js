// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
module.exports = {
    presets: [
        'module:metro-react-native-babel-preset',
        '@babel/preset-typescript',
        ['@babel/preset-env', {targets: {node: 'current'}}],
    ],
    env: {
        production: {
            plugins: ['transform-remove-console'],
        },
    },
    plugins: [
        ['@babel/plugin-proposal-decorators', {legacy: true}],
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-transform-runtime',
        ['module-resolver', {
            root: ['.'],
            alias: {
                '@actions': './app/actions',
                '@assets': './dist/assets',
                '@components': './app/components',
                '@constants': './app/constants',
                '@i18n': './app/i18n',
                '@init': './app/init',
                '@notifications': './app/notifications',
                '@screens': './app/screens',
                '@selectors': './app/selectors',
                '@share': './share_extension',
                '@store': './app/store',
                '@telemetry': './app/telemetry',
                '@typings': './types',
                '@utils': './app/utils',
                '@websocket': './app/client/websocket',
            },
        }],
        ['module:react-native-dotenv', {
            moduleName: '@env',
            path: '.env',
            blacklist: null,
            whitelist: null,
            safe: false,
            allowUndefined: true,
        }],
    ],
    exclude: ['**/*.png', '**/*.jpg', '**/*.gif'],
};
