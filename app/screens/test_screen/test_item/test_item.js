// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text, View} from 'react-native';

export default class ChannelItem extends PureComponent {
    static propTypes = {
        item: PropTypes.object,
        theme: PropTypes.object,
    }

    render() {
        return (
            <View style={{flex: 1}}>
                <Text style={{color: this.props.theme.centerChannelColor}}>
                    {this.props.item.displayName}
                </Text>
            </View>
        );
    }
}
