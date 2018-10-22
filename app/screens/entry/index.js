// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {setDeviceToken} from 'mattermost-redux/actions/general';
import {autoUpdateTimezone} from 'mattermost-redux/actions/timezone';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {isLandscape} from 'app/selectors/device';
import {getDeviceTimezone, isTimezoneEnabled} from 'app/utils/timezone';

const lazyLoadEntry = () => {
    return require('./entry').default;
};

function mapStateToProps(state) {
    const enableTimezone = isTimezoneEnabled(state);
    const deviceTimezone = getDeviceTimezone();

    return {
        theme: getTheme(state),
        isLandscape: isLandscape(state),
        enableTimezone,
        deviceTimezone,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            autoUpdateTimezone,
            setDeviceToken,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(lazyLoadEntry());
