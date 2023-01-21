// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import OptionBox from '@components/option_box';
import {Screens} from '@constants';
import {dismissBottomSheet, goToScreen, showModal} from '@screens/navigation';

import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
    channelId: string;
    containerStyle?: StyleProp<ViewStyle>;
    isHeaderSet: boolean;
    inModal?: boolean;
    testID?: string;
}

const SetHeaderBox = ({channelId, containerStyle, isHeaderSet, inModal, testID}: Props) => {
    const intl = useIntl();

    const onSetHeader = useCallback(async () => {
        const title = intl.formatMessage({id: 'screens.channel_edit_header', defaultMessage: 'Edit Channel Header'});
        if (inModal) {
            goToScreen(Screens.CREATE_OR_EDIT_CHANNEL, title, {channelId, headerOnly: true});
            return;
        }

        await dismissBottomSheet();
        showModal(Screens.CREATE_OR_EDIT_CHANNEL, title, {channelId, headerOnly: true});
    }, [intl, channelId]);

    let text;
    if (isHeaderSet) {
        text = intl.formatMessage({id: 'channel_info.edit_header', defaultMessage: 'Edit Header'});
    } else {
        text = intl.formatMessage({id: 'channel_info.set_header', defaultMessage: 'Set Header'});
    }

    return (
        <OptionBox
            containerStyle={containerStyle}
            iconName='pencil-outline'
            onPress={onSetHeader}
            testID={testID}
            text={text}
        />
    );
};

export default SetHeaderBox;
