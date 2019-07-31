// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */
const modulePaths = require('./packager/modulePaths');
const resolve = require('path').resolve;
const fs = require('fs');

const platformRegex = /\.(android\.js|ios\.js)/g;
const modulesRegex = /\/(node_modules)/;

// This script will let the react native packager what modules to include
// in the main bundle and what modules to blacklist from the inline requires
// this modules are taken from the modulePaths.js file

const config = {
    transformer: {
        getTransformOptions: (entryFile, {platform}) => {
            console.log('BUILDING MODULES FOR', platform);
            const moduleMap = {};
            modulePaths.forEach((path) => {
                let realPath = path;
                if (platform && platformRegex.test(realPath)) {
                    realPath = path.replace(platformRegex, `.${platform}.js`);
                }

                let fsFile = realPath;
                if (path.match(modulesRegex).length > 1) {
                    fsFile = path.replace(modulesRegex, '');
                }

                if (fs.existsSync(fsFile)) {
                    moduleMap[resolve(realPath)] = true;
                }
            });

            return {
                preloadedModules: moduleMap,
                transform: {},
            };
        },
    },
};

module.exports = config;
