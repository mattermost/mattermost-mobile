// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'app/selectors/preferences';

import NotificationSettingsMentionsKeywords from './notification_settings_mentions_keywords';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(NotificationSettingsMentionsKeywords);
