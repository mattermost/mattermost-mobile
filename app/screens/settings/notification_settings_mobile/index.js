// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'app/selectors/preferences';

import NotificationSettingsMobile from './notification_settings_mobile';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        config: state.entities.general.config,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(NotificationSettingsMobile);
