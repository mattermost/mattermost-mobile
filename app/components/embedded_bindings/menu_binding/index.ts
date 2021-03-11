// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import {GlobalState} from '@mm-redux/types/store';
import {doAppCall} from '@actions/apps';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {ActionFunc, ActionResult, GenericAction} from '@mm-redux/types/actions';
import {AppCallRequest} from '@mm-redux/types/apps';
import {getPost} from '@mm-redux/selectors/entities/posts';

import MenuBinding from './menu_binding';

type OwnProps = {
    postId: string;
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    return {
        userId: getCurrentUserId(state),
        post: getPost(state, ownProps.postId),
    };
}

type Actions = {
    doAppCall: (call: AppCallRequest) => Promise<ActionResult>;
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doAppCall,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MenuBinding);
