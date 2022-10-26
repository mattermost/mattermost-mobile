// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard} from 'react-native';

import {addMembersToChannel, makeDirectChannel, makeGroupChannel} from '@actions/remote/channel';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import MembersModal from '@screens/members_modal';
import {dismissModal} from '@screens/navigation';
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
    buttonText: {
        id: t('mobile.channel_add_people.title'),
        defaultMessage: 'Add Members',
    },
});

type Props = {
    componentId: string;
    currentChannelId: string;
    teammateNameDisplay: string;
}

const close = () => {
    Keyboard.dismiss();
    dismissModal();
};

export default function ChannelAddPeople({
    componentId,
    currentChannelId,
    teammateNameDisplay,
}: Props) {
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const [startingConversation, setStartingConversation] = useState(false);
    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});

    const addMembers = useCallback(async (ids: string[]): Promise<boolean> => {
        // addMembersToChannel(serverUrl: string, channelId: string, userIds: string[], postRootId = '', fetchOnly = false) {
        console.log('currentChannelId', currentChannelId);
        console.log('ids', ids);
        const result = await addMembersToChannel(serverUrl, currentChannelId, ids);
        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.dm);
        }
        return !result.error;
    }, [selectedIds, intl.locale, teammateNameDisplay, serverUrl]);

    const startConversation = useCallback(async (selectedId?: {[id: string]: boolean}) => {
        if (startingConversation) {
            return;
        }

        setStartingConversation(true);

        const idsToUse = selectedId ? Object.keys(selectedId) : Object.keys(selectedIds);
        let success;
        if (idsToUse.length === 0) {
            success = false;
        } else {
            console.log('. IN HERE!');

            success = await addMembers(idsToUse);
        }

        if (success) {
            close();
        } else {
            setStartingConversation(false);
        }
    }, [startingConversation, selectedIds, addMembers]);

    return (
        <MembersModal
            componentId={componentId}
            selectUsersButtonIcon={'account-plus-outline'}
            selectUsersButtonText={intl.formatMessage(messages.buttonText)}
            selectUsersMax={7}
            selectUsersWarn={5}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            startConversation={startConversation}
            startingConversation={startingConversation}
        />
    );
}

