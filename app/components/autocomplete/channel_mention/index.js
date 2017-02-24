// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {autocompleteChannels} from 'service/actions/channels';
import {getTheme} from 'service/selectors/entities/preferences';
import {getAutocompleteChannelWithSections} from 'service/selectors/entities/channels';

import ChannelMention from './channel_mention';

function mapStateToProps(state, ownProps) {
    const currentChannelId = state.entities.channels.currentId;

    let postDraft;
    if (ownProps.rootId.length) {
        postDraft = state.views.thread.draft[ownProps.rootId];
    } else {
        postDraft = state.views.channel.drafts[currentChannelId];
    }

    return {
        ...ownProps,
        currentChannelId,
        currentTeamId: state.entities.teams.currentId,
        postDraft,
        autocompleteChannels: getAutocompleteChannelWithSections(state),
        requestStatus: state.requests.channels.autocompleteChannels.status,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            autocompleteChannels
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelMention);
