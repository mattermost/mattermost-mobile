// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goToNotification} from 'app/actions/views/root';
import {getTheme} from 'app/selectors/preferences';

import Notification from './notification';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToNotification
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Notification);
