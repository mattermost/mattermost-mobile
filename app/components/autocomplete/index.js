// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {isMinimumServerVersion} from 'mattermost-redux/utils/helpers';

import {getDimensions} from 'app/selectors/device';

import Autocomplete from './autocomplete';

function mapStateToProps(state) {
    const {deviceHeight} = getDimensions(state);
    const serverVersion = state.entities.general.serverVersion;
    const enableDateSuggestion = isMinimumServerVersion(serverVersion, 5, 2);
    return {
        deviceHeight,
        theme: getTheme(state),
        enableDateSuggestion,
    };
}

export default connect(mapStateToProps, null, null, {withRef: true})(Autocomplete);
