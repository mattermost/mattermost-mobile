// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {dismissError, clearErrors} from 'service/actions/errors';

import ErrorList from './error_list';

function mapStateToProps(state) {
    return {
        errors: state.errors.filter((error) => error.displayable)
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
