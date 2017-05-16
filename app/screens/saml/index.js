// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleSuccessfulLogin} from 'app/actions/views/login';
import {getTheme} from 'app/selectors/preferences';

import {setStoreFromLocalData} from 'mattermost-redux/actions/general';

import Saml from './saml';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        ...state.views.selectServer,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSuccessfulLogin,
            setStoreFromLocalData
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Saml);
