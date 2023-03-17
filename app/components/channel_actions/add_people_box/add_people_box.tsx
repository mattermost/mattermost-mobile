// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {getHeaderOptions} from '@app/screens/channel_add_people/channel_add_people';
import OptionBox from '@components/option_box';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {dismissBottomSheet, goToScreen, showModal} from '@screens/navigation';

import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
    channelId: string;
    displayName: string;
    inModal?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
    testID: string;
}

const AddPeopleBox = ({
    channelId,
    displayName,
    inModal,
    containerStyle,
    testID,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();

    const onAddPeople = useCallback(async () => {
        const title = intl.formatMessage({id: 'intro.add_people', defaultMessage: 'Add People'});
        const options = await getHeaderOptions(theme, displayName, inModal);
        if (inModal) {
            goToScreen(Screens.CHANNEL_ADD_PEOPLE, title, {channelId, inModal}, options);
            return;
        }

        await dismissBottomSheet();
        showModal(Screens.CHANNEL_ADD_PEOPLE, title, {channelId, inModal}, options);
    }, [intl, channelId, inModal, testID, displayName]);

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
