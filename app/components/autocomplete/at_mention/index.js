// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handlePostDraftChanged} from 'app/actions/views/channel';
import {autocompleteUsersInChannel} from 'service/actions/users';
import {getTheme} from 'service/selectors/entities/preferences';
import {getDefaultChannel} from 'service/selectors/entities/channels';
import {getAutocompleteUsersInCurrentChannel} from 'service/selectors/entities/users';

import AtMention from './at_mention';

function mapStateToProps(state) {
    const currentChannelId = state.entities.channels.currentId;
    const postDraft = state.views.channel.drafts[currentChannelId];
    return {
        currentUserId: state.entities.users.currentId,
        currentChannelId,
        currentTeamId: state.entities.teams.currentId,
        defaultChannel: getDefaultChannel(state),
        postDraft,
        autocompleteUsersInCurrentChannel: getAutocompleteUsersInCurrentChannel(state),
        requestStatus: state.requests.users.autocompleteUsersInChannel.status,
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
