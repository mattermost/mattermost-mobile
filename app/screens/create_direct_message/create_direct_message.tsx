// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard} from 'react-native';

import {makeDirectChannel, makeGroupChannel} from '@actions/remote/channel';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissModal} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {displayUsername} from '@utils/user';

import MembersModal from './members_modal';

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
        id: t('create_direct_message.start'),
        defaultMessage: 'Start Conversation',
    },
});

type Props = {
    componentId: string;
    teammateNameDisplay: string;
}

const close = () => {
    Keyboard.dismiss();
    dismissModal();
};

export default function CreateDirectMessage({
    componentId,
    teammateNameDisplay,
}: Props) {
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const [startingConversation, setStartingConversation] = useState(false);
    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});

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

    const startConversation = useCallback(async (selectedId?: {[id: string]: boolean}) => {
        if (startingConversation) {
            return;
        }

        setStartingConversation(true);

        const idsToUse = selectedId ? Object.keys(selectedId) : Object.keys(selectedIds);
        let success;
        if (idsToUse.length === 0) {
            success = false;
        } else if (idsToUse.length > 1) {
            success = await createGroupChannel(idsToUse);
        } else {
            success = await createDirectChannel(idsToUse[0]);
        }

        if (success) {
            close();
        } else {
            setStartingConversation(false);
        }
    }, [startingConversation, selectedIds, createGroupChannel, createDirectChannel]);

    return (
        <MembersModal
            componentId={componentId}
            selectUsersButtonIcon={'forum-outline'}
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

