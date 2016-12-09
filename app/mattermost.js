// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {Provider} from 'react-redux';

import configureStore from 'app/store';
import Router from 'app/navigation/router';
import RootLayout from 'app/layouts/root_layout/root_layout_container';

const store = configureStore();

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
