// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getDimensions} from 'app/selectors/device';
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import Autocomplete from './autocomplete';

function mapStateToProps(state) {
    const {deviceHeight} = getDimensions(state);
    return {
        deviceHeight,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(Autocomplete);
