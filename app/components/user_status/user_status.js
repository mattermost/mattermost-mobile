// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {General} from '@mm-redux/constants';

import CompassIcon from '@components/compass_icon';
import {changeOpacity} from '@utils/theme';

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

        let iconName;
        let iconColor;
        switch (status) {
        case General.AWAY:
            iconName = 'clock';
            iconColor = theme.awayIndicator;
            break;
        case General.DND:
            iconName = 'minus-circle';
            iconColor = theme.dndIndicator;
            break;
        case General.ONLINE:
            iconName = 'check-circle';
            iconColor = theme.onlineIndicator;
            break;
        default:
            iconName = 'circle-outline';
            iconColor = changeOpacity(theme.centerChannelColor, 0.3);
            break;
        }

        return (
            <CompassIcon
                name={iconName}
                style={{fontSize: size, color: iconColor}}
            />
        );
    }
}
