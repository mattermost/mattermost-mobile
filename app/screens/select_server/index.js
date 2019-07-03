// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {realmConnect} from 'realm-react-redux';

import {setLastUpgradeCheck} from 'app/actions/views/client_upgrade';
import {loadConfigAndLicense, pingServer, scheduleExpiredNotification} from 'app/actions/realm/general';
import {handleSuccessfulLogin, login} from 'app/actions/realm/user';
import {handleServerUrlChanged} from 'app/actions/views/select_server';
import getClientUpgrade from 'app/selectors/client_upgrade';
import {getDefaultTheme} from 'app/selectors/theme';
import ReactRealmContext from 'app/store/realm_context';
import {reduxStore} from 'app/store';
import {getConfig, getLicense} from 'app/utils/realm/general';

const options = {
    context: ReactRealmContext,
};

import SelectServer from './select_server';

function mapPropsToQueries(realm) {
    const general = realm.objects('General');
    return [general];
}

function mapQueriesToProps([general]) {
    const config = getConfig(general);
    const license = getLicense(general);
    const state = reduxStore.getState();
    const {currentVersion, latestVersion, minVersion} = getClientUpgrade(state);

    return {
        ...state.views.selectServer,
        config,
        currentVersion,
        hasConfigAndLicense: Boolean(config && license),
        latestVersion,
        license,
        minVersion,
        theme: getDefaultTheme(config),
    };
}

function mapRealmDispatchToProps(dispatch) {
    const actions = bindActionCreators({
        handleSuccessfulLogin,
        loadConfigAndLicense,
        login,
        pingServer,
        scheduleExpiredNotification,
    }, dispatch);

    const reduxActions = bindActionCreators({
        handleServerUrlChanged,
        setLastUpgradeCheck,
    }, reduxStore.dispatch);
    return {
        ...actions,
        reduxActions,
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(SelectServer);
