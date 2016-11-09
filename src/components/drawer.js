// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import BaseDrawer from 'react-native-drawer';

// Extends react-native-drawer to allow better control over the open/closed state from the parent
export default class Drawer extends BaseDrawer {
    static propTypes = {
        ...BaseDrawer.propTypes,
        onRequestClose: React.PropTypes.func.isRequired
    };

    close = (type, callback) => {
        this.props.onRequestClose();

        if (typeof type === 'function') {
            // This function can be called with only a callback as its only argument
            type();
        } else if (callback) {
            callback();
        }
    }
}
