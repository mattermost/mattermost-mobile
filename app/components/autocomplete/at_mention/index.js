// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'app/selectors/preferences';
import {autocompleteUsersInChannel} from 'mattermost-redux/actions/users';
import {getDefaultChannel} from 'mattermost-redux/selectors/entities/channels';
import {getAutocompleteUsersInCurrentChannel} from 'mattermost-redux/selectors/entities/users';

import AtMention from './at_mention';

function mapStateToProps(state, ownProps) {
    const {currentChannelId} = state.entities.channels;

    let postDraft;
    if (ownProps.rootId.length) {
        postDraft = state.views.thread.draft[ownProps.rootId];
    } else {
        postDraft = state.views.channel.drafts[currentChannelId];
    }

    return {
        ...ownProps,
        currentUserId: state.entities.users.currentUserId,
        currentChannelId,
        currentTeamId: state.entities.teams.currentTeamId,
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
            autocompleteUsersInChannel
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AtMention);
