// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {clearSearch, removeSearchTerms, searchPosts} from 'mattermost-redux/actions/search';
import {getMyChannels} from 'mattermost-redux/selectors/entities/channels';
import {getSearchResults} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

import {handlePostDraftChanged} from 'app/actions/views/channel';

import Search from './search';

function mapStateToProps(state, ownProps) {
    const currentTeamId = getCurrentTeamId(state);
    const {recent} = state.entities.search;

    return {
        ...ownProps,
        currentTeamId,
        posts: getSearchResults(state),
        recent: recent[currentTeamId] || {},
        channels: getMyChannels(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            clearSearch,
            handlePostDraftChanged,
            removeSearchTerms,
            searchPosts
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Search);
