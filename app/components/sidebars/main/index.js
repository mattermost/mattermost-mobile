// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {setChannelDisplayName, handleSelectChannel} from '@actions/views/channel';
import {makeDirectChannel} from '@actions/views/more_dms';
import {handleNotViewingGlobalThreadsScreen} from '@actions/views/threads';
import {setCategoryCollapsed} from '@mm-redux/actions/channel_categories';
import {joinChannel} from '@mm-redux/actions/channels';
import {getTeams} from '@mm-redux/actions/teams';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId, getMyTeamsCount} from '@mm-redux/selectors/entities/teams';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';
import {getViewingGlobalThreads} from '@selectors/threads';

import MainSidebar from './main_sidebar';

function mapStateToProps(state) {
    const currentUser = getCurrentUser(state);

    return {
        locale: currentUser?.locale,
        currentTeamId: getCurrentTeamId(state),
        currentUserId: currentUser?.id,
        teamsCount: getMyTeamsCount(state),
        theme: getTheme(state),
        viewingGlobalThreads: getViewingGlobalThreads(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeams,
            joinChannel,
            makeDirectChannel,
            setChannelDisplayName,
            handleSelectChannel,
            setCategoryCollapsed,
            handleNotViewingGlobalThreadsScreen,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(MainSidebar);
