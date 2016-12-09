// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import appReducer from 'app/reducers';
import configureServiceStore from 'service/store';

function getAppReducer() {
    return require('../../app/reducers'); // eslint-disable-line global-require
}

export default function configureStore(preloadedState) {
    return configureServiceStore(preloadedState, appReducer, getAppReducer);
}
