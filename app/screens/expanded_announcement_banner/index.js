// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {popTopScreen} from 'app/actions/navigation';
import {dismissBanner} from 'app/actions/views/announcement';

import ExpandedAnnouncementBanner from './expanded_announcement_banner';

function mapStateToProps(state) {
    const config = getConfig(state);

    return {
        allowDismissal: config.AllowBannerDismissal === 'true',
        bannerText: config.BannerText,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            dismissBanner,
            popTopScreen,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ExpandedAnnouncementBanner);
