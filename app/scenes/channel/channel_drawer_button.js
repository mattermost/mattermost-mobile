// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {getTheme} from 'service/selectors/entities/preferences';

function ChannelDrawerButton(props) {
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
        </View>
    );
}

ChannelDrawerButton.propTypes = {
    emitter: PropTypes.func.isRequired,
    theme: PropTypes.object
};

ChannelDrawerButton.defaultProps = {
    currentChannel: {},
    theme: {}
};

function mapStateToProps(state) {
    return {
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelDrawerButton);
