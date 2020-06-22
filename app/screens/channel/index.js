// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {loadChannelsForTeam, selectInitialChannel, resetUnreadMessageCount} from '@actions/views/channel';
import {recordLoadTime} from '@actions/views/root';
import {selectDefaultTeam} from '@actions/views/select_team';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getCurrentTeam} from '@mm-redux/selectors/entities/teams';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {shouldShowTermsOfService} from '@mm-redux/selectors/entities/users';
import {getChannelStats} from '@mm-redux/actions/channels';

import Channel from './channel';

function mapStateToProps(state) {
    const currentTeam = getCurrentTeam(state);

    return {
        currentTeamId: currentTeam?.id,
        currentChannelId: getCurrentChannelId(state),
        teamName: currentTeam?.display_name,
        theme: getTheme(state),
        showTermsOfService: shouldShowTermsOfService(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getChannelStats,
            loadChannelsForTeam,
            selectDefaultTeam,
            selectInitialChannel,
            recordLoadTime,
            resetUnreadMessageCount,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel);
