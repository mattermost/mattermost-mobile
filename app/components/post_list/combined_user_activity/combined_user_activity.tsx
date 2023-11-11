// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, type StyleProp, TouchableHighlight, View, type ViewStyle} from 'react-native';

import {fetchMissingProfilesByIds, fetchMissingProfilesByUsernames} from '@actions/remote/user';
import Markdown from '@components/markdown';
import SystemAvatar from '@components/system_avatar';
import SystemHeader from '@components/system_header';
import {Post as PostConstants, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {bottomSheetModalOptions, showModal, showModalOverCurrentContext} from '@screens/navigation';
import {emptyFunction} from '@utils/general';
import {getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import LastUsers from './last_users';
import {postTypeMessages} from './messages';

type Props = {
    canDelete: boolean;
    currentUserId?: string;
    currentUsername?: string;
    location: string;
    post: Post | null;
    showJoinLeave: boolean;
    testID?: string;
    theme: Theme;
    usernamesById: Record<string, string>;
    style?: StyleProp<ViewStyle>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        baseText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 16,
            lineHeight: 20,
        },
        body: {
            flex: 1,
            paddingBottom: 2,
            paddingTop: 2,
        },
        container: {
            flexDirection: 'row',
            paddingHorizontal: 20,
            marginTop: 10,
        },
        content: {
            flex: 1,
            flexDirection: 'column',
            marginLeft: 12,
        },
    };
});

const CombinedUserActivity = ({
    canDelete, currentUserId, currentUsername, location,
    post, showJoinLeave, testID, theme, usernamesById = {}, style,
}: Props) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const textStyles = getMarkdownTextStyles(theme);
    const styles = getStyleSheet(theme);
    const content = [];
    const removedUserIds: string[] = [];

    const getUsernames = (userIds: string[]) => {
        const someone = intl.formatMessage({id: 'channel_loader.someone', defaultMessage: 'Someone'});
        const you = intl.formatMessage({id: 'combined_system_message.you', defaultMessage: 'You'});
        const usernamesValues = Object.values(usernamesById);
        const usernames = userIds.reduce((acc: string[], id: string) => {
            if (id !== currentUserId && id !== currentUsername) {
                const name = usernamesById[id] ?? usernamesValues.find((n) => n === id);
                acc.push(name ? `@${name}` : someone);
            }
            return acc;
        }, []);

        if (currentUserId && userIds.includes(currentUserId)) {
            usernames.unshift(you);
        } else if (currentUsername && userIds.includes(currentUsername)) {
            usernames.unshift(you);
        }

        return usernames;
    };

    const onLongPress = useCallback(() => {
        if (!canDelete || !post) {
            return;
        }

        const passProps = {post, sourceScreen: location};
        Keyboard.dismiss();
        const title = isTablet ? intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}) : '';

        if (isTablet) {
            showModal(Screens.POST_OPTIONS, title, passProps, bottomSheetModalOptions(theme, 'close-post-options'));
        } else {
            showModalOverCurrentContext(Screens.POST_OPTIONS, passProps, bottomSheetModalOptions(theme));
        }
    }, [post, canDelete, isTablet, intl, location]);

    const renderMessage = (postType: string, userIds: string[], actorId: string) => {
        if (!post) {
            return null;
        }
        let actor = '';
        if (usernamesById[actorId]) {
            actor = `@${usernamesById[actorId]}`;
        }

        if (actor && (actorId === currentUserId || actorId === currentUsername)) {
            actor = intl.formatMessage({id: 'combined_system_message.you', defaultMessage: 'You'}).toLowerCase();
        }

        const usernames = getUsernames(userIds);
        const numOthers = usernames.length - 1;

        if (numOthers > 1) {
            return (
                <LastUsers
                    key={postType + actorId}
                    channelId={post.channel_id}
                    actor={actor}
                    location={location}
                    postType={postType}
                    theme={theme}
                    usernames={usernames}
                />
            );
        }

        const firstUser = usernames[0];
        const secondUser = usernames[1];
        let localeHolder;
        if (numOthers === 0) {
            localeHolder = postTypeMessages[postType].one;

            if (
                (userIds[0] === currentUserId || userIds[0] === currentUsername) &&
                postTypeMessages[postType].one_you
            ) {
                localeHolder = postTypeMessages[postType].one_you;
            }
        } else {
            localeHolder = postTypeMessages[postType].two;
        }

        const formattedMessage = intl.formatMessage(localeHolder, {firstUser, secondUser, actor});
        return (
            <Markdown
                channelId={post.channel_id}
                key={postType + actorId}
                baseTextStyle={styles.baseText}
                location={location}
                textStyles={textStyles}
                value={formattedMessage}
                theme={theme}
            />
        );
    };

    useEffect(() => {
        if (!post) {
            return;
        }

        const {allUserIds, allUsernames} = post.props.user_activity;
        if (allUserIds.length) {
            fetchMissingProfilesByIds(serverUrl, allUserIds);
        }

        if (allUsernames.length) {
            fetchMissingProfilesByUsernames(serverUrl, allUsernames);
        }
    }, [post?.props.user_activity.allUserIds, post?.props.user_activity.allUsernames]);

    if (!post) {
        return null;
    }

    const itemTestID = `${testID}.${post.id}`;
    const {messageData} = post.props.user_activity;
    for (const message of messageData) {
        const {postType, actorId} = message;
        const userIds = new Set<string>(message.userIds);

        if (!showJoinLeave && currentUserId && actorId !== currentUserId) {
            const affectsCurrentUser = userIds.has(currentUserId);

            if (affectsCurrentUser) {
                // Only show the message that the current user was added, etc
                userIds.add(currentUserId);
            } else {
                // Not something the current user did or was affected by
                continue;
            }
        }

        if (postType === PostConstants.POST_TYPES.REMOVE_FROM_CHANNEL) {
            removedUserIds.push(...Array.from(userIds));
            continue;
        }

        content.push(renderMessage(postType, Array.from(userIds), actorId));
    }

    if (removedUserIds.length > 0) {
        const uniqueRemovedUserIds = [...new Set(removedUserIds)];
        content.push(renderMessage(PostConstants.POST_TYPES.REMOVE_FROM_CHANNEL, uniqueRemovedUserIds, currentUserId || ''));
    }

    return (
        <View
            style={style}
            testID={testID}
        >
            <TouchableHighlight
                testID={itemTestID}
                onPress={emptyFunction}
                onLongPress={onLongPress}
                underlayColor={changeOpacity(theme.centerChannelColor, 0.1)}
            >
                <View style={styles.container}>
                    <SystemAvatar theme={theme}/>
                    <View style={styles.content}>
                        <SystemHeader
                            createAt={post.create_at}
                            theme={theme}
                        />
                        <View style={styles.body}>
                            {content}
                        </View>
                    </View>
                </View>
            </TouchableHighlight>
        </View>
    );
};

export default CombinedUserActivity;
