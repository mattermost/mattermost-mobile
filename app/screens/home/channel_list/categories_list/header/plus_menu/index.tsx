// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {Screens} from '@constants';
import {dismissBottomSheet, navigateToScreen} from '@screens/navigation';

import PlusMenuItem from './item';
import PlusMenuSeparator from './separator';

type Props = {
    canCreateChannels: boolean;
    canJoinChannels: boolean;
    canInvitePeople: boolean;
}

const PlusMenuList = ({canCreateChannels, canJoinChannels, canInvitePeople}: Props) => {
    const browseChannels = useCallback(async () => {
        await dismissBottomSheet();
        navigateToScreen(Screens.BROWSE_CHANNELS);
    }, []);

    const createNewChannel = useCallback(async () => {
        await dismissBottomSheet();
        navigateToScreen(Screens.CREATE_OR_EDIT_CHANNEL);
    }, []);

    const openDirectMessage = useCallback(async () => {
        await dismissBottomSheet();

        navigateToScreen(Screens.CREATE_DIRECT_MESSAGE);
    }, []);

    const invitePeopleToTeam = useCallback(async () => {
        await dismissBottomSheet();

        navigateToScreen(Screens.INVITE);
    }, []);

    return (
        <>
            {canJoinChannels &&
            <PlusMenuItem
                pickerAction='browseChannels'
                onPress={browseChannels}
            />
            }
            {canCreateChannels &&
            <PlusMenuItem
                pickerAction='createNewChannel'
                onPress={createNewChannel}
            />
            }
            <PlusMenuItem
                pickerAction='openDirectMessage'
                onPress={openDirectMessage}
            />
            {canInvitePeople &&
            <>
                <PlusMenuSeparator/>
                <PlusMenuItem
                    pickerAction='invitePeopleToTeam'
                    onPress={invitePeopleToTeam}
                />
            </>
            }
        </>
    );
};

export default PlusMenuList;
