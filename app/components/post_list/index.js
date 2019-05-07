// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectFocusedPostId} from 'mattermost-redux/actions/posts';
import {getConfig, getCurrentUrl} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {makePreparePostIdsForPostList, START_OF_NEW_MESSAGES} from 'mattermost-redux/utils/post_list';

import {handleSelectChannelByName, loadChannelsByTeamName, refreshChannelWithRetry} from 'app/actions/views/channel';
import {setDeepLinkURL} from 'app/actions/views/root';

import PostList from './post_list';

function makeMapStateToProps() {
    const preparePostIds = makePreparePostIdsForPostList();
    return (state, ownProps) => {
        const postIds = preparePostIds(state, ownProps);
        let initialIndex = postIds.indexOf(START_OF_NEW_MESSAGES);
        if (ownProps.highlightPostId) {
            initialIndex = postIds.indexOf(ownProps.highlightPostId);
        }

        return {
            deepLinkURL: state.views.root.deepLinkURL,
            postIds,
            initialIndex,
            serverURL: getCurrentUrl(state),
            siteURL: getConfig(state).SiteURL,
            theme: getTheme(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSelectChannelByName,
            loadChannelsByTeamName,
            refreshChannelWithRetry,
            selectFocusedPostId,
            setDeepLinkURL,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(PostList);
