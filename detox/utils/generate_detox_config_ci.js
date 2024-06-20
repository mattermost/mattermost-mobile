const fs = require('fs');

const deviceType = process.env.DETOX_DEVICE_TYPE || 'iPhone 14';
const deviceOS = process.env.DETOX_DEVICE_OS || 'iOS 17.2';

const detoxConfigTemplate = fs.readFileSync('../.detoxrc.json', 'utf8');

const detoxConfig = detoxConfigTemplate
  .replace('__DEVICE_TYPE__', deviceType)
  .replace('__DEVICE_OS__', deviceOS);

fs.writeFileSync('../.detoxrc.json', detoxConfig);

console.log('Detox configuration generated successfully');
