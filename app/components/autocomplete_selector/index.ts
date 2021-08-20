// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';

import {setAutocompleteSelector} from '@actions/views/post';
import {getTeammateNameDisplaySetting, getTheme} from '@mm-redux/selectors/entities/preferences';

import AutocompleteSelector from './autocomplete_selector';

import type {Action, ActionResult, GenericAction} from '@mm-redux/types/actions';
import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    return {
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        theme: getTheme(state),
    };
}

type Actions = {
    setAutocompleteSelector: (dataSource: any, onSelect: any, options: any, getDynamicOptions: any) => Promise<ActionResult>;
}
function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<Action>, Actions>({
            setAutocompleteSelector,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AutocompleteSelector);
