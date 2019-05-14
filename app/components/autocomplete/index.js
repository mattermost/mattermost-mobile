// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {getDimensions} from 'app/selectors/device';

import Autocomplete from './autocomplete';

function mapStateToProps(state) {
    const {deviceHeight} = getDimensions(state);
    return {
        deviceHeight,
        theme: getTheme(state),
    };
}

export const AUTOCOMPLETE_MAX_HEIGHT = 200;

export default connect(mapStateToProps, null, null, {forwardRef: true})(Autocomplete);
