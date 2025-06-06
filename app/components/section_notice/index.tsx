// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Pressable, Text, View} from 'react-native';

import Tag from '@components/tag';
import {useTheme} from '@context/theme';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CompassIcon from '../compass_icon';
import Markdown from '../markdown';

import SectionNoticeButton from './section_notice_button';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    title: string;
    text?: string;
    primaryButton?: SectionNoticeButtonProps;
    secondaryButton?: SectionNoticeButtonProps;
    linkButton?: SectionNoticeButtonProps;
    type?: 'info' | 'success' | 'danger' | 'welcome' | 'warning' | 'hint';
    isDismissable?: boolean;
    onDismissClick?: () => void;
    location: AvailableScreens;
    tags?: string[];
    testID?: string;
    squareCorners?: boolean;
}

const iconByType = {
    info: 'information-outline',
    hint: 'lightbulb-outline',
    success: 'check',
    danger: 'alert-outline',
    warning: 'alert-outline',
    welcome: undefined,
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            borderWidth: 1,
            borderStyle: 'solid',
        },
        roundCorners: {
            borderRadius: 4,
        },
        content: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            padding: 16,
            gap: 12,
        },
        body: {
            flexDirection: 'column',
            gap: 8,
            flex: 1,
        },
        actions: {
            marginTop: 8,
            gap: 8,
        },
        title: {
            margin: 0,
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'SemiBold'),
        },
        welcomeTitle: {
            margin: 0,
            color: theme.centerChannelColor,
            ...typography('Heading', 400, 'SemiBold'),
        },
        baseText: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
        infoText: {
            color: theme.centerChannelColor,
        },
        infoIcon: {
            color: theme.sidebarTextActiveBorder,
        },
        infoContainer: {
            borderColor: changeOpacity(theme.sidebarTextActiveBorder, 0.16),
            backgroundColor: changeOpacity(theme.sidebarTextActiveBorder, 0.08),
        },
        successText: {
            color: theme.centerChannelColor,
        },
        successIcon: {
            color: theme.onlineIndicator,
        },
        successContainer: {
            borderColor: changeOpacity(theme.onlineIndicator, 0.16),
            backgroundColor: changeOpacity(theme.onlineIndicator, 0.08),
        },
        dangerText: {
            color: theme.dndIndicator,
        },
        dangerIcon: {
            color: theme.sidebarTextActiveBorder,
        },
        dangerContainer: {
            borderColor: changeOpacity(theme.dndIndicator, 0.16),
            backgroundColor: changeOpacity(theme.dndIndicator, 0.08),
        },
        warningText: {
            color: theme.awayIndicator,
        },
        warningIcon: {
            color: theme.sidebarTextActiveBorder,
        },
        warningContainer: {
            borderColor: changeOpacity(theme.awayIndicator, 0.16),
            backgroundColor: changeOpacity(theme.awayIndicator, 0.08),
        },
        welcomeText: {
            color: theme.centerChannelColor,
        },
        welcomeIcon: {
            color: theme.centerChannelColor,
        },
        welcomeContainer: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        },
        hintText: {
            color: theme.centerChannelColor,
        },
        hintIcon: {
            color: theme.sidebarTextActiveBorder,
        },
        hintContainer: {
            borderColor: changeOpacity(theme.sidebarTextActiveBorder, 0.16),
            backgroundColor: changeOpacity(theme.sidebarTextActiveBorder, 0.08),
        },
        dismissIcon: {
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
            right: 10,
            top: 10,
            width: 32,
            height: 32,
        },
        tagsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 4,
        },

    };
});

const SectionNotice = ({
    title,
    isDismissable,
    linkButton,
    onDismissClick,
    primaryButton,
    secondaryButton,
    text,
    type = 'info',
    location,
    tags,
    squareCorners,
    testID,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const icon = iconByType[type];
    const showDismiss = Boolean(isDismissable && onDismissClick);
    const hasButtons = primaryButton || secondaryButton || linkButton;
    const showTags = tags && tags.length > 0;

    const combinedContainerStyle = useMemo(() => [
        styles.container,
        styles[`${type}Container`],
        !squareCorners && styles.roundCorners,
    ], [styles, type, squareCorners]);
    const iconStyle = useMemo(() => styles[`${type}Icon`], [styles, type]);
    return (
        <View
            style={combinedContainerStyle}
            testID={testID || 'sectionNoticeContainer'}
        >
            <View style={styles.content}>
                {icon && (
                    <CompassIcon
                        name={icon}
                        style={iconStyle}
                        size={20}
                        testID='sectionNoticeHeaderIcon'
                    />
                )}
                <View style={styles.body}>
                    <Text style={styles.title}>{title}</Text>
                    {text && (
                        <Markdown
                            theme={theme}
                            location={location}
                            baseTextStyle={styles.baseText}
                            textStyles={getMarkdownTextStyles(theme)}
                            blockStyles={getMarkdownBlockStyles(theme)}
                            value={text}
                        />
                    )}
                    {showTags && (
                        <View style={styles.tagsContainer}>
                            {tags.map((tag) => (
                                <Tag
                                    key={tag}
                                    testID={`tag.${tag}`}
                                    message={tag}
                                />
                            ))}
                        </View>
                    )}
                    {hasButtons && (
                        <View style={styles.actions}>
                            {primaryButton && (
                                <SectionNoticeButton
                                    button={primaryButton}
                                    emphasis='primary'
                                />
                            )}
                            {secondaryButton && (
                                <SectionNoticeButton
                                    button={secondaryButton}
                                    emphasis='tertiary'
                                />
                            )}
                            {linkButton && (
                                <SectionNoticeButton
                                    button={linkButton}
                                    emphasis='link'
                                />
                            )}
                        </View>
                    )}
                </View>
            </View>
            {showDismiss && (
                <Pressable
                    style={styles.dismissIcon}
                    role={'button'}
                    onPress={onDismissClick}
                    testID={'sectionNoticeDismissButton'}
                >
                    <CompassIcon
                        name={'close'}
                        size={18}
                    />
                </Pressable>
            )}
        </View>
    );
};

export default SectionNotice;
