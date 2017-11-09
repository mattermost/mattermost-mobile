// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image, Platform, View} from 'react-native';

import {General, Preferences} from 'mattermost-redux/constants';

import {AwayIcon, DndIcon, OfflineIcon, OnlineIcon} from 'app/components/status_icons';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import placeholder from 'assets/images/profile.jpg';

import {Client4} from 'mattermost-redux/client';

const statusToIcon = {
    away: AwayIcon,
    dnd: DndIcon,
    offline: OfflineIcon,
    online: OnlineIcon
};

const STATUS_BUFFER = Platform.select({
    ios: 3,
    android: 2
});

export default class ProfilePicture extends PureComponent {
    static propTypes = {
        size: PropTypes.number,
        statusBorderWidth: PropTypes.number,
        statusSize: PropTypes.number,
        user: PropTypes.object,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            getStatusForId: PropTypes.func.isRequired
        })
    };

    static defaultProps = {
        size: 128,
        statusBorderWidth: 2,
        statusSize: 14
    };

    componentDidMount() {
        if (!this.props.status && this.props.user) {
            this.props.actions.getStatusForId(this.props.user.id);
        }
    }

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        let pictureUrl;
        if (this.props.user) {
            pictureUrl = Client4.getProfilePictureUrl(this.props.user.id, this.props.user.last_picture_update);
        }

        let Icon;
        let iconColor;
        if (this.props.status && statusToIcon[this.props.status]) {
            Icon = statusToIcon[this.props.status];

            switch (this.props.status) {
            case General.AWAY:
                iconColor = theme.awayIndicator;
                break;
            case General.DND:
                if (theme.dndIndicator) {
                    iconColor = theme.dndIndicator;
                } else {
                    switch (theme.type) {
                    case 'Organization':
                        iconColor = Preferences.THEMES.organization.dndIndicator;
                        break;
                    case 'Mattermost Dark':
                        iconColor = Preferences.THEMES.mattermostDark.dndIndicator;
                        break;
                    case 'Windows Dark':
                        iconColor = Preferences.THEMES.windows10.dndIndicator;
                        break;
                    default:
                        iconColor = Preferences.THEMES.default.dndIndicator;
                        break;
                    }
                }
                break;
            case General.ONLINE:
                iconColor = theme.onlineIndicator;
                break;
            default:
                iconColor = theme.centerChannelColor;
                break;
            }
        } else {
            Icon = statusToIcon.offline;
            iconColor = theme.centerChannelColor;
        }

        const statusIcon = (
            <Icon
                height={this.props.statusSize}
                width={this.props.statusSize}
                color={iconColor}
            />
        );

        return (
            <View style={{width: this.props.size + STATUS_BUFFER, height: this.props.size + STATUS_BUFFER}}>
                <Image
                    key={pictureUrl}
                    style={{width: this.props.size, height: this.props.size, borderRadius: this.props.size / 2}}
                    source={{uri: pictureUrl}}
                    defaultSource={placeholder}
                />
                {this.props.status &&
                    <View style={[style.statusWrapper, {borderRadius: this.props.statusSize / 2}]}>
                        {statusIcon}
                    </View>
                }
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        statusWrapper: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.centerChannelBg
        },
        status: {
            color: theme.centerChannelBg
        },
        online: {
            backgroundColor: theme.onlineIndicator
        },
        away: {
            backgroundColor: theme.awayIndicator
        },
        dnd: {
            backgroundColor: 'red'
        },
        offline: {
            backgroundColor: theme.centerChannelBg
        },
        offlineIcon: {
            borderColor: '#bababa'
        }
    };
});
