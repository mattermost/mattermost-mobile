// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';

export default class SafeAreaAndroid extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired
    };

    render() {
        return (
            <View style={{flex: 1}}>
                {this.props.children}
            </View>
        );
    }
}
