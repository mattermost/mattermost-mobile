// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';

import About from './about';

function mapStateToProps(state) {
    const config = getConfig(state);
    const license = getLicense(state);

    return {
        config,
        license,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(About);
