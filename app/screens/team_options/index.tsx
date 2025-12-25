// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {Screens} from '@constants';
import {dismissBottomSheet, navigateToScreen} from '@utils/navigation/adapter';

import Item from './item';
import Separator from './separator';

export type TeamOptionsProps = {
    canCreateChannels: boolean;
    canJoinChannels: boolean;
    canInvitePeople: boolean;
}

const TeamOptions = ({canCreateChannels, canJoinChannels, canInvitePeople}: TeamOptionsProps) => {
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
            <Item
                pickerAction='browseChannels'
                onPress={browseChannels}
            />
            }
            {canCreateChannels &&
            <Item
                pickerAction='createNewChannel'
                onPress={createNewChannel}
            />
            }
            <Item
                pickerAction='openDirectMessage'
                onPress={openDirectMessage}
            />
            {canInvitePeople &&
            <>
                <Separator/>
                <Item
                    pickerAction='invitePeopleToTeam'
                    onPress={invitePeopleToTeam}
                />
            </>
            }
        </>
    );
};

export default TeamOptions;
