// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {clearSearch, removeSearchTerms, searchPosts} from 'mattermost-redux/actions/search';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

import {handlePostDraftChanged} from 'app/actions/views/channel';

import Search from './search';

function mapStateToProps(state, ownProps) {
    const currentTeamId = getCurrentTeamId(state);
    const {posts, recent} = state.entities.search;
    return {
        ...ownProps,
        currentTeamId,
        posts,
        recent: recent[currentTeamId] || {}
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
