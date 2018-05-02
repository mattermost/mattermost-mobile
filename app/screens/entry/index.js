// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable global-require*/
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {setDeviceToken} from 'mattermost-redux/actions/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {isLandscape} from 'app/selectors/device';

const lazyLoadEntry = () => {
    return require('./entry').default;
};

function mapStateToProps(state) {
    const {config} = state.entities.general;

    return {
        config,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
        hydrationComplete: state.views.root.hydrationComplete,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            setDeviceToken,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(lazyLoadEntry());
