// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    TouchableOpacity,
    View,
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';

import Badge from 'app/components/badge';
import PushNotifications from 'app/push_notifications';
import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import telemetry from 'app/telemetry';

export default class ChannelDrawerButton extends PureComponent {
    static propTypes = {
        openDrawer: PropTypes.func.isRequired,
        badgeCount: PropTypes.number,
        theme: PropTypes.object,
        visible: PropTypes.bool,
    };

    static defaultProps = {
        badgeCount: 0,
        currentChannel: {},
        theme: {},
        visible: true,
    };

    componentDidMount() {
        if (this.props.badgeCount > 0) {
            PushNotifications.setApplicationIconBadgeNumber(this.props.badgeCount);
        }
    }

    componentDidUpdate(prevProps) {
        if ((this.props.badgeCount > -1 && prevProps.badgeCount !== this.props.badgeCount) ||
            (this.props.badgeCount <= 0 && prevProps.badgeCount > 0)) {
            PushNotifications.setApplicationIconBadgeNumber(this.props.badgeCount);
        }
    }

    handlePress = preventDoubleTap(() => {
        telemetry.start(['channel:open_drawer']);
        this.props.openDrawer();
    });

    render() {
        const {
            badgeCount,
            theme,
            visible,
        } = this.props;

        const style = getStyleFromTheme(theme);

        let badge;
        if (badgeCount && visible) {
            badge = (
                <Badge
                    style={style.badge}
                    countStyle={style.mention}
                    count={badgeCount}
                    onPress={this.handlePress}
                />
            );
        }

        let icon;
        let containerStyle;
        if (visible) {
            icon = (
                <Icon
                    name='md-menu'
                    size={25}
                    color={theme.sidebarHeaderTextColor}
                />
            );
            containerStyle = style.container;
        } else {
            icon = (<View style={style.tabletIcon}/>);
            containerStyle = style.tabletContainer;
        }

        return (
            <TouchableOpacity
                onPress={this.handlePress}
                style={containerStyle}
            >
                <View style={[style.wrapper]}>
                    <View>
                        {icon}
                        {badge}
                    </View>
                </View>
            </TouchableOpacity>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            width: 55,
        },
        tabletContainer: {
            width: 10,
        },
        tabletIcon: {
            height: 25,
        },
        wrapper: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            paddingHorizontal: 10,
        },
        badge: {
            backgroundColor: theme.mentionBg,
            borderColor: theme.sidebarHeaderBg,
            borderRadius: 10,
            borderWidth: 1,
            left: -13,
            padding: 3,
            position: 'absolute',
            right: 0,
            top: -4,
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10,
        },
    };
});
