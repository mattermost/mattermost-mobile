// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {getPing, getClientConfig} from 'actions/general';
import SelectServerView from 'components/select_server_view';

function mapStateToProps(state) {
    return {
        ping: state.entities.general.ping,
        device: state.views.device
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({getPing, getClientConfig}, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectServerView);
