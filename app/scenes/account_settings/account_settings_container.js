// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import {goToAccountNotifications} from 'app/actions/navigation';
import {getTheme} from 'app/selectors/preferences';

import navigationSceneConnect from '../navigationSceneConnect';
import AccountSettings from './account_settings';

function mapStateToProps(state) {
    return {
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToAccountNotifications
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(AccountSettings);
