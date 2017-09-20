// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {
    handlePostDraftSelectionChanged
} from 'app/actions/views/channel';

import Code from './code';

function mapStateToProps(state) {
    return {
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handlePostDraftSelectionChanged
        }, dispatch)
    };
}
