// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import SectionNotice from '@components/section_notice';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    location: AvailableScreens;
    testID: string;
}

const messages = defineMessages({
    title: {
        id: 'channel_settings.read_only.title',
        defaultMessage: 'Editing is restricted',
    },
    message: {
        id: 'channel_settings.read_only.message',
        defaultMessage: 'An access policy prevents you from making changes in this channel. These settings are shown for reference only.',
    },
});

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        marginBottom: 8,
    },
});

/**
 * Shown on the channel settings surfaces while a channel management policy denies the current user:
 * the settings stay visible for reference, with every control disabled.
 */
const ReadOnlyNotice = ({location, testID}: Props) => {
    const {formatMessage} = useIntl();

    return (
        <View style={styles.container}>
            <SectionNotice
                type='info'
                title={formatMessage(messages.title)}
                text={formatMessage(messages.message)}
                location={location}
                testID={testID}
            />
        </View>
    );
};

export default ReadOnlyNotice;
