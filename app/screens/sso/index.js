// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {realmConnect} from 'realm-react-redux';

import {scheduleExpiredNotification} from 'app/actions/realm/general';
import {ssoLogin} from 'app/actions/realm/user';
import ReactRealmContext from 'app/store/realm_context';

import SSO from './sso';

const options = {
    context: ReactRealmContext,
};

function mapRealmDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            scheduleExpiredNotification,
            ssoLogin,
        }, dispatch),
    };
}

export default realmConnect(null, null, mapRealmDispatchToProps, null, options)(SSO);
