// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';

import {getTheme} from 'app/selectors/preferences';

function ChannelTitle(props) {
    if (props.applicationInitializing) {
        return null;
    }

    const channelName = props.displayName || props.currentChannel.display_name;
    let icon;
    if (channelName) {
        icon = (
            <Icon
                style={{marginHorizontal: 6}}
                size={12}
                name='chevron-down'
                color={props.theme.sidebarHeaderTextColor}
            />
        );
    }

    return (
        <TouchableOpacity
            style={{flexDirection: 'row', flex: 1}}
            onPress={props.onPress}
        >
            <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 15}}>
                <Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                    style={{
                        color: props.theme.sidebarHeaderTextColor,
                        fontSize: 15,
                        fontWeight: 'bold'}}
                >
                    {channelName}
                </Text>
                {icon}
            </View>
        </TouchableOpacity>
    );
}

ChannelTitle.propTypes = {
    applicationInitializing: PropTypes.bool.isRequired,
    currentChannel: PropTypes.object,
    displayName: PropTypes.string,
    onPress: PropTypes.func,
    theme: PropTypes.object
};

ChannelTitle.defaultProps = {
    currentChannel: {},
    displayName: null,
    theme: {}
};

function mapStateToProps(state) {
    return {
        applicationInitializing: state.views.root.appInitializing,
        currentChannel: getCurrentChannel(state) || {},
        displayName: state.views.channel.displayName,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelTitle);
