// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import Clipboard from '@react-native-community/clipboard';
import React, {useCallback} from 'react';
import {catchError, combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';
import {WithDatabaseArgs} from '@typings/database/database';
import SystemModel from '@typings/database/models/servers/system';
import TeamModel from '@typings/database/models/servers/team';

import BaseOption from './base_option';

import type PostModel from '@typings/database/models/servers/post';

const {SERVER: {SYSTEM, TEAM}} = MM_TABLES;
const {CURRENT_TEAM_ID} = SYSTEM_IDENTIFIERS;

type Props = {
    teamName?: string;
    post: PostModel;
}
const CopyPermalinkOption = ({teamName, post}: Props) => {
    const serverUrl = useServerUrl();

    // const teamUrl = teamName ? `${serverUrl}/${teamName}` : serverUrl;

    const handleCopyLink = useCallback(() => {
        const teamUrl = `${serverUrl}/${teamName}`;
        const permalink = `${teamUrl}/pl/${post.id}`;

        Clipboard.setString(permalink);
        dismissBottomSheet();
    }, [teamName, post.id]);

    return (
        <BaseOption
            i18nId={t('get_post_link_modal.title')}
            defaultMessage='Copy Link'
            onPress={handleCopyLink}
            iconName='link-variant'
            testID='post.options.copy.permalink'
        />
    );
};

const enhanced = withObservables(['post'], ({post, database}: WithDatabaseArgs & { post: PostModel }) => {
    const currentTeamId = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_TEAM_ID);
    const channel = post.channel.observe();

    const teamName = combineLatest([channel, currentTeamId]).pipe(
        switchMap(([c, tid]) => {
            const teamId = c.teamId || tid;
            return database.
                get<TeamModel>(TEAM).
                findAndObserve(teamId).
                pipe(
                    // eslint-disable-next-line max-nested-callbacks
                    switchMap((team: TeamModel) => of$(team.name)),
                    // eslint-disable-next-line max-nested-callbacks
                    catchError(() => of$('')),
                );
        }),
    );

    return {
        teamName,
    };
},
);

export default withDatabase(enhanced(CopyPermalinkOption));
