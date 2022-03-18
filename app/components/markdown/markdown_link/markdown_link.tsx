// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-community/clipboard';
import React, {Children, ReactElement, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, StyleSheet, Text, View} from 'react-native';
import urlParse from 'url-parse';

import {switchToChannelByName} from '@actions/remote/channel';
import {showPermalink} from '@actions/remote/permalink';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import DeepLinkTypes from '@constants/deep_linking';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {bottomSheet, dismissAllModals, dismissBottomSheet, popToRoot} from '@screens/navigation';
import {errorBadChannel} from '@utils/draft';
import {preventDoubleTap} from '@utils/tap';
import {matchDeepLink, normalizeProtocol, tryOpenURL} from '@utils/url';

import type {DeepLinkChannel, DeepLinkPermalink, DeepLinkWithData} from '@typings/launch';

type MarkdownLinkProps = {
    children: ReactElement;
    experimentalNormalizeMarkdownLinks: string;
    href: string;
    siteURL: string;
}

const style = StyleSheet.create({
    bottomSheet: {
        flex: 1,
    },
});

const MarkdownLink = ({children, experimentalNormalizeMarkdownLinks, href, siteURL}: MarkdownLinkProps) => {
    const intl = useIntl();
    const managedConfig = useManagedConfig();
    const serverUrl = useServerUrl();
    const theme = useTheme();

    const {formatMessage} = intl;

    const handlePress = preventDoubleTap(async () => {
        const url = normalizeProtocol(href);

        if (!url) {
            return;
        }

        const match: DeepLinkWithData | null = matchDeepLink(url, serverUrl, siteURL);

        if (match && match.data?.teamName) {
            if (match.type === DeepLinkTypes.CHANNEL) {
                const result = await switchToChannelByName(serverUrl, (match?.data as DeepLinkChannel).channelName, match.data?.teamName, errorBadChannel, intl);
                if (!result.error) {
                    await dismissAllModals();
                    await popToRoot();
                }
            } else if (match.type === DeepLinkTypes.PERMALINK) {
                showPermalink(serverUrl, match.data.teamName, (match.data as DeepLinkPermalink).postId, intl);
            }
        } else {
            const onError = () => {
                Alert.alert(
                    formatMessage({
                        id: 'mobile.link.error.title',
                        defaultMessage: 'Error',
                    }),
                    formatMessage({
                        id: 'mobile.link.error.text',
                        defaultMessage: 'Unable to open the link.',
                    }),
                );
            };

            tryOpenURL(url, onError);
        }
    });

    const parseLinkLiteral = (literal: string) => {
        let nextLiteral = literal;

        const WWW_REGEX = /\b^(?:www.)/i;
        if (nextLiteral.match(WWW_REGEX)) {
            nextLiteral = literal.replace(WWW_REGEX, 'www.');
        }

        const parsed = urlParse(nextLiteral, {});

        return parsed.href;
    };

    const parseChildren = () => {
        return Children.map(children, (child: ReactElement) => {
            if (!child.props.literal || typeof child.props.literal !== 'string' || (child.props.context && child.props.context.length && !child.props.context.includes('link'))) {
                return child;
            }

            const {props, ...otherChildProps} = child;
            // eslint-disable-next-line react/prop-types
            const {literal, ...otherProps} = props;

            const nextProps = {
                literal: parseLinkLiteral(literal),
                ...otherProps,
            };

            return {
                props: nextProps,
                ...otherChildProps,
            };
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
                            icon='content-copy'
                            onPress={() => {
                                dismissBottomSheet();
                                Clipboard.setString(href);
                            }}
                            testID='at_mention.bottom_sheet.copy_url'
                            text={intl.formatMessage({id: 'mobile.markdown.link.copy_url', defaultMessage: 'Copy URL'})}
                        />
                        <SlideUpPanelItem
                            destructive={true}
                            icon='cancel'
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
                closeButtonId: 'close-mardown-link',
                renderContent,
                snapPoints: [3 * ITEM_HEIGHT, 10],
                title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
                theme,
            });
        }
    }, [managedConfig, intl, theme]);

    const renderChildren = experimentalNormalizeMarkdownLinks ? parseChildren() : children;

    return (
        <Text
            onPress={handlePress}
            onLongPress={handleLongPress}
        >
            {renderChildren}
        </Text>
    );
};

export default MarkdownLink;
