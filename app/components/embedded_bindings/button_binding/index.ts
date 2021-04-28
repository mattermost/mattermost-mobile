// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import {GlobalState} from '@mm-redux/types/store';
import {ActionFunc, ActionResult, GenericAction} from '@mm-redux/types/actions';
import {AppCallRequest, AppCallResponse, AppCallType} from '@mm-redux/types/apps';
import {doAppCall} from '@actions/apps';
import {getPost} from '@mm-redux/selectors/entities/posts';

import ButtonBinding from './button_binding';
import {getChannel} from '@mm-redux/actions/channels';
import {sendEphemeralPost} from '@actions/views/post';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {SendEphemeralPost} from 'types/actions/posts';

type OwnProps = {
    postId: string;
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    return {
        theme: getTheme(state),
        post: getPost(state, ownProps.postId),
        currentTeamID: getCurrentTeamId(state),
    };
}

type Actions = {
    doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<{data?: AppCallResponse, error?: AppCallResponse}>;
    getChannel: (channelId: string) => Promise<ActionResult>;
    sendEphemeralPost: SendEphemeralPost;
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doAppCall,
            getChannel,
            sendEphemeralPost,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ButtonBinding);
