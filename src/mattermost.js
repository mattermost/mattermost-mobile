// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {Provider} from 'react-redux';

import store from 'store';

import Router from 'navigation/router';
import RootLayout from 'layouts/root_layout/root_layout_container';

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
