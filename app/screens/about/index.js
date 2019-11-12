// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';
import {isLandscape} from 'app/selectors/device';

import About from './about';

function mapStateToProps(state) {
    const config = getConfig(state);
    const license = getLicense(state);

    return {
        config,
        license,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

export default connect(mapStateToProps)(About);
