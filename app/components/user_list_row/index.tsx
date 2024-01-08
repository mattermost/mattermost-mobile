// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState, type ComponentProps} from 'react';
import {useIntl} from 'react-intl';
import {
    InteractionManager,
    Platform,
    View,
} from 'react-native';

import {storeProfileLongPressTutorial} from '@actions/app/global';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TutorialHighlight from '@components/tutorial_highlight';
import TutorialLongPress from '@components/tutorial_highlight/long_press';
import UserGroupItem from '@components/user_group_item';
import UserItem from '@components/user_item';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import type {GroupModel, UserModel} from '@app/database/models/server';

type TUser = UserProfile | UserModel;
type TGroup = Group | GroupModel;

type Props<T extends TUser | TGroup> = {
    highlight?: boolean;
    id: string;
    manageMode: boolean;
    selectable: boolean;
    disabled?: boolean;
    selected: boolean;
    showManageMode: boolean;
    testID: string;
    tutorialWatched?: boolean;
    spacing: ComponentProps<typeof UserItem>['spacing'];
    item: T;
    onLongPress: (item: T) => void;
    onPress?: (item: T) => void;
    isChannelAdmin?: boolean;
    isMyUser?: boolean;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        selector: {
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 12,
        },
        selectorManage: {
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            marginLeft: 12,
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

const DEFAULT_ICON_OPACITY = 0.32;

function UserListRow({
    id,
    isMyUser,
    highlight,
    isChannelAdmin,
    onPress,
    onLongPress,
    spacing = 'normal',
    manageMode = false,
    selectable,
    disabled,
    selected,
    showManageMode = false,
    testID,
    tutorialWatched = false,
    item,
}: Props<TUser | TGroup>) {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const [showTutorial, setShowTutorial] = useState(false);
    const [itemBounds, setItemBounds] = useState<TutorialItemBounds>({startX: 0, startY: 0, endX: 0, endY: 0});
    const viewRef = useRef<View>(null);
    const style = getStyleFromTheme(theme);
    const {formatMessage} = useIntl();

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
                    size={({compact: 28, normal: 32, spacious: 32})[spacing]}
                    color={color}
                />
            </View>
        );
    }, [isChannelAdmin, showManageMode, theme, spacing]);

    const onLayout = useCallback(() => {
        if (showTutorial) {
            startTutorial();
        }
    }, [showTutorial]);

    const selectIcon = useMemo(() => {
        if (!selectable && !selected) {
            return null;
        }

        const color = selected ? theme.buttonBg : changeOpacity(theme.centerChannelColor, DEFAULT_ICON_OPACITY);
        return (
            <View style={style.selector}>
                <CompassIcon
                    name={selected ? 'check-circle' : 'circle-outline'}
                    size={({compact: 28, normal: 32, spacious: 32})[spacing]}
                    color={color}
                />
            </View>
        );
    }, [selectable, disabled, selected, theme]);

    const userItemTestID = `${testID}.${id}`;

    return (
        <>
            {'username' in item ? (
                <UserItem
                    user={item}
                    onUserPress={onPress}
                    onUserLongPress={onLongPress}
                    showBadges={true}
                    testID={userItemTestID}
                    rightDecorator={manageMode ? manageModeIcon : selectIcon}
                    disabled={!(selectable || selected || !disabled)}
                    viewRef={viewRef}
                    spacing={spacing}
                    onLayout={onLayout}
                />
            ) : (
                <UserGroupItem
                    group={item}
                    onGroupPress={onPress}
                    onGroupLongPress={onLongPress}
                    testID={userItemTestID}
                    rightDecorator={manageMode ? manageModeIcon : selectIcon}
                    disabled={!(selectable || selected || !disabled)}
                    viewRef={viewRef}
                    spacing={spacing}
                    onLayout={onLayout}
                />
            )}
            {showTutorial &&
            <TutorialHighlight
                itemBounds={itemBounds}
                onDismiss={handleDismissTutorial}
            >
                {Boolean(itemBounds.endX) &&
                <TutorialLongPress
                    message={formatMessage({id: 'user.tutorial.long_press', defaultMessage: "Long-press on an item to view a user's profile or a group's members"})}
                    style={isTablet ? style.tutorialTablet : style.tutorial}
                />
                }
            </TutorialHighlight>
            }
        </>
    );
}

export default React.memo(UserListRow);
