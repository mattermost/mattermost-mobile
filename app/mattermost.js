// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'harmony-reflect';
import React from 'react';
import {Provider} from 'react-redux';

import configureStore from 'app/store';
import initialState from 'app/initial_state';
import Router from 'app/navigation/router';
import RootLayout from 'app/layouts/root_layout/root_layout_container';

const store = configureStore(initialState);

export default class Mattermost extends React.Component {
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
