// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handlePostDraftChanged} from 'app/actions/views/channel';
import {autocompleteUsersInChannel} from 'service/actions/users';
import {getTheme} from 'service/selectors/entities/preferences';
import {getAutocompleteUsersInCurrentChannel} from 'service/selectors/entities/users';

import AtMention from './at_mention';

function mapStateToProps(state) {
    const currentChannelId = state.entities.channels.currentId;
    const postDraft = state.views.channel.drafts[currentChannelId];
    return {
        currentChannelId,
        currentTeamId: state.entities.teams.currentId,
        postDraft,
        autocompleteUsersInCurrentChannel: getAutocompleteUsersInCurrentChannel(state),
        requestStatus: state.requests.users.getProfilesInChannel.status,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            changePostDraft: handlePostDraftChanged,
            autocompleteUsersInChannel
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AtMention);
