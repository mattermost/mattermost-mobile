// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {setStatus} from '@mm-redux/actions/users';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUser, getStatusForUserId} from '@mm-redux/selectors/entities/users';
import {getPluginIntegrations} from '@mm-redux/selectors/entities/plugins';
import {fetchMobilePluginIntegrations} from '@mm-redux/actions/plugins';
import {Plugins} from '@mm-redux/constants';

import {logout} from 'app/actions/views/user';

import SettingsSidebar from './settings_sidebar';

function mapStateToProps(state) {
    const currentUser = getCurrentUser(state) || {};
    const status = getStatusForUserId(state, currentUser.id);
    const plugins = getPluginIntegrations(state, Plugins.PLUGIN_LOCATION_SETTINGS);

    return {
        currentUser,
        locale: currentUser?.locale,
        status,
        theme: getTheme(state),
        plugins,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            logout,
            setStatus,
            fetchMobilePluginIntegrations,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(SettingsSidebar);
