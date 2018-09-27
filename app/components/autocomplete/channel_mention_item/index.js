// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getChannel} from 'mattermost-redux/selectors/entities/channels';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {getChannelNameForSearchAutocomplete} from 'app/selectors/channel';

import ChannelMentionItem from './channel_mention_item';

function mapStateToProps(state, ownProps) {
    const channel = getChannel(state, ownProps.channelId);
    const displayName = getChannelNameForSearchAutocomplete(state, ownProps.channelId);

    return {
        displayName,
        name: channel.name,
        type: channel.type,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ChannelMentionItem);
