// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getProfilesByIds} from 'mattermost-redux/actions/users';

import {getTeammateNameDisplaySetting} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import CombinedSystemMessage from './combined_system_message';

function mapStateToProps(state) {
    return {
        currentUserId: getCurrentUserId(state),
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getProfilesByIds,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(CombinedSystemMessage);
