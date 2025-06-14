// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {Children, type ReactElement, useCallback} from 'react';
import {useIntl, defineMessages} from 'react-intl';
import {StyleSheet, Text, View} from 'react-native';
import urlParse from 'url-parse';

import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint, isEmail} from '@utils/helpers';
import {openLink} from '@utils/url/links';

type MarkdownLinkProps = {
    children: ReactElement;
    experimentalNormalizeMarkdownLinks: string;
    href: string;
    siteURL: string;
    onLinkLongPress?: (url?: string) => void;
}

const messages = defineMessages({
    copyEmail: {
        id: 'mobile.markdown.link.copy_email',
        defaultMessage: 'Copy Email Address',
    },
    copyURL: {
        id: 'mobile.markdown.link.copy_url',
        defaultMessage: 'Copy URL',
    },
});

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
    const managedConfig = useManagedConfig<ManagedConfig>();
    const serverUrl = useServerUrl();
    const theme = useTheme();

    const handlePress = usePreventDoubleTap(useCallback(() => {
        openLink(href, serverUrl, siteURL, intl);
    }, [href, intl, serverUrl, siteURL]));

    const parseChildren = useCallback(() => {
        return Children.map(children, (child: ReactElement) => {
            if (!child.props.literal || typeof child.props.literal !== 'string' || (child.props.context && child.props.context.length && !child.props.context.includes('link'))) {
                return child;
            }

            const {props, ...otherChildProps} = child;

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

            const cleanHref = href.replace(/^mailto:/, '');
            const isEmailLink = isEmail(cleanHref);

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
                                Clipboard.setString(cleanHref);
                            }}
                            testID='at_mention.bottom_sheet.copy_url'
                            text={intl.formatMessage(isEmailLink ? messages.copyEmail : messages.copyURL)}
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
                snapPoints: [1, bottomSheetSnapPoint(2, ITEM_HEIGHT)],
                title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
                theme,
            });
        }
    }, [managedConfig?.copyAndPasteProtection, onLinkLongPress, intl, theme, href]);

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
