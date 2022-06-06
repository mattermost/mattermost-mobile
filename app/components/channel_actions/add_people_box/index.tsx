// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleProp, ViewStyle} from 'react-native';

import OptionBox from '@components/option_box';
import {Screens} from '@constants';
import {dismissBottomSheet, goToScreen, showModal} from '@screens/navigation';

type Props = {
    channelId: string;
    containerStyle?: StyleProp<ViewStyle>;
    inModal?: boolean;
    testID?: string;
}

const AddPeopleBox = ({channelId, containerStyle, inModal, testID}: Props) => {
    const intl = useIntl();

    const onAddPeople = useCallback(async () => {
        const title = intl.formatMessage({id: 'intro.add_people', defaultMessage: 'Add People'});
        if (inModal) {
            goToScreen(Screens.CHANNEL_ADD_PEOPLE, title, {channelId});
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
