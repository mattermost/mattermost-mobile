// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';

import {dismissBanner} from 'app/actions/views/announcement';

import AnnouncementBanner from './announcement_banner';

function mapStateToProps(state) {
    const config = getConfig(state);
    const license = getLicense(state);
    const {announcement} = state.views;

    return {
        allowDismissal: config.AllowBannerDismissal === 'true',
        bannerColor: config.BannerColor,
        bannerDismissed: config.BannerText === announcement,
        bannerEnabled: config.EnableBanner === 'true' && license.IsLicensed === 'true',
        bannerText: config.BannerText,
        bannerTextColor: config.BannerTextColor,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            dismissBanner,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AnnouncementBanner);
