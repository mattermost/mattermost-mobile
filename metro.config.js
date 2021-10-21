// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const {getDefaultConfig} = require('metro-config');

module.exports = (async () => {
    const {
        resolver: {sourceExts, assetExts},
    } = await getDefaultConfig();
    return {
        transformer: {
            babelTransformerPath: require.resolve('react-native-svg-transformer'),
            getTransformOptions: async () => ({
                transform: {
                    experimentalImportSupport: false,
                    inlineRequires: true,
                },
            }),
        },
        resolver: {
            assetExts: assetExts.filter((ext) => ext !== 'svg'),
            sourceExts: [...sourceExts, 'svg'],
        },
    };
})();
