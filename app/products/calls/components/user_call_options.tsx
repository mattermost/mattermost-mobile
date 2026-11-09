// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, type IntlShape} from 'react-intl';
import {View} from 'react-native';

import {startPhoneCall} from '@calls/alerts';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';

import type {DialablePhone} from '@calls/types/calls';

const messages = defineMessages({
    startCall: {
        id: 'mobile.calls_start_call',
        defaultMessage: 'Start call',
    },
    callPhone: {
        id: 'mobile.calls_phone_call_option',
        defaultMessage: 'Call {label} ({number})',
    },
    cancel: {
        id: 'mobile.calls_cancel',
        defaultMessage: 'Cancel',
    },
});

export const showUserCallOptions = (intl: IntlShape, serverUrl: string, userId: string, phones: DialablePhone[], startCall: () => void) => {
    const runAfterDismiss = (action: () => void) => async () => {
        await dismissBottomSheet();
        action();
    };

    const renderContent = () => (
        <View>
            <SlideUpPanelItem
                leftIcon='phone'
                onPress={runAfterDismiss(startCall)}
                text={intl.formatMessage(messages.startCall)}
                testID='user_call_options.start_call'
            />
            {phones.map(({label, number}) => (
                <SlideUpPanelItem
                    key={`${label}:${number}`}
                    leftIcon='phone-in-talk'
                    onPress={runAfterDismiss(() => startPhoneCall(intl, serverUrl, {number, targetUserId: userId, displayLabel: label}))}
                    text={intl.formatMessage(messages.callPhone, {label, number})}
                    testID={`user_call_options.phone.${number}`}
                />
            ))}
            <SlideUpPanelItem
                destructive={true}
                onPress={dismissBottomSheet}
                text={intl.formatMessage(messages.cancel)}
                testID='user_call_options.cancel'
            />
        </View>
    );

    bottomSheet(renderContent, [1, bottomSheetSnapPoint(phones.length + 2, ITEM_HEIGHT)]);
};
