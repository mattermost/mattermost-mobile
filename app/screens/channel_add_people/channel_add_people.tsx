// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import {addMembersToChannel} from '@actions/remote/channel';
import {fetchProfilesNotInChannel, searchProfiles} from '@actions/remote/user';
import UsersModal from '@components/users_modal';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {ChannelModel} from '@database/models/server';
import {t} from '@i18n';
import {alertErrorWithFallback} from '@utils/draft';

// import {displayUsername} from '@utils/user';

const messages = defineMessages({
    add_people: {
        id: t('mobile.add_people.error'),
        defaultMessage: "We couldn't add those users to the channel. Please check your connection and try again.",
    },
    button: {
        id: t('mobile.channel_add_people.title'),
        defaultMessage: 'Add Members',
    },
});

type Props = {
    componentId: string;
    currentChannel: ChannelModel;
    currentTeamId: string;
    currentUserId: string;
    restrictDirectMessage: boolean;
    teammateNameDisplay: string;
}

export default function ChannelAddPeople({
    componentId,
    currentChannel,
    currentTeamId,
    currentUserId,
    restrictDirectMessage,
    teammateNameDisplay,
}: Props) {
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});
    const [page, setPage] = useState(-1);

    const groupConstrained = currentChannel.isGroupConstrained;
    const currentChannelId = currentChannel.id;

    const getProfiles = useCallback(async () => {
        return fetchProfilesNotInChannel(serverUrl, currentTeamId, currentChannelId, groupConstrained, page + 1, General.PROFILE_CHUNK_SIZE);
    }, [serverUrl, currentTeamId]);

    const onButtonTap = useCallback(async (selectedId?: {[id: string]: boolean}) => {
        const idsToUse = selectedId ? Object.keys(selectedId) : Object.keys(selectedIds);
        const result = await addMembersToChannel(serverUrl, currentChannelId, idsToUse, '', false);

        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.add_people);
        }
        return !result.error;
    }, [selectedIds]);

    // search only users not in channel
    const searchUsers = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        if (restrictDirectMessage) {
            return searchProfiles(serverUrl, lowerCasedTerm, {team_id: currentTeamId, allow_inactive: true});
        }
        return searchProfiles(serverUrl, lowerCasedTerm, {allow_inactive: true});
    }, [restrictDirectMessage, serverUrl, currentTeamId]);

    return (
        <UsersModal
            buttonText={messages.button}
            componentId={componentId}
            currentUserId={currentUserId}
            getProfiles={getProfiles}
            maxSelectedUsers={General.MAX_USERS_IN_GM}
            page={page}
            searchUsers={searchUsers}
            selectedIds={selectedIds}
            setPage={setPage}
            setSelectedIds={setSelectedIds}
            teammateNameDisplay={teammateNameDisplay}
            onButtonTap={onButtonTap}
        />
    );
}

