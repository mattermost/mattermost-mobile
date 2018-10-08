// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {logout} from 'mattermost-redux/actions/users';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

import TermsOfService from './terms_of_service.js';

function mapStateToProps(state) {
    const config = getConfig(state);

    return {
        customServiceTermsId: config.CustomServiceTermsId,
        privacyPolicyLink: config.PrivacyPolicyLink,
        siteName: config.SiteName,
        termsEnabled: config.EnableCustomServiceTerms === 'true',
        termsOfServiceLink: config.TermsOfServiceLink,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            logout,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(TermsOfService);
