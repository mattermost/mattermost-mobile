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
import DeviceNotification from 'react-native-push-notification';
import Icon from 'react-native-vector-icons/Ionicons';

import Badge from 'app/components/badge';
import {getTheme} from 'app/selectors/preferences';
import {preventDoubleTap} from 'app/utils/tap';

import {getUnreadsInCurrentTeam} from 'mattermost-redux/selectors/entities/channels';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

class ChannelDrawerButton extends PureComponent {
    static propTypes = {
        applicationInitializing: PropTypes.bool.isRequired,
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
        DeviceNotification.setApplicationIconBadgeNumber(nextProps.mentionCount);
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
        if (this.props.applicationInitializing) {
            return null;
        }

        let badge;
        let badgeCount = this.props.mentionCount;

        if (!badgeCount && this.props.messageCount) {
            badgeCount = -1;
        }

        if (badgeCount !== 0) {
            badge = (
                <Badge
                    style={style.badge}
                    countStyle={style.mention}
                    count={badgeCount}
                    minHeight={5}
                    minWidth={5}
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
                        color={this.props.theme.sidebarHeaderTextColor}
                    />
                    {badge}
                </View>
            </TouchableOpacity>
        );
    }
}

const style = StyleSheet.create({
    container: {
        width: 40
    },
    wrapper: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        paddingHorizontal: 10,
        zIndex: 30
    },
    badge: {
        backgroundColor: 'rgb(214, 73, 70)',
        borderRadius: 10,
        flexDirection: 'row',
        height: 20,
        left: 5,
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
        }),
        width: 20
    },
    mention: {
        color: '#fff',
        fontSize: 10
    }
});

function mapStateToProps(state) {
    return {
        applicationInitializing: state.views.root.appInitializing,
        theme: getTheme(state),
        ...getUnreadsInCurrentTeam(state)
    };
}

export default connect(mapStateToProps)(ChannelDrawerButton);
