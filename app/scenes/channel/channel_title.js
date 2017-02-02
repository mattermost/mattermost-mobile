// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import {getCurrentChannel} from 'service/selectors/entities/channels';
import {getTheme} from 'service/selectors/entities/preferences';

function ChannelTitle(props) {
    const channelName = props.currentChannel.display_name;
    return (
        <TouchableOpacity
            style={{flexDirection: 'row', flex: 1, alignItems: 'center'}}
            onPress={() => props.emitter('show_channel_info')}
        >
            <View>
                <Text style={{color: props.theme.sidebarHeaderTextColor, fontSize: 15, fontWeight: 'bold'}}>
                    {channelName}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

ChannelTitle.propTypes = {
    currentChannel: PropTypes.object,
    emitter: PropTypes.func.isRequired,
    theme: PropTypes.object
};

ChannelTitle.defaultProps = {
    currentChannel: {},
    theme: {}
};

function mapStateToProps(state) {
    return {
        currentChannel: getCurrentChannel(state),
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelTitle);
