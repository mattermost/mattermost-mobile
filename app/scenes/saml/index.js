// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {handleSuccessfulLogin} from 'app/actions/views/login';
import {goToLoadTeam} from 'app/actions/navigation';
import {setStoreFromLocalData} from 'app/actions/views/root';

import Saml from './saml';

function mapStateToProps(state) {
    return {
        ...state.views.selectServer
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSuccessfulLogin,
            setStoreFromLocalData,
            goToLoadTeam
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(Saml);
