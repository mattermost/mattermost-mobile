// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

// Setup recommendation from the following blog:
// https://blog.addjam.com/testing-react-native-with-mocha-and-enzyme-6b77cd9e52a1#.2awpwqwwb

/* eslint-disable */

import fs from 'fs';
import path from 'path';
import register from 'babel-core/register';
import chai from 'chai';
import chaiEnzyme from 'chai-enzyme';

const m = require('module');
const originalLoader = m._load;

// Image file ignore setup from:
// http://valuemotive.com/2016/08/01/unit-testing-react-native-components-with-mocha-and-enzyme/
m._load = function hookedLoader(request, parent, isMain) {
    if (request.match(/.jpeg|.jpg|.png$/)) {
        return {uri: request};
    }

    return originalLoader(request, parent, isMain);
};

// Ignore all node_modules except these
const modulesToCompile = [
    'react-native',
    'react-native-mock',
    'react-native-svg-mock/mock',
    'react-native-vector-icons',
    'react-native-svg'
].map((moduleName) => new RegExp(`/node_modules/${moduleName}`));

const rcPath = path.join(__dirname, '..', '.babelrc');
const source = fs.readFileSync(rcPath).toString();
const config = JSON.parse(source);
config.ignore = function(filename) {
    if (!(/\/node_modules\//).test(filename)) {
        return false;
    }

    const matches = modulesToCompile.filter((regex) => regex.test(filename));
    const shouldIgnore = matches.length === 0;
    return shouldIgnore;
};

register(config);

chai.use(chaiEnzyme());
