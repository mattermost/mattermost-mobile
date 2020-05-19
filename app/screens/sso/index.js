// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {ssoLogin} from '@actions/views/user';
import {scheduleExpiredNotification} from '@actions/views/session';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {isLandscape} from '@selectors/device';

import SSO from './sso';

function mapStateToProps(state) {
    return {
        ...state.views.selectServer,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            scheduleExpiredNotification,
            ssoLogin,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SSO);
