// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {Children, type ReactElement, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import urlParse from 'url-parse';

import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {handleDeepLink, matchDeepLink} from '@utils/deep_link';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {normalizeProtocol, tryOpenURL} from '@utils/url';

type MarkdownLinkProps = {
    children: ReactElement;
    experimentalNormalizeMarkdownLinks: string;
    href: string;
    siteURL: string;
    onLinkLongPress?: (url?: string) => void;
}

const style = StyleSheet.create({
    bottomSheet: {
        flex: 1,
    },
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

const MarkdownLink = ({children, experimentalNormalizeMarkdownLinks, href, siteURL, onLinkLongPress}: MarkdownLinkProps) => {
    const intl = useIntl();
    const {bottom} = useSafeAreaInsets();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const serverUrl = useServerUrl();
    const theme = useTheme();

    const {formatMessage} = intl;

    const handlePress = useCallback(preventDoubleTap(async () => {
        const url = normalizeProtocol(href);

        if (!url) {
            return;
        }

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

        const match = matchDeepLink(url, serverUrl, siteURL);

        if (match) {
            const {error} = await handleDeepLink(match.url, intl);
            if (error) {
                tryOpenURL(match.url, onError);
            }
        } else {
            tryOpenURL(url, onError);
        }
    }), [href, intl.locale, serverUrl, siteURL]);

    const parseChildren = useCallback(() => {
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
    }, [children]);

    const handleLongPress = useCallback(() => {
        if (managedConfig?.copyAndPasteProtection !== 'true') {
            if (onLinkLongPress) {
                onLinkLongPress(href);
                return;
            }

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
                                Clipboard.setString(href);
                            }}
                            testID='at_mention.bottom_sheet.copy_url'
                            text={intl.formatMessage({id: 'mobile.markdown.link.copy_url', defaultMessage: 'Copy URL'})}
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
                closeButtonId: 'close-mardown-link',
                renderContent,
                snapPoints: [1, bottomSheetSnapPoint(2, ITEM_HEIGHT, bottom)],
                title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
                theme,
            });
        }
    }, [managedConfig, intl, bottom, theme, onLinkLongPress]);

    const renderChildren = experimentalNormalizeMarkdownLinks ? parseChildren() : children;

    return (
        <Text
            onPress={handlePress}
            onLongPress={handleLongPress}
            testID='markdown_link'
        >
            {renderChildren}
        </Text>
    );
};

export default MarkdownLink;
