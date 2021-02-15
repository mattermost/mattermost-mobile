// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionFunc, GenericAction} from '@mm-redux/types/actions';
import {Channel} from '@mm-redux/types/channels';
import {UserProfile} from '@mm-redux/types/users';
import {connect} from 'react-redux';
import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';
import {autocompleteUsers} from '@mm-redux/actions/users';
import {autocompleteChannels} from '@mm-redux/actions/channels';

import AppsFormField from './apps_form_field';

type Actions = {
    autocompleteChannels: (term: string, success: (channels: Channel[]) => void, error: () => void) => (dispatch: any, getState: any) => Promise<void>;
    autocompleteUsers: (search: string) => Promise<UserProfile[]>;
};

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            autocompleteChannels,
            autocompleteUsers,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps)(AppsFormField);
