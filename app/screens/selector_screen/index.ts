// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';

import {getChannels, searchChannels} from '@mm-redux/actions/channels';
import {getProfiles, searchProfiles} from '@mm-redux/actions/users';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {ActionFunc, ActionResult, GenericAction} from '@mm-redux/types/actions';
import {GlobalState} from '@mm-redux/types/store';

import SelectorScreen from './selector_screen';

function mapStateToProps(state: GlobalState) {
    const menuAction = state.views.post.selectedMenuAction || {};

    const data = menuAction.options || [];

    return {
        currentTeamId: getCurrentTeamId(state),
        data,
        dataSource: menuAction.dataSource,
        onSelect: menuAction.onSelect,
        getDynamicOptions: menuAction.getDynamicOptions,
        theme: getTheme(state),
    };
}

type Actions = {
    getProfiles: (page?: number, perPage?: number, options?: any) => Promise<ActionResult>;
    getChannels: (teamId: string, page?: number, perPage?: number) => Promise<ActionResult>;
    searchProfiles: (term: string, options?: any) => Promise<ActionResult>;
    searchChannels: (teamId: string, term: string, archived?: boolean | undefined) => Promise<ActionResult>;
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

export default connect(mapStateToProps, mapDispatchToProps)(SelectorScreen);
