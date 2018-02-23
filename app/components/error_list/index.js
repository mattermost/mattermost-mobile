// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getDisplayableErrors} from 'mattermost-redux/selectors/errors';
import {dismissError, clearErrors} from 'mattermost-redux/actions/errors';

import ErrorList from './error_list';

function mapStateToProps(state) {
    return {
        errors: getDisplayableErrors(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            dismissError,
            clearErrors,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ErrorList);
