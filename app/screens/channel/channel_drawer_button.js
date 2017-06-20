// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {
    PanResponder,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';

import Badge from 'app/components/badge';
import PushNotifications from 'app/push_notifications';
import {getTheme} from 'app/selectors/preferences';
import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import {getUnreadsInCurrentTeam} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

class ChannelDrawerButton extends PureComponent {
    static propTypes = {
        applicationInitializing: PropTypes.bool.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        myTeamMembers: PropTypes.object,
        theme: PropTypes.object,
        messageCount: PropTypes.number,
        mentionCount: PropTypes.number
    };

    static defaultProps = {
        currentChannel: {},
        theme: {},
        messageCount: 0,
        mentionCount: 0
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

    handlePress = () => {
        EventEmitter.emit('open_channel_drawer');
    };

    render() {
        const {
            applicationInitializing,
            currentTeamId,
            mentionCount,
            messageCount,
            myTeamMembers,
            theme
        } = this.props;
        const style = getStyleFromTheme(theme);

        if (applicationInitializing) {
            return null;
        }

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

        let badge;
        if (badgeCount) {
            badge = (
                <Badge
                    style={style.badge}
                    countStyle={style.mention}
                    count={badgeCount}
                    minHeight={20}
                    minWidth={20}
                    onPress={() => preventDoubleTap(this.handlePress, this)}
                />
            );
        }

        return (
            <TouchableOpacity
                {...this.panResponder.panHandlers}
                onPress={this.handlePress}
                style={style.container}
            >
                <View style={[style.wrapper, {opacity: this.state.opacity, zIndex: 30}]}>
                    <Icon
                        name='md-menu'
                        size={25}
                        color={theme.sidebarHeaderTextColor}
                    />
                    {badge}
                </View>
            </TouchableOpacity>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            width: 40
        },
        wrapper: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            paddingHorizontal: 10,
            paddingTop: 5,
            zIndex: 30
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
    });
});

function mapStateToProps(state) {
    return {
        applicationInitializing: state.views.root.appInitializing,
        currentTeamId: getCurrentTeamId(state),
        myTeamMembers: getTeamMemberships(state),
        theme: getTheme(state),
        ...getUnreadsInCurrentTeam(state)
    };
}

export default connect(mapStateToProps)(ChannelDrawerButton);
