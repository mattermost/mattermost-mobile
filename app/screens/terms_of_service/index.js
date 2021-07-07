// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getTermsOfService, updateMyTermsOfServiceStatus} from '@mm-redux/actions/users';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';

import TermsOfService from './terms_of_service.js';

import {logout} from 'app/actions/views/user';

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
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(TermsOfService);
