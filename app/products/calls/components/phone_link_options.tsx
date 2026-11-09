// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, type IntlShape} from 'react-intl';
import {View} from 'react-native';

import {startPhoneCall} from '@calls/alerts';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';

import type {PhoneTarget} from '@calls/types/calls';

const messages = defineMessages({
    callWithMattermost: {
        id: 'mobile.markdown.link.call_with_mattermost',
        defaultMessage: 'Call with Mattermost',
    },
    callWithPhone: {
        id: 'mobile.markdown.link.call_with_phone',
        defaultMessage: 'Call with phone',
    },
});

export const showPhoneLinkOptions = (intl: IntlShape, serverUrl: string, phone: PhoneTarget, callWithPhone: () => void) => {
    const renderContent = () => (
        <View>
            <SlideUpPanelItem
                leftIcon='phone-in-talk'
                onPress={() => {
                    dismissBottomSheet();
                    startPhoneCall(intl, serverUrl, phone);
                }}
                testID='markdown_link.bottom_sheet.call_with_mattermost'
                text={intl.formatMessage(messages.callWithMattermost)}
            />
            <SlideUpPanelItem
                leftIcon='phone-outline'
                onPress={() => {
                    dismissBottomSheet();
                    callWithPhone();
                }}
                testID='markdown_link.bottom_sheet.call_with_phone'
                text={intl.formatMessage(messages.callWithPhone)}
            />
            <SlideUpPanelItem
                destructive={true}
                leftIcon='cancel'
                onPress={dismissBottomSheet}
                testID='markdown_link.bottom_sheet.cancel'
                text={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
            />
        </View>
    );

    bottomSheet(renderContent, [1, bottomSheetSnapPoint(3, ITEM_HEIGHT)]);
};
