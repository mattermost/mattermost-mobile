// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import CompassIcon from '@components/compass_icon';
import OptionBox from '@components/option_box';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {goToScreen, showModal} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
    channelId: string;
    containerStyle?: StyleProp<ViewStyle>;
    displayName: string;
    inModal?: boolean;
    testID?: string;
}

const messages = defineMessages({
    title: {
        id: t('mobile.channel_add_people.title'),
        defaultMessage: 'Add Members',
    },
    boxText: {
        id: t('intro.add_people'),
        defaultMessage: 'Add People',
    },
});

const {CHANNEL_ADD_PEOPLE} = Screens;
const closeButtonId = 'close-add-people';

const AddPeopleBox = ({channelId, containerStyle, displayName, inModal, testID}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();

    const onAddPeople = useCallback(async () => {
        const closeButton = await CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const title = formatMessage(messages.title);

        const options = {
            topBar: {
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: displayName,
                },
                leftButtons: inModal ? [] : [{
                    id: closeButtonId,
                    icon: closeButton,
                    testID: 'close.channel_info.button',
                }],
            },
        };

        if (inModal) {
            goToScreen(CHANNEL_ADD_PEOPLE, title, {channelId}, options);
            return;
        }

        showModal(CHANNEL_ADD_PEOPLE, title, {channelId, closeButtonId}, options);
    }, [formatMessage, channelId, inModal]);

    return (
        <OptionBox
            containerStyle={containerStyle}
            iconName='account-plus-outline'
            onPress={onAddPeople}
            testID={testID}
            text={formatMessage(messages.boxText)}
        />
    );
};

export default AddPeopleBox;
