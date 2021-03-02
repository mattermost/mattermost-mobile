// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getProfiles, searchProfiles} from '@mm-redux/actions/users';
import {getChannels, searchChannels} from '@mm-redux/actions/channels';
import AppSelectorScreen from './app_selector_screen';
import {ActionFunc, ActionResult, GenericAction} from '@mm-redux/types/actions';
import {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    return {
        currentTeamId: getCurrentTeamId(state),
        theme: getTheme(state),
    };
}

type Actions = {
    getProfiles: (page?: number, perPage?: number, options?: any) => Promise<ActionResult>;
    getChannels: (teamId: string, page?: number, perPage?: number) => Promise<ActionResult>;
    searchProfiles: (term: string, options?: any) => Promise<ActionResult>;
    searchChannels: (teamId: string, term: string, archived?: boolean) => Promise<ActionResult>;
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            getProfiles,
            getChannels,
            searchProfiles,
            searchChannels,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AppSelectorScreen);
