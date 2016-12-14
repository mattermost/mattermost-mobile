// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {AppState} from 'react-native';
import {Provider} from 'react-redux';

import {setAppState} from 'service/actions/general';
import {loadStorage} from 'app/actions/storage';
import configureStore from 'app/store';
import Router from 'app/navigation/router';
import RootLayout from 'app/layouts/root_layout/root_layout_container';

const store = configureStore();

export default class Mattermost extends React.Component {
    constructor(props) {
        super(props);

        setAppState(AppState.currentState)(store.dispatch, store.getState);
        loadStorage()(store.dispatch, store.getState);
        this.handleAppStateChange = this.handleAppStateChange.bind(this);
    }

    componentDidMount() {
        AppState.addEventListener('change', this.handleAppStateChange);
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this.handleAppStateChange);
    }

    handleAppStateChange(appState) {
        setAppState(appState)(store.dispatch, store.getState);
    }

    render() {
        return (
            <Provider store={store}>
                <RootLayout>
                    <Router/>
                </RootLayout>
            </Provider>
        );
    }
}
