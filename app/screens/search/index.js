// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectFocusedPostId, selectPost} from 'mattermost-redux/actions/posts';
import {clearSearch, removeSearchTerms, searchPostsWithParams, getMorePostsForSearch} from 'mattermost-redux/actions/search';
import {getCurrentChannelId, filterPostIds} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {isMinimumServerVersion} from 'mattermost-redux/utils/helpers';
import {getUserCurrentTimezone} from 'mattermost-redux/utils/timezone_utils';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

import {loadChannelsByTeamName, loadThreadIfNecessary} from 'app/actions/views/channel';
import {isLandscape} from 'app/selectors/device';
import {makePreparePostIdsForSearchPosts} from 'app/selectors/post_list';
import {handleSearchDraftChanged} from 'app/actions/views/search';
import {getDeviceUtcOffset, getUtcOffsetForTimeZone, isTimezoneEnabled} from 'app/utils/timezone';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

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
        const {searchPosts: searchRequest} = state.requests.search;

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
            isLandscape: isLandscape(state),
            postIds,
            archivedPostIds,
            recent: recent[currentTeamId],
            searchingStatus: searchRequest.status,
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
            handleSearchDraftChanged,
            loadChannelsByTeamName,
            loadThreadIfNecessary,
            removeSearchTerms,
            selectFocusedPostId,
            searchPostsWithParams,
            getMorePostsForSearch,
            selectPost,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(Search);
