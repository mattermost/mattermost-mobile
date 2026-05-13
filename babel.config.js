// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
module.exports = {
    presets: [
        ['@babel/preset-env', {targets: {node: 'current'}}],
        'babel-preset-expo',
        '@babel/preset-typescript',
    ],
    plugins: [
        '@babel/plugin-transform-runtime',
        ['@babel/plugin-proposal-decorators', {legacy: true}],
        ['@babel/plugin-transform-flow-strip-types'],
        ['@babel/plugin-transform-class-properties', {loose: true}],
        '@babel/plugin-transform-class-static-block',
        ['module-resolver', {
            root: ['.'],
            alias: {
                '@actions': './app/actions',
                '@agents': './app/products/agents',
                '@assets': './dist/assets/',
                '@calls': './app/products/calls',
                '@client': './app/client',
                '@components': './app/components',
                '@constants': './app/constants',
                '@context': './app/context',
                '@database': './app/database',
                '@helpers': './app/helpers',
                '@hooks': './app/hooks',
                '@i18n': './app/i18n',
                '@init': './app/init',
                '@keyboard': './app/keyboard',
                '@managers': './app/managers',
                '@playbooks': './app/products/playbooks',
                '@queries': './app/queries',
                '@routes': './app/routes',
                '@screens': './app/screens',
                '@share': './share_extension',
                '@store': './app/store',
                '@telemetry': './app/telemetry',
                '@test': './test',
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
        'react-native-worklets/plugin',
    ],
    exclude: ['**/*.png', '**/*.jpg', '**/*.gif'],
    overrides: [
        {
            include: ['./app/**', './test/**', './share_extension/**'],

            // formatjs plugin is for build-time i18n message extraction only.
            // It rejects dynamic message IDs (e.g. error.intl.id) which appear
            // in production code that is not itself a message definition.
            // Jest sets NODE_ENV=test, so the plugin is skipped during test runs.
            env: {
                production: {plugins: [['formatjs', {idInterpolationPattern: '[sha512:contenthash:base64:6]', ast: true}]]},
                development: {plugins: [['formatjs', {idInterpolationPattern: '[sha512:contenthash:base64:6]', ast: true}]]},
            },
        },
    ],
};
