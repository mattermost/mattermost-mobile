// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';

import {updateMe} from '@actions/remote/user';
import FloatingTextChipsInput from '@components/floating_text_chips_input';
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
import {areBothStringArraysEqual} from '@utils/helpers';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getNotificationProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const mentionHeaderText = {
    id: t('notification_settings.mentions.keywords_mention'),
    defaultMessage: 'Keywords that trigger mentions',
};

const COMMA_KEY = ',';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        input: {
            color: theme.centerChannelColor,
            paddingHorizontal: 15,
            ...typography('Body', 100, 'Regular'),
        },
        containerStyle: {
            marginTop: 30,
            alignSelf: 'center',
            paddingHorizontal: 18.5,
        },
        keywordLabelStyle: {
            paddingHorizontal: 18.5,
            marginTop: 4,
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
        },
    };
});

type Props = {
    componentId: AvailableScreens;
    currentUser?: UserModel;
    isCRTEnabled: boolean;
};

export function getMentionProps(currentUser?: UserModel) {
    const notifyProps = getNotificationProps(currentUser);
    const mentionKeys = notifyProps?.mention_keys ?? '';

    let mentionKeywords: string[] = [];
    let usernameMention = false;
    mentionKeys.split(',').forEach((mentionKey) => {
        if (currentUser && mentionKey === currentUser.username) {
            usernameMention = true;
        } else if (mentionKey) {
            mentionKeywords = [...mentionKeywords, mentionKey];
        }
    });

    return {
        mentionKeywords,
        usernameMention,
        channel: notifyProps.channel === 'true',
        first_name: notifyProps.first_name === 'true',
        comments: notifyProps.comments || '',
        notifyProps,
    };
}

export type CanSaveSettings = {
    channelMentionOn: boolean;
    replyNotificationType: string;
    firstNameMentionOn: boolean;
    mentionKeywords: string[];
    usernameMentionOn: boolean;
    mentionProps: ReturnType<typeof getMentionProps>;
}

export function canSaveSettings({channelMentionOn, replyNotificationType, firstNameMentionOn, mentionKeywords, usernameMentionOn, mentionProps}: CanSaveSettings) {
    const channelChanged = channelMentionOn !== mentionProps.channel;
    const replyChanged = replyNotificationType !== mentionProps.comments;
    const firstNameChanged = firstNameMentionOn !== mentionProps.first_name;
    const userNameChanged = usernameMentionOn !== mentionProps.usernameMention;
    const mentionKeywordsChanged = !areBothStringArraysEqual(mentionKeywords, mentionProps.mentionKeywords);

    return channelChanged || replyChanged || firstNameChanged || userNameChanged || mentionKeywordsChanged;
}

export function getUniqueKeywordsFromInput(inputText: string, keywords: string[]) {
    // Replace all the spaces and commas
    const formattedInputText = inputText.trim().replace(/ |,/g, '');

    // Check if the keyword is not empty and not already in the list
    if (formattedInputText.length > 0 && !keywords.includes(formattedInputText)) {
        return [...keywords, formattedInputText];
    }

    return keywords;
}

const MentionSettings = ({componentId, currentUser, isCRTEnabled}: Props) => {
    const serverUrl = useServerUrl();
    const mentionProps = useMemo(() => getMentionProps(currentUser), []);
    const notifyProps = mentionProps.notifyProps;

    const [mentionKeywords, setMentionKeywords] = useState(mentionProps.mentionKeywords);
    const [mentionKeywordsInput, setMentionKeywordsInput] = useState('');
    const [channelMentionOn, setChannelMentionOn] = useState(mentionProps.channel);
    const [firstNameMentionOn, setFirstNameMentionOn] = useState(mentionProps.first_name);
    const [usernameMentionOn, setUsernameMentionOn] = useState(mentionProps.usernameMention);
    const [replyNotificationType, setReplyNotificationType] = useState(mentionProps.comments);

    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const close = () => popTopScreen(componentId);

    const saveMention = useCallback(() => {
        if (!currentUser) {
            return;
        }

        const canSave = canSaveSettings({
            channelMentionOn,
            replyNotificationType,
            firstNameMentionOn,
            usernameMentionOn,
            mentionKeywords,
            mentionProps,
        });

        if (canSave) {
            let mention_keys = [];
            if (usernameMentionOn) {
                mention_keys.push(`${currentUser.username}`);
            }

            mention_keys = [...mention_keys, ...mentionKeywords];

            const notify_props: UserNotifyProps = {
                ...notifyProps,
                first_name: firstNameMentionOn ? 'true' : 'false',
                channel: channelMentionOn ? 'true' : 'false',
                mention_keys: mention_keys.join(','),
                comments: replyNotificationType,
            };
            updateMe(serverUrl, {notify_props});
        }

        close();
    }, [
        channelMentionOn,
        firstNameMentionOn,
        usernameMentionOn,
        mentionKeywords,
        notifyProps,
        mentionProps,
        replyNotificationType,
        serverUrl,
        currentUser,
    ]);

    const handleFirstNameToggle = useCallback(() => {
        setFirstNameMentionOn((prev) => !prev);
    }, []);

    const handleUsernameToggle = useCallback(() => {
        setUsernameMentionOn((prev) => !prev);
    }, []);

    const handleChannelToggle = useCallback(() => {
        setChannelMentionOn((prev) => !prev);
    }, []);

    function appendKeywordsAndClearInput(key: string, list: string[]) {
        const keyAppendedToList = getUniqueKeywordsFromInput(key, list);

        setMentionKeywordsInput('');
        requestAnimationFrame(() => {
            setMentionKeywords(keyAppendedToList);
        });
    }

    /**
     * Handler on every key press in the input
     */
    const handleMentionKeywordsInputChanged = useCallback((text: string) => {
        if (text.includes(COMMA_KEY)) {
            appendKeywordsAndClearInput(text, mentionKeywords);
        } else {
            setMentionKeywordsInput(text);
        }
    }, [mentionKeywords]);

    /**
     * Handler when the user presses the enter key on keyboard
     * Takes unsaved keywords from the input and adds them to the list
     */
    const handleMentionKeywordEntered = useCallback(() => {
        appendKeywordsAndClearInput(mentionKeywordsInput, mentionKeywords);
    }, [mentionKeywordsInput, mentionKeywords]);

    const handleMentionKeywordRemoved = useCallback((keyword: string) => {
        setMentionKeywords(mentionKeywords.filter((item) => item !== keyword));
    }, [mentionKeywords]);

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
                            action={handleFirstNameToggle}
                            description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveName', defaultMessage: 'Your case sensitive first name'})}
                            label={currentUser!.firstName}
                            selected={firstNameMentionOn}
                            testID='mention_notification_settings.case_sensitive_first_name.option'
                            type='toggle'
                        />
                        <SettingSeparator/>
                    </>
                )}
                {Boolean(currentUser?.username) && (
                    <SettingOption
                        action={handleUsernameToggle}
                        description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveUsername', defaultMessage: 'Your non-case sensitive username'})}
                        label={currentUser!.username}
                        selected={usernameMentionOn}
                        testID='mention_notification_settings.non_case_sensitive_username.option'
                        type='toggle'
                    />
                )}
                <SettingSeparator/>
                <SettingOption
                    action={handleChannelToggle}
                    description={intl.formatMessage({id: 'notification_settings.mentions.channelWide', defaultMessage: 'Channel-wide mentions'})}
                    label='@channel, @all, @here'
                    selected={channelMentionOn}
                    testID='mention_notification_settings.channel_wide_mentions.option'
                    type='toggle'
                />
                <SettingSeparator/>
                <FloatingTextChipsInput
                    allowFontScaling={true}
                    autoCapitalize='none'
                    autoCorrect={false}
                    blurOnSubmit={true}
                    containerStyle={styles.containerStyle}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    label={intl.formatMessage({
                        id: 'notification_settings.mentions.keywords',
                        defaultMessage: 'Enter other keywords',
                    })}
                    onTextInputChange={handleMentionKeywordsInputChanged}
                    onChipRemove={handleMentionKeywordRemoved}
                    returnKeyType='done'
                    testID='mention_notification_settings.keywords.input'
                    textInputStyle={styles.input}
                    textAlignVertical='center'
                    theme={theme}
                    underlineColorAndroid='transparent'
                    chipsValues={mentionKeywords}
                    textInputValue={mentionKeywordsInput}
                    onTextInputSubmitted={handleMentionKeywordEntered}
                />
                <Text
                    style={styles.keywordLabelStyle}
                    testID='mention_notification_settings.keywords.input.description'
                >
                    {intl.formatMessage({
                        id: 'notification_settings.mentions.keywordsLabel',
                        defaultMessage:
                            'Keywords are not case-sensitive. Separate keywords with commas.',
                    })}
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
