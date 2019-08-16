// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text, View} from 'react-native';

export default class ChannelItem extends PureComponent {
    static propTypes = {
        currentUserId: PropTypes.string.isRequired,
        item: PropTypes.object,
        theme: PropTypes.object,
    };

    displayName = () => {
        const {item, currentUserId} = this.props;
        const names = [];

        if (item.type === 'O' || item.type === 'P') {
            return item.displayName;
        }

        item.members.forEach((m) => {
            if (m.user.id !== currentUserId) {
                names.push(m.user.fullName.trim() || m.user.nickname || m.user.username);
            }
        });

        return names.join(', ').trim().replace(/,\s*$/, '');
    };

    render() {
        return (
            <View style={{flex: 1}}>
                <Text style={{color: this.props.theme.centerChannelColor}}>
                    {this.displayName()}
                </Text>
            </View>
        );
    }
}
