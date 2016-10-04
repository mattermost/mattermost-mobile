// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {AppRegistry} from 'react-native';
import {Provider} from 'react-redux';
import RootContainer from './src/containers/RootContainer';
import configureStore from './src/store/configureStore';
const store = configureStore();

class Mattermost extends Component {
    render() {
        return (
            <Provider store={store}>
                <RootContainer/>
            </Provider>
        );
    }
}

AppRegistry.registerComponent('Mattermost', () => Mattermost);
