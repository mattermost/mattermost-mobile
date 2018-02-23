// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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

export default connect(mapStateToProps, null, null, {withRef: true})(Autocomplete);
