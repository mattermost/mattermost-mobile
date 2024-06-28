// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env */
/* eslint-disable no-console */
const fs = require('fs');
const deviceType = process.env.DETOX_DEVICE_TYPE || 'iPhone 15 Pro';
const deviceOS = process.env.DETOX_DEVICE_OS || 'iOS 17.4';
const detoxConfigTemplate = fs.readFileSync('../.detoxrc.json', 'utf8');
const detoxConfig = detoxConfigTemplate.replace('__DEVICE_TYPE__', deviceType).replace('__DEVICE_OS__', deviceOS);

fs.writeFileSync('../.detoxrc.json', detoxConfig);

console.log('Detox configuration generated successfully');
