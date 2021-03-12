// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {doAppCall} from '@actions/apps';

import {AppCallResponse, AppCallRequest, AppCallType} from '@mm-redux/types/apps';
import {GlobalState} from '@mm-redux/types/store';
import {ActionFunc, GenericAction} from '@mm-redux/types/actions';

import AppsFormContainer from './apps_form_container';

type Actions = {
    doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<{data: AppCallResponse}>;
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
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AppsFormContainer);
