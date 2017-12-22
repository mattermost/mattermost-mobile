// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {General} from 'mattermost-redux/constants';

import {AwayIcon, DndIcon, OfflineIcon, OnlineIcon} from 'app/components/status_icons';

const statusToIcon = {
    away: AwayIcon,
    dnd: DndIcon,
    offline: OfflineIcon,
    online: OnlineIcon
};

export default class UserStatus extends PureComponent {
    static propTypes = {
        size: PropTypes.number,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        size: 14,
        status: General.OFFLINE
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
            <Icon
                height={size}
                width={size}
                color={iconColor}
            />
        );
    }
}
