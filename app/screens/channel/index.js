// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {peek, goToScreen, showModalOverCurrentContext} from 'app/actions/navigation';
import {General, Preferences} from 'app/constants';
import {loadChannelsForTeam, loadSidebarDirectMessagesProfiles, selectInitialChannel} from 'app/realm/actions/channel';
import {recordLoadTime} from 'app/realm/actions/general';
import {selectDefaultTeam} from 'app/realm/actions/team';
import {getTheme} from 'app/realm/selectors/theme';
import {shouldShowTermsOfService} from 'app/realm/selectors/user';
import options from 'app/store/realm_options';

import Channel from './channel';

function mapPropsToQueries(realm) {
    const general = realm.objects('General').filtered(`id="${General.REALM_SCHEMA_ID}"`);
    const themePreference = realm.objects('Preference').filtered(`category="${Preferences.CATEGORY_THEME}"`);
    const currentUser = realm.objectForPrimaryKey('User', general[0].currentUserId);
    return [currentUser, general, themePreference];
}

function mapQueriesToProps([currentUser, general, themePreference]) {
    return {
        currentChannelId: general[0]?.currentChannelId,
        currentTeamId: general[0]?.currentTeamId,
        currentUserId: currentUser?.id,
        theme: getTheme(general, themePreference),
        showTermsOfService: shouldShowTermsOfService(currentUser, general[0]),
    };
}

const mapRealmDispatchToProps = {
    goToScreen,
    loadChannelsForTeam,
    loadSidebarDirectMessagesProfiles,
    peek,
    selectDefaultTeam,
    selectInitialChannel,
    showModalOverCurrentContext,
    recordLoadTime,
};

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(Channel);
