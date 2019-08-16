// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {resetToChannel} from 'app/actions/navigation';
import {scheduleExpiredNotification} from 'app/realm/actions/general';
import {ssoLogin} from 'app/realm/actions/user';
import options from 'app/store/realm_options';

import SSO from './sso';

const mapRealmDispatchToProps = {
    resetToChannel,
    scheduleExpiredNotification,
    ssoLogin,
};

export default realmConnect(null, null, mapRealmDispatchToProps, null, options)(SSO);
