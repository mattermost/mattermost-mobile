// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, Text, View} from 'react-native';

import {updateMe} from '@actions/remote/user';
import Block from '@components/block';
import FloatingTextInput from '@components/floating_text_input_label';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {popTopScreen, setButtons} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getNotificationProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

const mentionHeaderText = {
    id: t('notification_settings.mentions.wordsTrigger'),
    defaultMessage: 'Keywords that trigger mentions',
};

const SAVE_MENTION_BUTTON_ID = 'SAVE_MENTION_BUTTON_ID';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        separator: {
            ...Platform.select({
                ios: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
                    width: '91%',
                    alignSelf: 'center',
                    height: 1,
                    marginTop: 12,
                },
                default: {
                    display: 'none',
                },
            }),
        },
        blockHeader: {
            color: theme.centerChannelColor,
            ...typography('Heading', 300, 'SemiBold'),
            marginBottom: 16,
            marginLeft: 18,
        },
        container: {
            paddingHorizontal: 20,
            marginTop: 16,
        },
        input: {
            color: theme.centerChannelColor,
            height: 150,
            paddingHorizontal: 15,
            ...typography('Body', 100, 'Regular'),
        },
        containerStyle: {
            marginTop: 30,
            width: '90%',
            alignSelf: 'center',
        },
        optionLabelTextStyle: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
            marginBottom: 4,
        },
        optionDescriptionTextStyle: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
        },
        keywordLabelStyle: {
            marginLeft: 20,
            marginTop: 4,
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
        },
    };
});

const getMentionProps = (currentUser: UserModel) => {
    const notifyProps = getNotificationProps(currentUser);
    const mKeys = (notifyProps.mention_keys || '').split(',');

    const usernameMentionIndex = mKeys.indexOf(currentUser.username);
    if (usernameMentionIndex > -1) {
        mKeys.splice(usernameMentionIndex, 1);
    }

    return {
        mentionKeys: mKeys.join(','),
        usernameMention: usernameMentionIndex > -1,
        notifyProps,
    };
};

type MentionSectionProps = {
    componentId: string;
    currentUser: UserModel;
}
const MentionSettings = ({componentId, currentUser}: MentionSectionProps) => {
    const serverUrl = useServerUrl();
    const mentionProps = useMemo(() => getMentionProps(currentUser), [currentUser.notifyProps]);

    const notifyProps = currentUser.notifyProps || mentionProps.notifyProps;
    const [tglFirstName, setTglFirstName] = useState(notifyProps.first_name === 'true');
    const [tglChannel, setTglChannel] = useState(notifyProps.channel === 'true');

    const [tglUserName, setTglUserName] = useState(mentionProps.usernameMention);
    const [mentionKeys, setMentionKeys] = useState(mentionProps.mentionKeys);

    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const saveButton = useMemo(() => {
        return {
            id: SAVE_MENTION_BUTTON_ID,
            enabled: false,
            showAsAction: 'always' as const,
            testID: 'notification_settings.mentions.save.button',
            color: theme.sidebarHeaderTextColor,
            ...typography('Body', 100, 'SemiBold'),
            text: intl.formatMessage({id: 'settings.save', defaultMessage: 'Save'}),
        };
    }, [theme.sidebarHeaderTextColor]);

    const close = () => popTopScreen(componentId);

    const saveMention = useCallback(() => {
        const notify_props: UserNotifyProps = {
            ...notifyProps,
            first_name: `${tglFirstName}`,
            channel: `${tglChannel}`,
            mention_keys: mentionKeys};
        updateMe(serverUrl, {notify_props});
        close();
    }, [serverUrl, notifyProps, tglFirstName, tglChannel, mentionKeys]);

    const onToggleFirstName = useCallback(() => {
        setTglFirstName((prev) => !prev);
    }, []);

    const onToggleUserName = useCallback(() => {
        setTglUserName((prev) => !prev);
    }, []);

    const onToggleChannel = useCallback(() => {
        setTglChannel((prev) => !prev);
    }, []);

    const onChangeText = useCallback((text: string) => {
        setMentionKeys(text);
    }, []);

    useEffect(() => {
        const fNameChanged = tglFirstName !== Boolean(notifyProps.first_name);
        const channelChanged = tglChannel !== Boolean(notifyProps.channel);

        const usnChanged = tglUserName !== mentionProps.usernameMention;
        const kwsChanged = mentionProps.mentionKeys !== mentionKeys;

        const enabled = fNameChanged || usnChanged || channelChanged || kwsChanged;

        const buttons = {
            rightButtons: [{
                ...saveButton,
                enabled,
            }],
        };
        setButtons(componentId, buttons);
    }, [componentId, saveButton, tglFirstName, tglChannel, tglUserName, mentionKeys, notifyProps]);

    useNavButtonPressed(SAVE_MENTION_BUTTON_ID, componentId, saveMention, [saveMention]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <Block
            headerText={mentionHeaderText}
            headerStyles={styles.blockHeader}
        >
            {Boolean(currentUser?.firstName) && (
                <>
                    <OptionItem
                        action={onToggleFirstName}
                        containerStyle={styles.container}
                        description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveName', defaultMessage: 'Your case sensitive first name'})}
                        label={currentUser.firstName}
                        optionDescriptionTextStyle={styles.optionDescriptionTextStyle}
                        optionLabelTextStyle={styles.optionLabelTextStyle}
                        selected={tglFirstName}
                        type='toggle'
                    />
                    <View style={styles.separator}/>
                </>
            )
            }
            {Boolean(currentUser?.username) && (
                <OptionItem
                    action={onToggleUserName}
                    containerStyle={styles.container}
                    description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveUsername', defaultMessage: 'Your non-case sensitive username'})}
                    label={currentUser.username}
                    optionDescriptionTextStyle={styles.optionDescriptionTextStyle}
                    optionLabelTextStyle={styles.optionLabelTextStyle}
                    selected={tglUserName}
                    type='toggle'
                />
            )}
            <View style={styles.separator}/>
            <OptionItem
                action={onToggleChannel}
                containerStyle={styles.container}
                description={intl.formatMessage({id: 'notification_settings.mentions.channelWide', defaultMessage: 'Channel-wide mentions'})}
                label='@channel, @all, @here'
                optionDescriptionTextStyle={styles.optionDescriptionTextStyle}
                optionLabelTextStyle={styles.optionLabelTextStyle}
                selected={tglChannel}
                type='toggle'
            />
            <View style={styles.separator}/>
            <FloatingTextInput
                allowFontScaling={true}
                autoCapitalize='none'
                autoCorrect={false}
                blurOnSubmit={true}
                containerStyle={styles.containerStyle}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                label={intl.formatMessage({id: 'notification_settings.mentions.keywords', defaultMessage: 'Enter other keywords'})}
                multiline={true}
                onChangeText={onChangeText}
                placeholder={intl.formatMessage({id: 'notification_settings.mentions..keywordsDescription', defaultMessage: 'Other words that trigger a mention'})}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                returnKeyType='done'
                textInputStyle={styles.input}
                textAlignVertical='top'
                theme={theme}
                underlineColorAndroid='transparent'
                value={mentionKeys}
            />
            <Text
                style={styles.keywordLabelStyle}
            >
                {intl.formatMessage({id: 'notification_settings.mentions.keywordsLabel', defaultMessage: 'Keywords are not case-sensitive. Separate keywords with commas.'})}
            </Text>
        </Block>
    );
};

export default MentionSettings;
