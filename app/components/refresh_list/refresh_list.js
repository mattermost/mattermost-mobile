// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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
