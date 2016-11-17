// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getPing} from 'actions/general';
import {handleServerUrlChanged} from 'actions/views/select_server';

import SelectServer from './select_server';

function mapStateToProps(state) {
    return {
        ...state.views.SelectServer,
        ping: state.entities.general.ping
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getPing,
            handleServerUrlChanged
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectServer);
