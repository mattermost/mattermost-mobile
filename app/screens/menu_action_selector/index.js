// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getChannelsInCurrentTeam} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getProfiles} from 'mattermost-redux/selectors/entities/users';
import {getProfiles as getProfilesAction, searchProfiles} from 'mattermost-redux/actions/users';
import {getChannels, searchChannels} from 'mattermost-redux/actions/channels';

import MenuActionSelector from './menu_action_selector';

function mapStateToProps(state) {
    const menuAction = state.views.post.menuAction || {};

    let data;
    let loadMoreRequestStatus;
    let searchRequestStatus;
    if (menuAction.dataSource === 'users') {
        data = getProfiles(state);
        loadMoreRequestStatus = state.requests.users.getProfiles.status;
        searchRequestStatus = state.requests.users.searchProfiles.status;
    } else if (menuAction.dataSource === 'channels') {
        data = getChannelsInCurrentTeam(state);
        loadMoreRequestStatus = state.requests.channels.getChannels.status;
        searchRequestStatus = state.requests.channels.getChannels.status;
    } else {
        data = menuAction.options || [];
    }

    return {
        data,
        dataSource: menuAction.dataSource,
        onSelect: menuAction.onSelect,
        theme: getTheme(state),
        currentTeamId: getCurrentTeamId(state),
        loadMoreRequestStatus,
        searchRequestStatus,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getProfiles: getProfilesAction,
            getChannels,
            searchProfiles,
            searchChannels,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MenuActionSelector);
