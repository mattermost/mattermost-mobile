// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General} from 'app/constants';
import {handleSelectChannel, joinChannel, logChannelSwitch, makeDirectChannel} from 'app/realm/actions/channel';
import {getTeams} from 'app/realm/actions/team';
import options from 'app/store/realm_options';

import MainSidebar from './main_sidebar.js';

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
    const teams = realm.objects('Team').filtered('members.user.id = $0 AND deleteAt = 0', general.currentUserId);
    return [teams];
}

function mapQueriesToProps([teams]) {
    return {
        teamsCount: teams.length,
    };
}

const mapRealmDispatchToProps = {
    getTeams,
    handleSelectChannel,
    joinChannel,
    logChannelSwitch,
    makeDirectChannel,
};

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(MainSidebar);
