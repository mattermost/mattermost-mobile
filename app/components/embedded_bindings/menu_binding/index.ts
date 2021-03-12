// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import {GlobalState} from '@mm-redux/types/store';
import {doAppCall} from '@actions/apps';
import {ActionFunc, ActionResult, GenericAction} from '@mm-redux/types/actions';
import {AppCallRequest, AppCallType} from '@mm-redux/types/apps';
import {getPost} from '@mm-redux/selectors/entities/posts';

import MenuBinding from './menu_binding';
import {getChannel} from '@mm-redux/actions/channels';

type OwnProps = {
    postId: string;
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    return {
        post: getPost(state, ownProps.postId),
    };
}

type Actions = {
    doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<ActionResult>;
    getChannel: (channelId: string) => Promise<ActionResult>;
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doAppCall,
            getChannel,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MenuBinding);
