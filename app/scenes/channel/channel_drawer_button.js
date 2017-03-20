// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {connect} from 'react-redux';
import {
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import Badge from 'app/components/badge';
import {getTheme} from 'app/selectors/preferences';

import {getUnreads} from 'mattermost-redux/selectors/entities/channels';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

class ChannelDrawerButton extends PureComponent {
    static propTypes = {
        emitter: PropTypes.func.isRequired,
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

    componentDidMount() {
        EventEmitter.on('drawer_opacity', this.setOpacity);
    }

    componentWillUnmount() {
        EventEmitter.off('drawer_opacity', this.setOpacity);
    }

    setOpacity = (value) => {
        this.setState({opacity: value > 0 ? 0.1 : 1});
    };

    render() {
        let badge;
        let badgeCount = this.props.mentionCount;

        if (!badgeCount && this.props.messageCount) {
            badgeCount = -1;
        }

        if (badgeCount !== 0) {
            const badgeStyle = {
                backgroundColor: 'rgb(214, 73, 70)',
                borderRadius: 10,
                flexDirection: 'row',
                height: 20,
                left: 5,
                padding: 3,
                position: 'absolute',
                right: 0,
                top: 5,
                width: 20
            };

            const mentionStyle = {
                color: '#fff',
                fontSize: 10
            };

            badge = (
                <Badge
                    style={badgeStyle}
                    countStyle={mentionStyle}
                    count={badgeCount}
                    minHeight={5}
                    minWidth={5}
                    onPress={() => this.props.emitter('open_channel_drawer')}
                />
            );
        }

        return (
            <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, opacity: this.state.opacity}}>
                <TouchableOpacity
                    onPress={() => this.props.emitter('open_channel_drawer')}
                    style={{height: 25, width: 25, marginLeft: 10, marginRight: 10}}
                >
                    <Icon
                        name='bars'
                        size={25}
                        color={this.props.theme.sidebarHeaderTextColor}
                    />
                </TouchableOpacity>
                {badge}
            </View>
        );
    }
}

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
        ...getUnreads(state)
    };
}

export default connect(mapStateToProps)(ChannelDrawerButton);
