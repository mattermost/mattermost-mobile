// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import BindingButton from './binding_button';
import {GlobalState} from '@mm-redux/types/store';
import {ActionFunc, ActionResult, GenericAction} from '@mm-redux/types/actions';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {AppCall} from '@mm-redux/types/apps';
import {doAppCall} from '@actions/apps';

function mapStateToProps(state: GlobalState) {
    return {
        userId: getCurrentUserId(state),
        theme: getTheme(state),
    };
}

type Actions = {
    doAppCall: (call: AppCall, intl: any) => Promise<ActionResult>;
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doAppCall,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(BindingButton);
