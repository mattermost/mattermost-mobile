// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {Image} from 'react-native';
import PropTypes from 'prop-types';

import {General} from 'mattermost-redux/constants';
import away from 'assets/images/status/away.png';
import dnd from 'assets/images/status/dnd.png';
import offline from 'assets/images/status/offline.png';
import online from 'assets/images/status/online.png';

const statusToIcon = {
    away,
    dnd,
    offline,
    online,
};

export default class UserStatus extends PureComponent {
    static propTypes = {
        size: PropTypes.number,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        size: 14,
        status: General.OFFLINE,
    };

    render() {
        const {size, status, theme} = this.props;
        const Icon = statusToIcon[status];

        let iconColor;
        switch (status) {
        case General.AWAY:
            iconColor = theme.awayIndicator;
            break;
        case General.DND:
            iconColor = theme.dndIndicator;
            break;
        case General.ONLINE:
            iconColor = theme.onlineIndicator;
            break;
        default:
            iconColor = theme.centerChannelColor;
            break;
        }

        return (
            <Image
                source={Icon}
                style={{height: size, width: size, tintColor: iconColor}}
            />
        );
    }
}
