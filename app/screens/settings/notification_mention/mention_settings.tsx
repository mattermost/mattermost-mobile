// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';

import {updateMe} from '@actions/remote/user';
import FloatingTextInput from '@components/floating_text_input_label';
import SettingBlock from '@components/settings/block';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {t} from '@i18n';
import {popTopScreen} from '@screens/navigation';
import ReplySettings from '@screens/settings/notification_mention/reply_settings';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getNotificationProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const mentionHeaderText = {
    id: t('notification_settings.mentions.keywords_mention'),
    defaultMessage: 'Keywords that trigger mentions',
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        input: {
            color: theme.centerChannelColor,
            height: 150,
            paddingHorizontal: 15,
            ...typography('Body', 100, 'Regular'),
        },
        containerStyle: {
            marginTop: 30,
            alignSelf: 'center',
            paddingHorizontal: 18.5,
        },
        labelTextStyle: {left: 32},
        keywordLabelStyle: {
            paddingHorizontal: 18.5,
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
        mentionKeywords: mKeys.join(','),
        usernameMention: usernameMentionIndex > -1,
        channel: notifyProps.channel === 'true',
        first_name: notifyProps.first_name === 'true',
        comments: notifyProps.comments,
        notifyProps,
    };
};

type MentionSectionProps = {
    componentId: AvailableScreens;
    currentUser: UserModel;
    isCRTEnabled: boolean;
}
const MentionSettings = ({componentId, currentUser, isCRTEnabled}: MentionSectionProps) => {
    const serverUrl = useServerUrl();
    const mentionProps = useMemo(() => getMentionProps(currentUser), []);
    const notifyProps = mentionProps.notifyProps;

    const [mentionKeywords, setMentionKeywords] = useState(mentionProps.mentionKeywords);
    const [channelMentionOn, setChannelMentionOn] = useState(mentionProps.channel);
    const [firstNameMentionOn, setFirstNameMentionOn] = useState(mentionProps.first_name);
    const [usernameMentionOn, setUsernameMentionOn] = useState(mentionProps.usernameMention);
    const [replyNotificationType, setReplyNotificationType] = useState(mentionProps.comments);

    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const close = () => popTopScreen(componentId);

    const canSaveSettings = useCallback(() => {
        const channelChanged = channelMentionOn !== mentionProps.channel;
        const replyChanged = replyNotificationType !== mentionProps.comments;
        const fNameChanged = firstNameMentionOn !== mentionProps.first_name;
        const mnKeysChanged = mentionProps.mentionKeywords !== mentionKeywords;
        const userNameChanged = usernameMentionOn !== mentionProps.usernameMention;

        return fNameChanged || userNameChanged || channelChanged || mnKeysChanged || replyChanged;
    }, [firstNameMentionOn, channelMentionOn, usernameMentionOn, mentionKeywords, notifyProps, replyNotificationType]);

    const saveMention = useCallback(() => {
        const canSave = canSaveSettings();

        if (canSave) {
            const mention_keys = [];
            if (mentionKeywords.length > 0) {
                mentionKeywords.split(',').forEach((m) => mention_keys.push(m.replace(/\s/g, '')));
            }

            if (usernameMentionOn) {
                mention_keys.push(`${currentUser.username}`);
            }
            const notify_props: UserNotifyProps = {
                ...notifyProps,
                first_name: `${firstNameMentionOn}`,
                channel: `${channelMentionOn}`,
                mention_keys: mention_keys.join(','),
                comments: replyNotificationType,
            };
            updateMe(serverUrl, {notify_props});
        }

        close();
    }, [
        canSaveSettings,
        channelMentionOn,
        firstNameMentionOn,
        mentionKeywords,
        notifyProps,
        replyNotificationType,
        serverUrl,
    ]);

    const onToggleFirstName = useCallback(() => {
        setFirstNameMentionOn((prev) => !prev);
    }, []);

    const onToggleUserName = useCallback(() => {
        setUsernameMentionOn((prev) => !prev);
    }, []);

    const onToggleChannel = useCallback(() => {
        setChannelMentionOn((prev) => !prev);
    }, []);

    const onChangeText = useCallback((text: string) => {
        setMentionKeywords(text);
    }, []);

    useBackNavigation(saveMention);

    useAndroidHardwareBackHandler(componentId, saveMention);

    return (
        <>
            <SettingBlock
                headerText={mentionHeaderText}
            >
                {Boolean(currentUser?.firstName) && (
                    <>
                        <SettingOption
                            action={onToggleFirstName}
                            description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveName', defaultMessage: 'Your case sensitive first name'})}
                            label={currentUser.firstName}
                            selected={firstNameMentionOn}
                            testID='mention_notification_settings.case_sensitive_first_name.option'
                            type='toggle'
                        />
                        <SettingSeparator/>
                    </>
                )
                }
                {Boolean(currentUser?.username) && (
                    <SettingOption
                        action={onToggleUserName}
                        description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveUsername', defaultMessage: 'Your non-case sensitive username'})}
                        label={currentUser.username}
                        selected={usernameMentionOn}
                        testID='mention_notification_settings.non_case_sensitive_username.option'
                        type='toggle'
                    />
                )}
                <SettingSeparator/>
                <SettingOption
                    action={onToggleChannel}
                    description={intl.formatMessage({id: 'notification_settings.mentions.channelWide', defaultMessage: 'Channel-wide mentions'})}
                    label='@channel, @all, @here'
                    selected={channelMentionOn}
                    testID='mention_notification_settings.channel_wide_mentions.option'
                    type='toggle'
                />
                <SettingSeparator/>
                <FloatingTextInput
                    allowFontScaling={true}
                    autoCapitalize='none'
                    autoCorrect={false}
                    blurOnSubmit={true}
                    containerStyle={styles.containerStyle}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    label={intl.formatMessage({id: 'notification_settings.mentions.keywords', defaultMessage: 'Keywords'})}
                    multiline={true}
                    onChangeText={onChangeText}
                    placeholder={intl.formatMessage({id: 'notification_settings.mentions..keywordsDescription', defaultMessage: 'Other words that trigger a mention'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                    returnKeyType='done'
                    testID='mention_notification_settings.keywords.input'
                    textInputStyle={styles.input}
                    textAlignVertical='top'
                    theme={theme}
                    underlineColorAndroid='transparent'
                    value={mentionKeywords}
                    labelTextStyle={styles.labelTextStyle}
                />
                <Text
                    style={styles.keywordLabelStyle}
                    testID='mention_notification_settings.keywords.input.description'
                >
                    {intl.formatMessage({id: 'notification_settings.mentions.keywordsLabel', defaultMessage: 'Keywords are not case-sensitive. Separate keywords with commas.'})}
                </Text>
            </SettingBlock>
            {!isCRTEnabled && (
                <ReplySettings
                    replyNotificationType={replyNotificationType}
                    setReplyNotificationType={setReplyNotificationType}
                />
            )}
        </>
    );
};

export default MentionSettings;
