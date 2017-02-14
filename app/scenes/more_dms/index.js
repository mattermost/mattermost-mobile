// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {goBack} from 'app/actions/navigation';
import {makeDirectChannel} from 'app/actions/views/more_dms';
import {getProfiles, searchProfiles} from 'service/actions/users';
import {getMyPreferences, getTheme} from 'service/selectors/entities/preferences';
import {searchProfiles as searchSelector} from 'service/selectors/entities/users';

import MoreDirectMessages from './more_dms';

function mapStateToProps(state, ownProps) {
    const {getProfiles: requestStatus, searchProfiles: searchRequest} = state.requests.users;

    function getUsers() {
        const {profiles, currentId} = state.entities.users;
        const users = {...profiles};
        Reflect.deleteProperty(users, currentId);
        return Object.values(users).sort((a, b) => {
            const nameA = a.username;
            const nameB = b.username;

            return nameA.localeCompare(nameB);
        });
    }

    return {
        ...ownProps,
        preferences: getMyPreferences(state),
        profiles: getUsers(),
        search: searchSelector(state),
        theme: getTheme(state),
        requestStatus,
        searchRequest
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goBack,
            makeDirectChannel,
            getProfiles,
            searchProfiles
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(MoreDirectMessages);
