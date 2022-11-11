// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import {makeDirectChannel, makeGroupChannel} from '@actions/remote/channel';
import {fetchProfiles, fetchProfilesInTeam, searchProfiles} from '@actions/remote/user';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import MembersModal from '@screens/members_modal';
import {alertErrorWithFallback} from '@utils/draft';
import {displayUsername} from '@utils/user';

const messages = defineMessages({
    dm: {
        id: 'mobile.open_dm.error',
        defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again.",
    },
    gm: {
        id: t('mobile.open_gm.error'),
        defaultMessage: "We couldn't open a group message with those users. Please check your connection and try again.",
    },
});

type Props = {
    componentId: string;
    currentTeamId: string;
    restrictDirectMessage: boolean;
    teammateNameDisplay: string;
}

export default function CreateDirectMessage({
    componentId,
    currentTeamId,
    restrictDirectMessage,
    teammateNameDisplay,
}: Props) {
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});
    const [page, setPage] = useState(-1);

    const getProfilesFunc = useCallback(async () => {
        if (restrictDirectMessage) {
            return fetchProfilesInTeam(serverUrl, currentTeamId, page + 1, General.PROFILE_CHUNK_SIZE);
        }
        return fetchProfiles(serverUrl, page + 1, General.PROFILE_CHUNK_SIZE);
    }, [restrictDirectMessage, serverUrl, currentTeamId]);

    const createDirectChannel = useCallback(async (id: string): Promise<boolean> => {
        const user = selectedIds[id];
        const displayName = displayUsername(user, intl.locale, teammateNameDisplay);

        const result = await makeDirectChannel(serverUrl, id, displayName);
        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.dm, {displayName});
        }
        return !result.error;
    }, [selectedIds, intl.locale, teammateNameDisplay, serverUrl]);

    const createGroupChannel = useCallback(async (ids: string[]): Promise<boolean> => {
        const result = await makeGroupChannel(serverUrl, ids);
        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.gm);
        }
        return !result.error;
    }, [serverUrl]);

    const startConversationFunc = useCallback(async (selectedId?: {[id: string]: boolean}) => {
        const idsToUse = selectedId ? Object.keys(selectedId) : Object.keys(selectedIds);
        if (idsToUse.length > 1) {
            return createGroupChannel(idsToUse);
        }
        return createDirectChannel(idsToUse[0]);
    }, [selectedIds, createGroupChannel, createDirectChannel]);

    const searchUsersFunc = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        if (restrictDirectMessage) {
            return searchProfiles(serverUrl, lowerCasedTerm, {team_id: currentTeamId, allow_inactive: true});
        }
        return searchProfiles(serverUrl, lowerCasedTerm, {allow_inactive: true});
    }, [restrictDirectMessage, serverUrl, currentTeamId]);

    return (
        <MembersModal
            componentId={componentId}
            getProfilesFunc={getProfilesFunc}
            page={page}
            searchUsersFunc={searchUsersFunc}
            selectedIds={selectedIds}
            setPage={setPage}
            setSelectedIds={setSelectedIds}
            startConversationFunc={startConversationFunc}
        />
    );
}

