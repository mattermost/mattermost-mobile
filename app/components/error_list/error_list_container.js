// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getDisplayableErrors} from 'service/selectors/errors';
import {dismissError, clearErrors} from 'service/actions/errors';

import ErrorList from './error_list';

function mapStateToProps(state) {
    return {
        errors: getDisplayableErrors(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            dismissError,
            clearErrors
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ErrorList);
