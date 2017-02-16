// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handlePostDraftChanged} from 'app/actions/views/channel';
import {autocompleteChannels} from 'service/actions/channels';
import {getTheme} from 'service/selectors/entities/preferences';
import {getAutocompleteChannelWithSections} from 'service/selectors/entities/channels';

import ChannelMention from './channel_mention';

function mapStateToProps(state) {
    const currentChannelId = state.entities.channels.currentId;
    const postDraft = state.views.channel.drafts[currentChannelId];
    return {
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
            changePostDraft: handlePostDraftChanged,
            autocompleteChannels
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelMention);
