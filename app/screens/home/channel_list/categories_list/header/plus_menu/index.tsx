// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {Screens} from '@constants';
import {dismissBottomSheet, navigateToScreen} from '@screens/navigation';

import PlusMenuItem from './item';
import PlusMenuSeparator from './separator';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    canCreateChannels: boolean;
    canJoinChannels: boolean;
    canInvitePeople: boolean;
}

const PlusMenuList = ({canCreateChannels, canJoinChannels, canInvitePeople}: Props) => {
    // Extra settle after dismissBottomSheet so Fabric finishes unmounting
    // slide-up ReactTextViews before the next screen mounts (Android addViewAt
    // races on Invite / Browse Channels — CI MM-T5360).
    const navigateAfterSheetDismiss = useCallback(async (screen: AvailableScreens) => {
        await dismissBottomSheet();
        await new Promise((resolve) => setTimeout(resolve, 150));
        navigateToScreen(screen);
    }, []);

    const browseChannels = useCallback(async () => {
        await navigateAfterSheetDismiss(Screens.BROWSE_CHANNELS);
    }, [navigateAfterSheetDismiss]);

    const createNewChannel = useCallback(async () => {
        await navigateAfterSheetDismiss(Screens.CREATE_OR_EDIT_CHANNEL);
    }, [navigateAfterSheetDismiss]);

    const openDirectMessage = useCallback(async () => {
        await navigateAfterSheetDismiss(Screens.CREATE_DIRECT_MESSAGE);
    }, [navigateAfterSheetDismiss]);

    const invitePeopleToTeam = useCallback(async () => {
        await navigateAfterSheetDismiss(Screens.INVITE);
    }, [navigateAfterSheetDismiss]);

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
