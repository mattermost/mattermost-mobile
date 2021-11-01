// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch, ActionCreatorsMapObject} from 'redux';

import {doAppCall, postEphemeralCallResponseForChannel} from '@actions/apps';
import {handleGotoLocation} from '@mm-redux/actions/integrations';
import {AppBindingLocations} from '@mm-redux/constants/apps';
import {makeAppBindingsSelector} from '@mm-redux/selectors/entities/apps';
import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {GenericAction, ActionFunc} from '@mm-redux/types/actions';
import {AppBinding} from '@mm-redux/types/apps';
import {GlobalState} from '@mm-redux/types/store';
import {DoAppCall, PostEphemeralCallResponseForChannel} from '@mm-types/actions/apps';
import {appsEnabled} from '@utils/apps';

import Bindings from './bindings';

const getChannelHeaderBindings = makeAppBindingsSelector(AppBindingLocations.CHANNEL_HEADER_ICON);
const emptyBindingsList: AppBinding[] = [];

function mapStateToProps(state: GlobalState) {
    const apps = appsEnabled(state);
    const currentChannel = getCurrentChannel(state);
    const bindings = apps ? getChannelHeaderBindings(state) : emptyBindingsList;

    return {
        bindings,
        currentChannel,
        appsEnabled: apps,
        currentTeamId: getCurrentTeamId(state),
    };
}

type Actions = {
    doAppCall: DoAppCall;
    postEphemeralCallResponseForChannel: PostEphemeralCallResponseForChannel;
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doAppCall,
            postEphemeralCallResponseForChannel,
            handleGotoLocation,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(Bindings);
