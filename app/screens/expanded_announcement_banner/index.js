// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ExpandedAnnouncementBanner from './expanded_announcement_banner';

function mapStateToProps(state) {
    return {
        bannerText: getConfig(state).BannerText,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ExpandedAnnouncementBanner);
