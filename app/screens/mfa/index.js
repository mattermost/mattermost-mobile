// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {login} from '@actions/views/user';

import Mfa from './mfa';

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            login,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps)(Mfa);
