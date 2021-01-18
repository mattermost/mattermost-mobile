// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {AppRegistry, DeviceEventEmitter} from 'react-native';
import {name as appName} from './app.json';
import LocalConfig from '@assets/config';
import telemetry from 'app/telemetry';
import mattermost from 'app/mattermost';
if (module.hot) {
    module.hot.accept();
}
AppRegistry.registerComponent(appName, () => mattermost);
AppRegistry.runApplication(appName, {
    initialProps: {},
    rootTag: document.getElementById('app-root'),
});
const ShareExtension = require('share_extension/index.tsx').default;
AppRegistry.registerComponent('MattermostShare', () => ShareExtension);

//setFontFamily();

if (LocalConfig.TelemetryEnabled) {
    const metricsSubscription = DeviceEventEmitter.addListener('nativeMetrics', (metrics) => {
        telemetry.setAppStartTime(metrics.appReload);
        telemetry.include([
            {name: 'start:process_packages', startTime: metrics.processPackagesStart, endTime: metrics.processPackagesEnd},
            {name: 'start:content_appeared', startTime: metrics.appReload, endTime: metrics.appContentAppeared},
        ]);
        telemetry.start(['start:overall'], metrics.appReload);

        DeviceEventEmitter.removeSubscription(metricsSubscription);
    });
}
