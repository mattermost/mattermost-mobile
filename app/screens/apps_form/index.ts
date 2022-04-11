// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';

import {doAppFetchForm, doAppLookup, doAppSubmit, postEphemeralCallResponseForContext} from '@actions/apps';
import {handleGotoLocation} from '@mm-redux/actions/integrations';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {ActionFunc, GenericAction} from '@mm-redux/types/actions';
import {GlobalState} from '@mm-redux/types/store';
import {DoAppFetchForm, DoAppLookup, DoAppSubmit, PostEphemeralCallResponseForContext} from '@mm-types/actions/apps';

import AppsFormContainer from './apps_form_container';

type Actions = {
    doAppSubmit: DoAppSubmit<any>;
    doAppFetchForm: DoAppFetchForm<any>;
    doAppLookup: DoAppLookup<any>;
    postEphemeralCallResponseForContext: PostEphemeralCallResponseForContext;
};

function mapStateToProps(state: GlobalState) {
    return {
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doAppSubmit,
            doAppFetchForm,
            doAppLookup,
            postEphemeralCallResponseForContext,
            handleGotoLocation,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AppsFormContainer);
