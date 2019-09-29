// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General} from 'app/constants';
import options from 'app/store/realm_options';

import TeamIcon from './team_icon';

/* eslint-disable camelcase*/
function mapPropsToQueries(realm, ownProps) {
    const team = realm.objectForPrimaryKey('Team', ownProps.teamId) || General.REALM_EMPTY_OBJECT;

    return [team];
}

function mapQueriesToProps([team]) {
    return {
        displayName: team?.displayName,
        lastIconUpdateAt: team?.lastIconUpdateAt,
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, null, null, options)(TeamIcon);
