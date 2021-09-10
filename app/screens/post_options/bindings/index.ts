// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch, ActionCreatorsMapObject} from 'redux';

import {doAppCall, postEphemeralCallResponseForPost} from '@actions/apps';
import {handleGotoLocation} from '@mm-redux/actions/integrations';
import {AppBindingLocations} from '@mm-redux/constants/apps';
import {getThreadAppsBindingsChannelId, makeAppBindingsSelector, makeRHSAppBindingSelector} from '@mm-redux/selectors/entities/apps';
import {getChannel, getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';
import {GenericAction, ActionFunc} from '@mm-redux/types/actions';
import {AppBinding} from '@mm-redux/types/apps';
import {Post} from '@mm-redux/types/posts';
import {GlobalState} from '@mm-redux/types/store';
import {DoAppCall, PostEphemeralCallResponseForPost} from '@mm-types/actions/apps';
import {appsEnabled} from '@utils/apps';

import Bindings from './bindings';

type OwnProps = {
    post: Post;
}

const emptyBindings: AppBinding[] = [];

const getPostMenuBindings = makeAppBindingsSelector(AppBindingLocations.POST_MENU_ITEM);
const getThreadPostMenuBindings = makeRHSAppBindingSelector(AppBindingLocations.POST_MENU_ITEM);

function mapStateToProps(state: GlobalState, props: OwnProps) {
    const apps = appsEnabled(state);
    let bindings: AppBinding[] | null = emptyBindings;
    if (apps) {
        if (props.post.channel_id === getCurrentChannelId(state)) {
            bindings = getPostMenuBindings(state);
        } else if (props.post.channel_id === getThreadAppsBindingsChannelId(state)) {
            bindings = getThreadPostMenuBindings(state);
        } else {
            bindings = null;
        }
    }

    const currentUser = getCurrentUser(state);
    const teamID = getChannel(state, props.post.channel_id)?.team_id || getCurrentTeamId(state);

    return {
        theme: getTheme(state),
        bindings,
        currentUser,
        teamID,
        appsEnabled: apps,
    };
}

type Actions = {
    doAppCall: DoAppCall;
    postEphemeralCallResponseForPost: PostEphemeralCallResponseForPost;
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doAppCall,
            postEphemeralCallResponseForPost,
            handleGotoLocation,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(Bindings);
