// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env */
/* eslint-disable no-console */
const fs = require('fs');
const deviceName = process.env.DEVICE_NAME || 'iPhone 15 Pro';
const deviceOSVersion = process.env.DEVICE_OS_VERSION || 'iOS 17.2';
const detoxConfigTemplate = fs.readFileSync('../.detoxrc.json', 'utf8');
const detoxConfig = detoxConfigTemplate.replace('__DEVICE_NAME__', deviceName).replace('__DEVICE_OS_VERSION__', deviceOSVersion);

fs.writeFileSync('../.detoxrc.json', detoxConfig);

console.log('Detox configuration generated successfully');
