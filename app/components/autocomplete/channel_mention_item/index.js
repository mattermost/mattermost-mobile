// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getChannel} from 'mattermost-redux/selectors/entities/channels';

import {getTheme} from 'app/selectors/preferences';

import ChannelMentionItem from './channel_mention_item';

function mapStateToProps(state, ownProps) {
    const channel = getChannel(state, ownProps.channelId);

    return {
        displayName: channel.display_name,
        name: channel.name,
        theme: getTheme(state),
        ...ownProps
    };
}

export default connect(mapStateToProps)(ChannelMentionItem);
