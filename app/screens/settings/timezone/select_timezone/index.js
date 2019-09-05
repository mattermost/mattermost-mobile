// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getSupportedTimezones} from 'mattermost-redux/selectors/entities/general';

import {popTopScreen} from 'app/actions/navigation';
import {isLandscape} from 'app/selectors/device';
import SelectTimezone from './select_timezone';

function mapStateToProps(state, props) {
    const {selectedTimezone} = props;
    const supportedTimezones = getSupportedTimezones(state);

    let index = 0;

    const timezoneIndex = supportedTimezones.findIndex((timezone) => timezone === selectedTimezone);
    if (timezoneIndex > 0) {
        index = timezoneIndex;
    }

    return {
        theme: getTheme(state),
        timezones: supportedTimezones,
        initialScrollIndex: index,
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            popTopScreen,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectTimezone);
