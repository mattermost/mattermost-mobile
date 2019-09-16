// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {General} from 'mattermost-redux/constants';

import Icon from 'app/components/vector_icon';

import {changeOpacity} from 'app/utils/theme';

const statusToIcon = {
    away: General.AWAY,
    dnd: General.DND,
    offline: General.OFFLINE,
    ooo: General.OFFLINE,
    online: General.ONLINE,
};

export default class UserStatus extends PureComponent {
    static propTypes = {
        isAvatar: PropTypes.bool,
        size: PropTypes.number,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        size: 6,
        status: General.OFFLINE,
    };

    render() {
        const {size, status, theme} = this.props;
        const iconName = statusToIcon[status];

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
            iconColor = changeOpacity(theme.centerChannelColor, 0.3);
            break;
        }

        return (
            <Icon
                name={iconName}
                style={{fontSize: size, color: iconColor}}
                type='mattermost'
            />
        );
    }
}
