// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getDisplayableErrors} from '@mm-redux/selectors/errors';
import {dismissError, clearErrors} from '@mm-redux/actions/errors';

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
