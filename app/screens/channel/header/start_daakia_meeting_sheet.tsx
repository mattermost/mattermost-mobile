// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TextInput, View} from 'react-native';

import {executeCommand} from '@actions/remote/command';
import Button from '@components/button';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {getCurrentUser} from '@queries/servers/user';
import {dismissBottomSheet} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    channelId: string;
};

const StartDaakiaMeetingSheet = ({channelId}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyles(theme);

    const [topic, setTopic] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fillDefault = async () => {
            const database = DatabaseManager.serverDatabases[serverUrl]?.database;
            if (!database) {
                return;
            }
            const user = await getCurrentUser(database);
            const name = user?.firstName || user?.username || '';
            if (name) {
                setTopic(`${name} meeting`);
            }
        };
        fillDefault();
    }, [serverUrl]);

    const onCancel = useCallback(async () => {
        await dismissBottomSheet();
    }, []);

    const onSubmit = useCallback(async () => {
        if (submitting) {
            return;
        }
        setSubmitting(true);
        const value = `/daakia "${topic || ''}"`;
        await executeCommand(serverUrl, intl, value, channelId);
        setSubmitting(false);
        await dismissBottomSheet();
    }, [serverUrl, intl, channelId, topic, submitting]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {intl.formatMessage({id: 'daakia.start_meeting', defaultMessage: 'Start a meeting'})}
            </Text>
            <TextInput
                style={styles.input}
                value={topic}
                onChangeText={setTopic}
                placeholder={intl.formatMessage({id: 'daakia.meeting_topic', defaultMessage: 'Meeting topic'})}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.32)}
                autoFocus={true}
            />
            <View style={styles.buttons}>
                <Button
                    onPress={onCancel}
                    text={intl.formatMessage({id: 'mobile.cancel', defaultMessage: 'Cancel'})}
                    type={'outline'}
                    theme={theme}
                />
                <View style={{width: 8}}/>
                <Button
                    onPress={onSubmit}
                    text={intl.formatMessage({id: 'daakia.start', defaultMessage: 'Start'})}
                    loading={submitting}
                    theme={theme}
                />
            </View>
        </View>
    );
};

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        padding: 20,
    },
    title: {
        ...typography('Heading', 400),
        color: theme.centerChannelColor,
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    buttons: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
});

export default StartDaakiaMeetingSheet;
