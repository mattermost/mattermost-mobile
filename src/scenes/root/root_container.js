// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goToSelectServer} from 'actions/views/root';

import Root from './root';

function mapStateToProps(state, ownProps) {
    return ownProps;
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToSelectServer
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Root);
