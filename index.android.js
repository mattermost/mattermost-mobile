// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {AppRegistry} from 'react-native';
import configureStore from 'store/configureStore.js';

import {Provider} from 'react-redux';
import RootContainer from 'containers/root_container.js';

const store = configureStore();

class Mattermost extends React.Component {
    render() {
        return (
            <Provider store={store}>
                <RootContainer/>
            </Provider>
        );
    }
}

AppRegistry.registerComponent('Mattermost', () => Mattermost);
