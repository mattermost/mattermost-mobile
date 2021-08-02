// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import {Database, Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import Clipboard from '@react-native-community/clipboard';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, GestureResponderEvent, StyleProp, StyleSheet, Text, TextStyle, View} from 'react-native';
import {of} from 'rxjs';

import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {useTheme} from '@context/theme';
import {Navigation, Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import UserModel from '@database/models/server/user';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import CompassIcon from '@components/compass_icon';
import {showModal, showModalOverCurrentContext} from '@screens/navigation';
import {displayUsername, getUserMentionKeys, getUsersByUsername} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModelType from '@typings/database/models/servers/user';

type AtMentionProps = {
    database: Database;
    groupsByName?: Record<string, Group>;
    isSearchResult?: boolean;
    mentionKeys: Array<{key: string }>;
    mentionName: string;
    mentionStyle: TextStyle;
    onPostPress?: (e: GestureResponderEvent) => void;
    teammateNameDisplay: string;
    textStyle: StyleProp<TextStyle>;
    users: UserModelType[];
}

type AtMentionArgs = {
    config: SystemModel;
    license: SystemModel;
    preferences: PreferenceModel[];
    mentionName: string;
}

const {SERVER: {PREFERENCE, SYSTEM, USER}} = MM_TABLES;

const style = StyleSheet.create({
    bottomSheet: {
        flex: 1,
    },
});

const AtMention = ({
    database,
    groupsByName,
    isSearchResult,
    mentionName,
    mentionKeys,
    mentionStyle,
    onPostPress,
    teammateNameDisplay,
    textStyle,
    users,
}: AtMentionProps) => {
    const intl = useIntl();
    const managedConfig = useManagedConfig();
    const theme = useTheme();
    const user = useMemo(() => {
        const usersByUsername = getUsersByUsername(users);
        let mn = mentionName.toLowerCase();

        while (mn.length > 0) {
            if (usersByUsername[mn]) {
                return usersByUsername[mn];
            }

            // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
            if ((/[._-]$/).test(mn)) {
                mn = mn.substring(0, mn.length - 1);
            } else {
                break;
            }
        }

        // @ts-expect-error: The model constructor is hidden within WDB type definition
        return new UserModel(database.get(USER), {username: ''});
    }, [users, mentionName]);
    const userMentionKeys = useMemo(() => {
        if (mentionKeys) {
            return mentionKeys;
        }
        return getUserMentionKeys(user);
    }, [user, mentionKeys]);

    const getGroupFromMentionName = () => {
        const mentionNameTrimmed = mentionName.toLowerCase().replace(/[._-]*$/, '');
        return groupsByName?.[mentionNameTrimmed];
    };

    const goToUserProfile = useCallback(() => {
        const screen = 'UserProfile';
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const passProps = {
            userId: user.id,
        };

        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);

        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: closeButton,
                    testID: 'close.settings.button',
                }],
            },
        };

        showModal(screen, title, passProps, options);
    }, [user]);

    const handleLongPress = useCallback(() => {
        if (managedConfig?.copyAndPasteProtection !== 'true') {
            const renderContent = () => {
                return (
                    <View
                        testID='at_mention.bottom_sheet'
                        style={style.bottomSheet}
                    >
                        <SlideUpPanelItem
                            icon='content-copy'
                            onPress={() => {
                                DeviceEventEmitter.emit(Navigation.NAVIGATION_CLOSE_MODAL);
                                let username = mentionName;
                                if (user.username) {
                                    username = user.username;
                                }

                                Clipboard.setString(`@${username}`);
                            }}
                            testID='at_mention.bottom_sheet.copy_mention'
                            text={intl.formatMessage({id: 'mobile.mention.copy_mention', defaultMessage: 'Copy Mention'})}
                        />
                        <SlideUpPanelItem
                            destructive={true}
                            icon='cancel'
                            onPress={() => {
                                DeviceEventEmitter.emit(Navigation.NAVIGATION_CLOSE_MODAL);
                            }}
                            testID='at_mention.bottom_sheet.cancel'
                            text={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        />
                    </View>
                );
            };

            showModalOverCurrentContext('BottomSheet', {
                renderContent,
                snapPoints: [3 * ITEM_HEIGHT, 10],
            });
        }
    }, [managedConfig]);

    const mentionTextStyle = [];

    let backgroundColor;
    let canPress = false;
    let highlighted;
    let isMention = false;
    let mention;
    let onLongPress;
    let onPress;
    let suffix;
    let suffixElement;
    let styleText;

    if (textStyle) {
        backgroundColor = theme.mentionHighlightBg;
        styleText = textStyle;
    }

    if (user?.username) {
        suffix = mentionName.substring(user.username.length);
        highlighted = userMentionKeys.some((item) => item.key.includes(user.username));
        mention = displayUsername(user, user.locale, teammateNameDisplay);
        isMention = true;
        canPress = true;
    } else {
        // TODO: Add group functionality
        const group = getGroupFromMentionName();
        if (group?.allow_reference) {
            highlighted = userMentionKeys.some((item) => item.key === `@${group.name}`);
            isMention = true;
            mention = group.name;
            suffix = mentionName.substring(group.name.length);
        } else {
            const pattern = new RegExp(/\b(all|channel|here)(?:\.\B|_\b|\b)/, 'i');
            const mentionMatch = pattern.exec(mentionName);

            if (mentionMatch) {
                mention = mentionMatch.length > 1 ? mentionMatch[1] : mentionMatch[0];
                suffix = mentionName.replace(mention, '');
                isMention = true;
                highlighted = true;
            } else {
                mention = mentionName;
            }
        }
    }

    if (canPress) {
        onLongPress = handleLongPress;
        onPress = isSearchResult ? onPostPress : goToUserProfile;
    }

    if (suffix) {
        const suffixStyle = {...StyleSheet.flatten(styleText), color: theme.centerChannelColor};
        suffixElement = (
            <Text style={suffixStyle}>
                {suffix}
            </Text>
        );
    }

    if (isMention) {
        mentionTextStyle.push(mentionStyle);
    }

    if (highlighted) {
        mentionTextStyle.push({backgroundColor, color: theme.mentionHighlightLink});
    }

    return (
        <Text
            style={styleText}
            onPress={onPress}
            onLongPress={onLongPress}
        >
            <Text style={mentionTextStyle}>
                {'@' + mention}
            </Text>
            {suffixElement}
        </Text>
    );
};

const withPreferences = withObservables([], ({database}: WithDatabaseArgs) => ({
    preferences: database.get(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).observe(),
    config: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG),
    license: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE),
}));

const withAtMention = withObservables(['mentionName', 'preferences', 'config', 'license'], ({database, mentionName, preferences, config, license}: WithDatabaseArgs & AtMentionArgs) => {
    let mn = mentionName.toLowerCase();
    if ((/[._-]$/).test(mn)) {
        mn = mn.substring(0, mn.length - 1);
    }

    const teammateNameDisplay = of(getTeammateNameDisplaySetting(preferences, config.value, license.value));

    return {
        teammateNameDisplay,
        users: database.get(USER).query(
            Q.where('username', Q.like(
                `%${Q.sanitizeLikeString(mn)}%`,
            )),
        ).observeWithColumns(['username']),
    };
});

export default withDatabase(withPreferences(withAtMention(AtMention)));
