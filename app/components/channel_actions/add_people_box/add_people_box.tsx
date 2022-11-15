// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleProp, ViewStyle} from 'react-native';

import OptionBox from '@components/option_box';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {ChannelModel} from '@database/models/server';
import {dismissBottomSheet, goToScreen, showModal} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

type Props = {
    currentChannel: ChannelModel;
    containerStyle?: StyleProp<ViewStyle>;
    inModal?: boolean;
    testID?: string;
}

const AddPeopleBox = ({currentChannel, containerStyle, inModal, testID}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const channelId = currentChannel.id;
    const displayName = currentChannel.displayName;

    const onAddPeople = useCallback(async () => {
        const title = intl.formatMessage({id: 'mobile.channel_add_people.title', defaultMessage: 'Add Members'});
        const options = {
            topBar: {
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: displayName,
                },
            },
        };
        if (inModal) {
            goToScreen(Screens.CHANNEL_ADD_PEOPLE, title, {channelId}, options);
            return;
        }
        await dismissBottomSheet();
        showModal(Screens.CHANNEL_ADD_PEOPLE, title, {channelId});
    }, [intl, channelId, inModal]);

    return (
        <OptionBox
            containerStyle={containerStyle}
            iconName='account-plus-outline'
            onPress={onAddPeople}
            testID={testID}
            text={intl.formatMessage({id: 'intro.add_people', defaultMessage: 'Add People'})}
        />
    );
};

export default AddPeopleBox;
