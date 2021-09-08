// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {appsEnabled} from '@mm-redux/selectors/entities/apps';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getDimensions} from '@selectors/device';

import Autocomplete from './autocomplete';

function mapStateToProps(state) {
    const {deviceHeight} = getDimensions(state);
    return {
        deviceHeight,
        theme: getTheme(state),
        appsEnabled: appsEnabled(state),
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(Autocomplete);
