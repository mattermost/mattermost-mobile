// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import Autocomplete from './autocomplete';

import {getDimensions} from 'app/selectors/device';

function mapStateToProps(state) {
    const {deviceHeight} = getDimensions(state);
    return {
        deviceHeight,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(Autocomplete);
