// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {closePermalink, showPermalink} from '@actions/views/permalink';
import {getConfig, getCurrentUrl} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {makePreparePostIdsForPostList, START_OF_NEW_MESSAGES} from '@mm-redux/utils/post_list';
import {getCurrentTeam} from '@mm-redux/selectors/entities/teams';

import {handleSelectChannelByName, refreshChannelWithRetry} from 'app/actions/views/channel';
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
            currentTeamName: getCurrentTeam(state)?.name,
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closePermalink,
            handleSelectChannelByName,
            refreshChannelWithRetry,
            setDeepLinkURL,
            showPermalink,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(PostList);
