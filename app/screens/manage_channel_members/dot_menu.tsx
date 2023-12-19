// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {getHeaderOptions} from '@app/screens/channel_add_members/channel_add_members';
import {preventDoubleTap} from '@app/utils/tap';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {dismissBottomSheet, goToScreen} from '@screens/navigation';

type Props = {
    enterManageMode: () => void;
    channelDisplayName: string;
    channelId: string;
}

const DotMenuList = ({
    enterManageMode,
    channelDisplayName,
    channelId,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();

    const manageMembersTitle = intl.formatMessage({id: 'manage_channel_members.manage_members.title', defaultMessage: 'Manage members'});
    const manageMembers = useCallback(() => {
        dismissBottomSheet();
        enterManageMode();
    }, [intl, theme]);

    const addMembersTitle = intl.formatMessage({id: 'manage_channel_members.add_members.title', defaultMessage: 'Add members'});
    const addMembers = preventDoubleTap(async () => {
        await dismissBottomSheet();
        const options = await getHeaderOptions(theme, channelDisplayName, true);
        goToScreen(Screens.CHANNEL_ADD_MEMBERS, addMembersTitle, {channelId, inModal: true}, options);
    });

    return (
        <>
            <SlideUpPanelItem
                leftIcon='account-multiple-outline'
                text={manageMembersTitle}
                testID='manage_channel_members.dot_menu.manage_members'
                onPress={manageMembers}
            />

            <SlideUpPanelItem
                leftIcon='account-plus-outline'
                text={addMembersTitle}
                testID='manage_channel_members.dot_menu.add_members'
                onPress={addMembers}
            />

        </>
    );
};

export default DotMenuList;
