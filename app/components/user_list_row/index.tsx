// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    InteractionManager,
    Platform,
    Text,
    View,
} from 'react-native';

import {storeProfileLongPressTutorial} from '@actions/app/global';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import ProfilePicture from '@components/profile_picture';
import {BotTag, GuestTag} from '@components/tag';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import TutorialHighlight from '@components/tutorial_highlight';
import TutorialLongPress from '@components/tutorial_highlight/long_press';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername, isGuest} from '@utils/user';

type Props = {
    highlight?: boolean;
    id: string;
    isMyUser: boolean;
    isChannelAdmin: boolean;
    manageMode: boolean;
    onLongPress: (user: UserProfile) => void;
    onPress?: (user: UserProfile) => void;
    selectable: boolean;
    disabled?: boolean;
    selected: boolean;
    showManageMode: boolean;
    teammateNameDisplay: string;
    testID: string;
    tutorialWatched?: boolean;
    user: UserProfile;
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
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
        },
        displayName: {
            height: 24,
            color: theme.centerChannelColor,
            maxWidth: '80%',
            ...typography('Body', 200, 'Regular'),
        },
        indicatorContainer: {
            flexDirection: 'row',
        },
        deactivated: {
            marginTop: 2,
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
        sharedUserIcon: {
            alignSelf: 'center',
            opacity: 0.75,
        },
        selector: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectorManage: {
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
        },
        manageText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 100, 'Regular'),
        },
        tutorial: {
            top: Platform.select({ios: -74, default: -94}),
        },
        tutorialTablet: {
            top: -84,
        },
    };
});

const DISABLED_OPACITY = 0.32;
const DEFAULT_ICON_OPACITY = 0.32;

function UserListRow({
    id,
    isMyUser,
    highlight,
    isChannelAdmin,
    onPress,
    onLongPress,
    manageMode = false,
    selectable,
    disabled,
    selected,
    showManageMode = false,
    teammateNameDisplay,
    testID,
    tutorialWatched = false,
    user,
}: Props) {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const [showTutorial, setShowTutorial] = useState(false);
    const [itemBounds, setItemBounds] = useState<TutorialItemBounds>({startX: 0, startY: 0, endX: 0, endY: 0});
    const viewRef = useRef<View>(null);
    const style = getStyleFromTheme(theme);
    const {formatMessage, locale} = useIntl();
    const {username} = user;

    const startTutorial = () => {
        viewRef.current?.measureInWindow((x, y, w, h) => {
            const bounds: TutorialItemBounds = {
                startX: x,
                startY: y,
                endX: x + w,
                endY: y + h,
            };
            if (viewRef.current) {
                setItemBounds(bounds);
            }
        });
    };

    const handleDismissTutorial = useCallback(() => {
        setShowTutorial(false);
        storeProfileLongPressTutorial();
    }, []);

    useEffect(() => {
        if (highlight && !tutorialWatched) {
            if (isTablet) {
                setShowTutorial(true);
                return;
            }
            InteractionManager.runAfterInteractions(() => {
                setShowTutorial(true);
            });
        }
    }, [highlight, tutorialWatched, isTablet]);

    const handlePress = useCallback(() => {
        if (isMyUser && manageMode) {
            return;
        }
        onPress?.(user);
    }, [onPress, isMyUser, manageMode, user]);

    const handleLongPress = useCallback(() => {
        onLongPress?.(user);
    }, [onLongPress, user]);

    const manageModeIcon = useMemo(() => {
        if (!showManageMode || isMyUser) {
            return null;
        }

        const color = changeOpacity(theme.centerChannelColor, 0.64);
        const i18nId = isChannelAdmin ? t('mobile.manage_members.admin') : t('mobile.manage_members.member');
        const defaultMessage = isChannelAdmin ? 'Admin' : 'Member';

        return (
            <View style={style.selectorManage}>
                <FormattedText
                    id={i18nId}
                    style={style.manageText}
                    defaultMessage={defaultMessage}
                />
                <CompassIcon
                    name={'chevron-down'}
                    size={18}
                    color={color}
                />
            </View>
        );
    }, [isChannelAdmin, showManageMode, theme]);

    const onLayout = useCallback(() => {
        startTutorial();
    }, []);

    const icon = useMemo(() => {
        if (!selectable) {
            return null;
        }

        const iconOpacity = DEFAULT_ICON_OPACITY * (disabled ? DISABLED_OPACITY : 1);
        const color = selected ? theme.buttonBg : changeOpacity(theme.centerChannelColor, iconOpacity);
        return (
            <View style={style.selector}>
                <CompassIcon
                    name={selected ? 'check-circle' : 'circle-outline'}
                    size={28}
                    color={color}
                />
            </View>
        );
    }, [selectable, disabled, selected, theme]);

    let usernameDisplay = `@${username}`;
    if (isMyUser) {
        usernameDisplay = formatMessage({
            id: 'mobile.create_direct_message.you',
            defaultMessage: '@{username} - you',
        }, {username});
    }

    const teammateDisplay = displayUsername(user, locale, teammateNameDisplay);
    const showTeammateDisplay = teammateDisplay !== username;

    const userItemTestID = `${testID}.${id}`;
    const opacity = selectable || selected || !disabled ? 1 : DISABLED_OPACITY;

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
                    <View style={[style.profileContainer, {opacity}]}>
                        <ProfilePicture
                            author={user}
                            size={40}
                            iconSize={24}
                            testID={`${userItemTestID}.profile_picture`}
                        />
                    </View>
                    <View style={[style.textContainer, {opacity}]}>
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
                    {manageMode ? manageModeIcon : icon}
                </View>
            </TouchableWithFeedback>
            {showTutorial &&
            <TutorialHighlight
                itemBounds={itemBounds}
                onDismiss={handleDismissTutorial}
                onLayout={onLayout}
            >
                <TutorialLongPress
                    message={formatMessage({id: 'user.tutorial.long_press', defaultMessage: "Long-press on an item to view a user's profile"})}
                    style={isTablet ? style.tutorialTablet : style.tutorial}
                />
            </TutorialHighlight>
            }
        </>
    );
}

export default React.memo(UserListRow);
