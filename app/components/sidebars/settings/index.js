// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {
    showModal,
    showModalOverCurrentContext,
    dismissModal,
} from 'app/actions/navigation';
import {General} from 'app/constants';
import {logout, setStatus} from 'app/realm/actions/user';
import options from 'app/store/realm_options';

import SettingsSidebar from './settings_sidebar';

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
    const currentUser = realm.objectForPrimaryKey('User', general.currentUserId);

    return [currentUser];
}

function mapQueriesToProps([currentUser]) {
    return {
        currentUser,
    };
}

const mapRealmDispatchToProps = {
    dismissModal,
    logout,
    setStatus,
    showModal,
    showModalOverCurrentContext,
};

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(SettingsSidebar);
