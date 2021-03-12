// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import {GlobalState} from '@mm-redux/types/store';
import {ActionFunc, ActionResult, GenericAction} from '@mm-redux/types/actions';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {AppCallRequest} from '@mm-redux/types/apps';
import {doAppCall} from '@actions/apps';
import {getPost} from '@mm-redux/selectors/entities/posts';

import ButtonBinding from './button_binding';

type OwnProps = {
    postId: string;
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    return {
        userId: getCurrentUserId(state),
        theme: getTheme(state),
        post: getPost(state, ownProps.postId),
    };
}

type Actions = {
    doAppCall: (call: AppCallRequest, intl: any) => Promise<ActionResult>;
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doAppCall,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ButtonBinding);
