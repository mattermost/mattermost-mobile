// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {setChannelDisplayName} from 'app/actions/views/channel';
import {makeDirectChannel, makeGroupChannel} from 'app/actions/views/more_dms';
import {isLandscape} from 'app/selectors/device';
import {getProfiles, getProfilesInTeam, searchProfiles} from 'mattermost-redux/actions/users';
import {General} from 'mattermost-redux/constants';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTeammateNameDisplaySetting, getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId, getUsers} from 'mattermost-redux/selectors/entities/users';

import {dismissModal, setButtons} from 'app/actions/navigation';

import MoreDirectMessages from './more_dms';

function mapStateToProps(state) {
    const config = getConfig(state);
    const restrictDirectMessage = config.RestrictDirectMessage === General.RESTRICT_DIRECT_MESSAGE_ANY;

    return {
        restrictDirectMessage,
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        allProfiles: getUsers(state),
        theme: getTheme(state),
        currentDisplayName: state.views.channel.displayName,
        currentUserId: getCurrentUserId(state),
        currentTeamId: getCurrentTeamId(state),
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            makeDirectChannel,
            makeGroupChannel,
            getProfiles,
            getProfilesInTeam,
            searchProfiles,
            setChannelDisplayName,
            dismissModal,
            setButtons,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MoreDirectMessages);
