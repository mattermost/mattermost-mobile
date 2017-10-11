// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';

import {getTheme} from 'app/selectors/preferences';

import ChannelTitle from './channel_title';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state);

    return {
        currentChannelName: currentChannel ? currentChannel.display_name : '',
        displayName: state.views.channel.displayName,
        theme: getTheme(state)
    };
}

function areStatesEqual(next, prev) {
    const nextChannelId = next.entities.channels.currentChannelId;
    const prevChannelId = prev.entities.channels.currentChannelId;
    const prevDisplayName = prev.views.channel.displayName;
    const nextDisplayName = next.views.channel.displayName;

    // When the names have changed
    if (nextDisplayName !== prevDisplayName) {
        return false;
    }

    // When we have a display name no need to re-render
    if (nextDisplayName) {
        return true;
    }

    // When we don't have the display name but already switched channels
    return prevChannelId === nextChannelId;
}

export default connect(mapStateToProps, null, null, {pure: true, areStatesEqual})(ChannelTitle);
