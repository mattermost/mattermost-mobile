// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    Platform,
    Text,
    View,
} from 'react-native';

import {storeProfileLongPressTutorial} from '@actions/app/global';
import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import {BotTag, GuestTag} from '@components/tag';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import TutorialHighlight from '@components/tutorial_highlight';
import TutorialLongPress from '@components/tutorial_highlight/long_press';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {displayUsername, isGuest} from '@utils/user';

type Props = {
    id: string;
    isMyUser: boolean;
    highlight?: boolean;
    user: UserProfile;
    teammateNameDisplay: string;
    testID: string;
    onPress?: (user: UserProfile) => void;
    onLongPress: (user: UserProfile) => void;
    selectable: boolean;
    selected: boolean;
    tutorialWatched?: boolean;
    enabled: boolean;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            paddingHorizontal: 20,
            height: 58,
            overflow: 'hidden',
        },
        profileContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            color: theme.centerChannelColor,
        },
        textContainer: {
            paddingHorizontal: 10,
            justifyContent: 'center',
            flexDirection: 'column',
            flex: 1,
        },
        username: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        displayName: {
            fontSize: 16,
            height: 24,
            color: theme.centerChannelColor,
            maxWidth: '80%',
        },
        indicatorContainer: {
            flexDirection: 'row',
        },
        deactivated: {
            marginTop: 2,
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        sharedUserIcon: {
            alignSelf: 'center',
            opacity: 0.75,
        },
        selector: {
            height: 28,
            width: 28,
            borderRadius: 14,
            borderWidth: 3,
            borderColor: changeOpacity(theme.centerChannelColor, 0.32),
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectorContainer: {
            height: 50,
            paddingRight: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectorDisabled: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
        selectorFilled: {
            backgroundColor: theme.sidebarBg,
            borderWidth: 0,
        },
        tutorial: {
            top: Platform.select({ios: -74, default: -94}),
        },
        tutorialTablet: {
            top: -84,
        },
    };
});

export default function UserListRow({
    id,
    isMyUser,
    highlight,
    user,
    teammateNameDisplay,
    testID,
    onPress,
    onLongPress,
    tutorialWatched = false,
    selectable,
    selected,
    enabled,
}: Props) {
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();
    const [showTutorial, setShowTutorial] = useState(false);
    const [itemBounds, setItemBounds] = useState<TutorialItemBounds>({startX: 0, startY: 0, endX: 0, endY: 0});
    const viewRef = useRef<View>(null);
    const style = getStyleFromTheme(theme);
    const {formatMessage} = intl;
    const {username} = user;

    const startTutorial = () => {
        viewRef.current?.measureInWindow((x, y, w, h) => {
            const bounds: TutorialItemBounds = {
                startX: x - 20,
                startY: y,
                endX: x + w + 20,
                endY: y + h,
            };
            if (viewRef.current) {
                setShowTutorial(true);
                setItemBounds(bounds);
            }
        });
    };

    const handleDismissTutorial = useCallback(() => {
        setShowTutorial(false);
        storeProfileLongPressTutorial();
    }, []);

    useEffect(() => {
        let time: NodeJS.Timeout;
        if (highlight && !tutorialWatched) {
            time = setTimeout(startTutorial, 650);
        }
        return () => clearTimeout(time);
    }, [highlight, tutorialWatched]);

    const handlePress = useCallback(() => {
        onPress?.(user);
    }, [onPress, user]);

    const handleLongPress = useCallback(() => {
        onLongPress?.(user);
    }, [onLongPress, user]);

    const iconStyle = useMemo(() => {
        return [style.selector, (selected && style.selectorFilled), (!enabled && style.selectorDisabled)];
    }, [style, selected, enabled]);

    const Icon = () => {
        return (
            <View style={style.selectorContainer}>
                <View style={iconStyle}>
                    {selected &&
                        <CompassIcon
                            name='check'
                            size={24}
                            color={theme.sidebarText}
                        />
                    }
                </View>
            </View>
        );
    };

    let usernameDisplay = `@${username}`;
    if (isMyUser) {
        usernameDisplay = formatMessage({
            id: 'mobile.create_direct_message.you',
            defaultMessage: '@{username} - you',
        }, {username});
    }

    const teammateDisplay = displayUsername(user, intl.locale, teammateNameDisplay);
    const showTeammateDisplay = teammateDisplay !== username;

    const userItemTestID = `${testID}.${id}`;

    return (
        <>
            <TouchableWithFeedback
                onLongPress={handleLongPress}
                onPress={handlePress}
                underlayColor={changeOpacity(theme.centerChannelColor, 0.16)}
            >
                <View
                    ref={viewRef}
                    style={style.container}
                    testID={userItemTestID}
                >
                    <View style={style.profileContainer}>
                        <ProfilePicture
                            author={user}
                            size={40}
                            iconSize={24}
                            testID={`${userItemTestID}.profile_picture`}
                        />
                    </View>
                    <View style={style.textContainer}>
                        <View style={style.indicatorContainer}>
                            <Text
                                style={style.displayName}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                testID={`${userItemTestID}.display_name`}
                            >
                                {teammateDisplay}
                            </Text>
                            <BotTag
                                show={Boolean(user.is_bot)}
                                testID={`${userItemTestID}.bot.tag`}
                            />
                            <GuestTag
                                show={isGuest(user.roles)}
                                testID={`${userItemTestID}.guest.tag`}
                            />
                        </View>
                        {showTeammateDisplay &&
                        <View>
                            <Text
                                style={style.username}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                testID={`${userItemTestID}.team_display_name`}
                            >
                                {usernameDisplay}
                            </Text>
                        </View>
                        }
                        {user.delete_at > 0 &&
                        <View>
                            <Text
                                style={style.deactivated}
                                testID={`${userItemTestID}.deactivated`}
                            >
                                {formatMessage({id: 'mobile.user_list.deactivated', defaultMessage: 'Deactivated'})}
                            </Text>
                        </View>
                        }
                    </View>
                    {selectable &&
                    <Icon/>
                    }
                </View>
            </TouchableWithFeedback>
            {showTutorial &&
            <TutorialHighlight
                itemBounds={itemBounds}
                onDismiss={handleDismissTutorial}
            >
                <TutorialLongPress
                    message={intl.formatMessage({id: 'user.tutorial.long_press', defaultMessage: "Long-press on an item to view a user's profile"})}
                    style={isTablet ? style.tutorialTablet : style.tutorial}
                />
            </TutorialHighlight>
            }
        </>
    );
}

