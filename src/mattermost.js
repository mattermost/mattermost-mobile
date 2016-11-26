// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {Provider} from 'react-redux';

import store from 'store';
import RootContainer from 'containers/root_container.js';

export default class Mattermost extends React.Component {
    render() {
        return (
            <Provider store={store}>
                <RootContainer/>
            </Provider>
        );
    }
}
