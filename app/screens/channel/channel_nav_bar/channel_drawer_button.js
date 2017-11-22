// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {
    PanResponder,
    Platform,
    TouchableOpacity,
    View
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';

import Badge from 'app/components/badge';
import PushNotifications from 'app/push_notifications';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import {getUnreadsInCurrentTeam} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

class ChannelDrawerButton extends PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string.isRequired,
        openDrawer: PropTypes.func.isRequired,
        messageCount: PropTypes.number,
        mentionCount: PropTypes.number,
        myTeamMembers: PropTypes.object,
        theme: PropTypes.object,
        type: PropTypes.oneOf(['left', 'right'])
    };

    static defaultProps = {
        currentChannel: {},
        theme: {},
        messageCount: 0,
        mentionCount: 0,
        type: 'left'
    };

    constructor(props) {
        super(props);

        this.state = {
            opacity: 1
        };
    }

    componentWillMount() {
        this.panResponder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onStartShouldSetResponderCapture: () => true,
            onMoveShouldSetResponderCapture: () => true,
            onResponderMove: () => false
        });
    }

    componentDidMount() {
        EventEmitter.on('drawer_opacity', this.setOpacity);
        PushNotifications.setApplicationIconBadgeNumber(this.props.mentionCount);
    }

    componentWillReceiveProps(nextProps) {
        PushNotifications.setApplicationIconBadgeNumber(nextProps.mentionCount);
    }

    componentWillUnmount() {
        EventEmitter.off('drawer_opacity', this.setOpacity);
    }

    setOpacity = (value) => {
        this.setState({opacity: value > 0 ? 0.1 : 1});
    };

    handlePress = wrapWithPreventDoubleTap(() => {
        this.props.openDrawer();
    });

    render() {
        const {
            currentTeamId,
            mentionCount,
            messageCount,
            myTeamMembers,
            theme,
            type
        } = this.props;
        const style = getStyleFromTheme(theme);

        let badge;
        if (type === 'left') {
            let mentions = mentionCount;
            let messages = messageCount;

            const members = Object.values(myTeamMembers).filter((m) => m.team_id !== currentTeamId);
            members.forEach((m) => {
                mentions = mentions + (m.mention_count || 0);
                messages = messages + (m.msg_count || 0);
            });

            let badgeCount = 0;
            if (mentions) {
                badgeCount = mentions;
            } else if (messages) {
                badgeCount = -1;
            }

            if (badgeCount) {
                badge = (
                    <Badge
                        style={style.badge}
                        countStyle={style.mention}
                        count={badgeCount}
                        minHeight={20}
                        minWidth={20}
                        onPress={this.handlePress}
                    />
                );
            }
        }

        let containerStyle;
        let wrapperStyle;
        let icon;
        switch (type) {
        case 'left':
            containerStyle = style.leftContainer;
            wrapperStyle = style.leftWrapper;
            icon = (
                <Icon
                    name='md-menu'
                    size={25}
                    color={theme.sidebarHeaderTextColor}
                />
            );
            break;
        case 'right':
            containerStyle = style.rightContainer;
            wrapperStyle = style.rightWrapper;
            icon = (
                <Icon
                    name='md-more'
                    size={25}
                    color={theme.sidebarHeaderTextColor}
                />
            );
            break;
        }

        return (
            <TouchableOpacity
                {...this.panResponder.panHandlers}
                onPress={this.handlePress}
                style={containerStyle}
            >
                <View style={[style.wrapper, wrapperStyle, {opacity: this.state.opacity, zIndex: 30}]}>
                    {icon}
                    {badge}
                </View>
            </TouchableOpacity>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        leftContainer: {
            width: 40
        },
        rightContainer: {
            width: 20
        },
        wrapper: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            paddingTop: 5,
            zIndex: 30
        },
        leftWrapper: {
            paddingHorizontal: 10
        },
        rightWrapper: {
            paddingRight: 10
        },
        badge: {
            backgroundColor: theme.mentionBj,
            borderColor: theme.sidebarHeaderBg,
            borderRadius: 10,
            borderWidth: 1,
            flexDirection: 'row',
            left: 3,
            padding: 3,
            position: 'absolute',
            right: 0,
            ...Platform.select({
                android: {
                    top: 10
                },
                ios: {
                    top: 5
                }
            })
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10
        }
    };
});

function mapStateToProps(state) {
    return {
        currentTeamId: getCurrentTeamId(state),
        myTeamMembers: getTeamMemberships(state),
        theme: getTheme(state),
        ...getUnreadsInCurrentTeam(state)
    };
}

export default connect(mapStateToProps)(ChannelDrawerButton);
