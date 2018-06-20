// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {RefreshControl} from 'react-native';

export default class RefreshList extends PureComponent {
    static propTypes = {
        ...RefreshControl.propTypes,
    };

    render() {
        return (
            <RefreshControl
                {...this.props}
            />
        );
    }
}
