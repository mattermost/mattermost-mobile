// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {closePermalink, showPermalink} from '@actions/views/permalink';
import {getPostThread} from '@actions/views/post';
import {handleSearchDraftChanged} from '@actions/views/search';
import {selectPost} from '@mm-redux/actions/posts';
import {clearSearch, removeSearchTerms, searchPostsWithParams, getMorePostsForSearch} from '@mm-redux/actions/search';
import {getCurrentChannelId, filterPostIds} from '@mm-redux/selectors/entities/channels';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {isTimezoneEnabled} from '@mm-redux/selectors/entities/timezone';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {getUserCurrentTimezone} from '@mm-redux/utils/timezone_utils';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';
import {makePreparePostIdsForSearchPosts} from '@selectors/post_list';
import {getDeviceUtcOffset, getUtcOffsetForTimeZone} from '@utils/timezone';

import Search from './search';

function makeMapStateToProps() {
    const preparePostIds = makePreparePostIdsForSearchPosts();
    const filterPostIdsByDeletedChannels = filterPostIds((c) => c && c.delete_at !== 0);

    return (state) => {
        const config = getConfig(state);
        let results = state.entities.search.results;

        const archivedPostIds = filterPostIdsByDeletedChannels(state, results || []);
        const viewArchivedChannels = config.ExperimentalViewArchivedChannels === 'true';

        if (!viewArchivedChannels && results && results.length > 0) {
            results = results.filter((id) => !archivedPostIds.includes(id));
        }

        const postIds = preparePostIds(state, results);

        const currentTeamId = getCurrentTeamId(state);
        const currentChannelId = getCurrentChannelId(state);
        const {recent} = state.entities.search;

        const currentUser = getCurrentUser(state);
        const enableTimezone = isTimezoneEnabled(state);
        const userCurrentTimezone = enableTimezone ? getUserCurrentTimezone(currentUser.timezone) : '';
        const timezoneOffsetInSeconds = (userCurrentTimezone.length > 0 ? getUtcOffsetForTimeZone(userCurrentTimezone) : getDeviceUtcOffset()) * 60;

        const serverVersion = state.entities.general.serverVersion;
        const enableDateSuggestion = isMinimumServerVersion(serverVersion, 5, 3);

        const isSearchGettingMore = state.entities.search.isSearchGettingMore;

        return {
            currentTeamId,
            currentChannelId,
            postIds,
            archivedPostIds,
            recent: recent[currentTeamId],
            isSearchGettingMore,
            theme: getTheme(state),
            enableDateSuggestion,
            timezoneOffsetInSeconds,
            viewArchivedChannels,
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            clearSearch,
            closePermalink,
            handleSearchDraftChanged,
            getPostThread,
            removeSearchTerms,
            searchPostsWithParams,
            getMorePostsForSearch,
            selectPost,
            showPermalink,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(Search);
