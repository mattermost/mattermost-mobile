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

function ChannelMenuButton(props) {
    return (
        <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1}}>
            <TouchableOpacity onPress={() => props.emitter('open_right_menu')}>
                <Icon
                    name='ellipsis-v'
                    size={25}
                    color={props.theme.sidebarHeaderTextColor}
                    style={{paddingHorizontal: 20}}
                />
            </TouchableOpacity>
        </View>
    );
}

ChannelMenuButton.propTypes = {
    emitter: PropTypes.func.isRequired,
    theme: PropTypes.object
};

ChannelMenuButton.defaultProps = {
    currentChannel: {},
    theme: {}
};

function mapStateToProps(state) {
    return {
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelMenuButton);
