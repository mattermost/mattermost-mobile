// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTermsOfService, logout, updateMyTermsOfServiceStatus} from 'mattermost-redux/actions/users';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {
    setButtons,
    dismissModal,
    dismissAllModals,
} from 'app/actions/navigation';

import TermsOfService from './terms_of_service.js';

function mapStateToProps(state) {
    const config = getConfig(state);

    return {
        siteName: config.SiteName,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTermsOfService,
            logout,
            updateMyTermsOfServiceStatus,
            setButtons,
            dismissModal,
            dismissAllModals,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(TermsOfService);
