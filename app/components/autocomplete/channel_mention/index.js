// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {autocompleteChannels} from 'mattermost-redux/actions/channels';
import {getTheme} from 'app/selectors/preferences';
import {getAutocompleteChannelWithSections} from 'mattermost-redux/selectors/entities/channels';

import ChannelMention from './channel_mention';

function mapStateToProps(state, ownProps) {
    const {currentChannelId} = state.entities.channels;

    let postDraft;
    if (ownProps.rootId.length) {
        postDraft = state.views.thread.drafts[ownProps.rootId].draft;
    } else {
        postDraft = state.views.channel.drafts[currentChannelId].draft;
    }

    return {
        ...ownProps,
        currentChannelId,
        currentTeamId: state.entities.teams.currentTeamId,
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
