// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {startPeriodicStatusUpdates, stopPeriodicStatusUpdates} from '@mm-redux/actions/users';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {shouldShowTermsOfService} from '@mm-redux/selectors/entities/users';
import {getChannelStats} from '@mm-redux/actions/channels';

import {
    loadChannelsForTeam,
    selectInitialChannel,
} from 'app/actions/views/channel';
import {connection} from 'app/actions/device';
import {recordLoadTime} from 'app/actions/views/root';
import {logout} from 'app/actions/views/user';
import {selectDefaultTeam} from 'app/actions/views/select_team';
import {isLandscape} from 'app/selectors/device';

import Channel from './channel';

function mapStateToProps(state) {
    return {
        currentTeamId: getCurrentTeamId(state),
        currentChannelId: getCurrentChannelId(state),
        isLandscape: isLandscape(state),
        theme: getTheme(state),
        showTermsOfService: shouldShowTermsOfService(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getChannelStats,
            connection,
            loadChannelsForTeam,
            logout,
            selectDefaultTeam,
            selectInitialChannel,
            recordLoadTime,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel);
