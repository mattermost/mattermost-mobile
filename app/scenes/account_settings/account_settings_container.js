// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import {getTheme} from 'service/selectors/entities/preferences';

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

        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(AccountSettings);
