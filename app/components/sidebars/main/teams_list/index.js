// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General} from 'app/constants';
import {showModal} from 'app/actions/navigation';
import {handleTeamChange} from 'app/realm/actions/team';
import EphemeralStore from 'app/store/ephemeral_store';
import {removeProtocol} from 'app/utils/url';

import TeamsList from './teams_list';

import options from 'app/store/realm_options';

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
    const user = realm.objectForPrimaryKey('User', general.currentUserId);
    const openTeams = realm.objects('Team').filtered('allowOpenInvites=true AND deleteAt=0 AND members.user.id != $0', user.id);
    const myTeams = realm.objects('Team').filtered('members.user.id=$0 AND deleteAt=0', user.id).sorted('displayName');
    return [myTeams, openTeams];
}

function mapQueriesToProps([myTeams, openTeams]) {
    return {
        currentUrl: removeProtocol(EphemeralStore.currentServerUrl),
        hasOtherJoinableTeams: !openTeams.isEmpty(),
        teams: myTeams,
    };
}

const mapRealmDispatchToProps = {
    handleTeamChange,
    showModal,
};

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(TeamsList);
