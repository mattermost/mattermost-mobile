// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable */

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {type GestureResponderEvent, type StyleProp, StyleSheet, Text, type TextStyle, View} from 'react-native';

import {fetchUserOrGroupsByMentionsInBatch} from '@actions/remote/user';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {useServerUrl} from '@context/server';
import GroupModel from '@database/models/server/group';
import {useMemoMentionedGroup, useMemoMentionedUser} from '@hooks/markdown';
import {bottomSheet, dismissBottomSheet, openUserProfileModal} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {displayUsername} from '@utils/user';

import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type UserModelType from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type AtMentionProps = {
    channelId?: string;
    currentUserId: string;
    disableAtChannelMentionHighlight?: boolean;
    isMyPost?: boolean;
    isSearchResult?: boolean;
    location: AvailableScreens;
    mentionKeys?: Array<{key: string }>;
    mentionName: string;
    mentionStyle: StyleProp<TextStyle>;
    teammateNameDisplay: string;
    textStyle?: StyleProp<TextStyle>;
    users: UserModelType[];
    groups: GroupModel[];
    groupMemberships: GroupMembershipModel[];
    theme: Theme;
}

const style = StyleSheet.create({
    bottomSheet: {flex: 1},
});

const AtMention = ({
    channelId,
    currentUserId,
    disableAtChannelMentionHighlight,
    isMyPost,
    isSearchResult,
    location,
    mentionName,
    mentionKeys,
    mentionStyle,
    teammateNameDisplay,
    textStyle,
    users,
    groups,
    groupMemberships,
    theme,
}: AtMentionProps) => {
    const intl = useIntl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const serverUrl = useServerUrl();

    const user = useMemoMentionedUser(users, mentionName);

    const userMentionKeys = useMemo(() => {
        if (mentionKeys) {
            return mentionKeys;
        }
        if (!user) {
            return [];
        }

        if (user.id !== currentUserId) {
            return [];
        }

        return user.mentionKeys;
    }, [currentUserId, mentionKeys, user]);

    const group = useMemoMentionedGroup(groups, user, mentionName);

    // Effects
    useEffect(() => {
        // Fetches and updates the local db store with the mention
        if (!user?.username && !group?.name) {
            fetchUserOrGroupsByMentionsInBatch(serverUrl, mentionName);
        }

        // Only fetch the user or group on mount
    }, []);

    const openUserProfile = () => {
        if (!user) {
            return;
        }

        openUserProfileModal(intl, theme, {
            location,
            userId: user.id,
            channelId,
        });
    };

    const handleLongPress = useCallback(() => {
        if (managedConfig?.copyAndPasteProtection !== 'true') {
            const renderContent = () => {
                return (
                    <View
                        testID='at_mention.bottom_sheet'
                        style={style.bottomSheet}
                    >
                        <SlideUpPanelItem
                            leftIcon='content-copy'
                            onPress={() => {
                                dismissBottomSheet();
                                let username = mentionName;
                                if (user?.username) {
                                    username = user.username;
                                }

                                Clipboard.setString(`@${username}`);
                            }}
                            testID='at_mention.bottom_sheet.copy_mention'
                            text={intl.formatMessage({id: 'mobile.mention.copy_mention', defaultMessage: 'Copy Mention'})}
                        />
                        <SlideUpPanelItem
                            destructive={true}
                            leftIcon='cancel'
                            onPress={() => {
                                dismissBottomSheet();
                            }}
                            testID='at_mention.bottom_sheet.cancel'
                            text={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        />
                    </View>
                );
            };

            bottomSheet({
                closeButtonId: 'close-at-mention',
                renderContent,
                snapPoints: [1, bottomSheetSnapPoint(2, ITEM_HEIGHT)],
                title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
                theme,
            });
        }
    }, [managedConfig?.copyAndPasteProtection, intl, theme, mentionName, user?.username]);

    const mentionTextStyle: StyleProp<TextStyle> = [];

    let canPress = false;

    // Detection logic preserved - calculated but not used for styling (underline only)
    let highlighted;
    let isMention = false;
    let mention;
    let onLongPress;
    let onPress: ((e?: GestureResponderEvent) => void) | undefined;
    let suffix;
    let suffixElement;
    let styleText;

    if (textStyle) {
        styleText = textStyle;
    }

    if (user?.username) {
        suffix = mentionName.substring(user.username.length);
        highlighted = userMentionKeys.some((item) => item.key.includes(user.username));
        mention = displayUsername(user, user.locale, teammateNameDisplay);
        isMention = true;
        canPress = true;
    } else if (group?.name) {
        mention = group.name;
        highlighted = groupMemberships.some((gm) => gm.groupId === group.id);
        isMention = true;
        canPress = false;
    } else {
        const pattern = new RegExp(/\b(all|channel|here)(?:\.\B|_\b|\b)/, 'i');
        const mentionMatch = pattern.exec(mentionName);

        if (mentionMatch && !disableAtChannelMentionHighlight) {
            mention = mentionMatch.length > 1 ? mentionMatch[1] : mentionMatch[0];
            suffix = mentionName.replace(mention, '');
            isMention = true;
            highlighted = true;
        } else {
            mention = mentionName;
        }
    }

    if (canPress) {
        onLongPress = handleLongPress;
        onPress = (isSearchResult ? undefined : openUserProfile);
    }

    if (suffix) {
        // Suffix should use same color as base text (no special color)
        const suffixStyle = StyleSheet.flatten(styleText);
        suffixElement = (
            <Text style={suffixStyle}>
                {suffix}
            </Text>
        );
    }

    if (isMention) {
        // Apply yellow color for all mentions (no underline)
        mentionTextStyle.push(mentionStyle);
        // Use different yellow colors based on post side:
        // Left side (other posts): #CC9900 (Darker yellow / Golden)
        // Right side (my posts): #FFFF99 (Very light bright yellow)
        mentionTextStyle.push({
            color: isMyPost ? '#FFFF99' : '#CC9900', // Different yellow colors for my posts vs other posts
            textDecorationLine: 'none', // Explicitly remove underline
        });
    }

    return (
        <Text
            onPress={onPress}
            onLongPress={onLongPress}
            style={styleText}
        >
            <Text style={mentionTextStyle}>
                {'@' + mention}
            </Text>
            {suffixElement}
        </Text>
    );
};

export default AtMention;
