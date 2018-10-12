// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {isLandscape} from 'app/selectors/device';

import ErrorBanner from './error_banner';

function mapStateToProps(state) {
    return {
        isLandscape: isLandscape(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ErrorBanner);
