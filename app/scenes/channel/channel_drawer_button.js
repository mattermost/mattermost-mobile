// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Badge from 'app/components/badge';

import {getUnreads} from 'service/selectors/entities/channels';
import {getTheme} from 'service/selectors/entities/preferences';

function ChannelDrawerButton(props) {
    let badge;
    let badgeCount = props.mentionCount;

    if (!badgeCount && props.messageCount) {
        badgeCount = -1;
    }

    if (badgeCount !== 0) {
        const badgeStyle = {
            position: 'absolute',
            top: 5,
            left: 5,
            flexDirection: 'row',
            backgroundColor: 'rgb(214, 73, 70)'
        };

        const mentionStyle = {
            color: '#fff',
            fontSize: 12
        };

        badge = (
            <Badge
                style={badgeStyle}
                countStyle={mentionStyle}
                count={badgeCount}
                minHeight={5}
                minWidth={5}
                onPress={() => props.emitter('open_channel_drawer')}
            />
        );
    }

    return (
        <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1}}>
            <TouchableOpacity
                onPress={() => props.emitter('open_channel_drawer')}
                style={{height: 25, width: 25, marginLeft: 10, marginRight: 10}}
            >
                <Icon
                    name='bars'
                    size={25}
                    color={props.theme.sidebarHeaderTextColor}
                />
            </TouchableOpacity>
            {badge}
        </View>
    );
}

ChannelDrawerButton.propTypes = {
    emitter: PropTypes.func.isRequired,
    theme: PropTypes.object,
    messageCount: PropTypes.number,
    mentionCount: PropTypes.number
};

ChannelDrawerButton.defaultProps = {
    currentChannel: {},
    theme: {},
    messageCount: 0,
    mentionCount: 0
};

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
        ...getUnreads(state)
    };
}

export default connect(mapStateToProps)(ChannelDrawerButton);
