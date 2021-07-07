// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isLandscape} from 'app/selectors/device';
import {connect} from 'react-redux';

import {getConfig, getLicense} from '@mm-redux/selectors/entities/general';

import AnnouncementBanner from './announcement_banner';

function mapStateToProps(state) {
    const config = getConfig(state);
    const license = getLicense(state);
    const {announcement} = state.views;

    return {
        bannerColor: config.BannerColor,
        bannerDismissed: config.BannerText === announcement,
        bannerEnabled: config.EnableBanner === 'true' && license.IsLicensed === 'true',
        bannerText: config.BannerText,
        bannerTextColor: config.BannerTextColor || '#000',
        isLandscape: isLandscape(state),
    };
}

export default connect(mapStateToProps)(AnnouncementBanner);
