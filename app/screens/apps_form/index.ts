// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {doAppCall} from '@actions/apps';

import {AppCallResponse, AppCallRequest, AppCallType} from '@mm-redux/types/apps';
import {GlobalState} from '@mm-redux/types/store';
import {ActionFunc, GenericAction} from '@mm-redux/types/actions';
import {SendEphemeralPost} from 'types/actions/posts';

import AppsFormContainer from './apps_form_container';
import {sendEphemeralPost} from '@actions/views/post';

type Actions = {
    doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<{data?: AppCallResponse, error?: AppCallResponse}>;
    sendEphemeralPost: SendEphemeralPost;
};

function mapStateToProps(state: GlobalState) {
    return {
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doAppCall,
            sendEphemeralPost,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AppsFormContainer);
