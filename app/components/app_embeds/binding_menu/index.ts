// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import EmbedMenu from './binding_menu';
import {GlobalState} from '@mm-redux/types/store';
import {doAppCall} from '@actions/apps';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {ActionFunc, ActionResult, GenericAction} from '@mm-redux/types/actions';
import {AppCall} from '@mm-redux/types/apps';

function mapStateToProps(state: GlobalState) {
    return {
        userId: getCurrentUserId(state),
    };
}

type Actions = {
    doAppCall: (call: AppCall) => Promise<ActionResult>;
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doAppCall,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EmbedMenu);
