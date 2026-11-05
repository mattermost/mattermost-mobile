// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {Children, type ReactElement, useCallback, useMemo} from 'react';
import {useIntl, defineMessages} from 'react-intl';
import {StyleSheet, Text, View} from 'react-native';
import urlParse from 'url-parse';

import {startPhoneCall} from '@calls/alerts';
import {isPhoneDialingAvailable} from '@calls/state';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint, isEmail} from '@utils/helpers';
import {getTelNumber, isTelHref} from '@utils/phone_number';
import {openLink} from '@utils/url/links';

type MarkdownLinkProps = {
    children: ReactElement;
    experimentalNormalizeMarkdownLinks: string;
    href: string;
    siteURL: string;
    onLinkLongPress?: (url?: string) => void;
}

const messages = defineMessages({
    callWithMattermost: {
        id: 'mobile.markdown.link.call_with_mattermost',
        defaultMessage: 'Call with Mattermost',
    },
    callWithPhone: {
        id: 'mobile.markdown.link.call_with_phone',
        defaultMessage: 'Call with phone',
    },
    copyEmail: {
        id: 'mobile.markdown.link.copy_email',
        defaultMessage: 'Copy Email Address',
    },
    copyPhone: {
        id: 'mobile.markdown.link.copy_phone',
        defaultMessage: 'Copy Phone Number',
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

function getCopyLinkMessage(href: string) {
    if (isTelHref(href)) {
        return messages.copyPhone;
    }

    if (isEmail(href.replace(/^(mailto:|tel:)/i, ''))) {
        return messages.copyEmail;
    }

    return messages.copyURL;
}

const MarkdownLink = ({children, experimentalNormalizeMarkdownLinks, href, siteURL, onLinkLongPress}: MarkdownLinkProps) => {
    const intl = useIntl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const serverUrl = useServerUrl();

    const handlePress = usePreventDoubleTap(useCallback(() => {
        if (!isTelHref(href) || !isPhoneDialingAvailable(serverUrl)) {
            openLink(href, serverUrl, siteURL ?? '', intl);
            return;
        }

        const renderContent = () => (
            <View style={style.bottomSheet}>
                <SlideUpPanelItem
                    leftIcon='phone-in-talk'
                    onPress={() => {
                        dismissBottomSheet();
                        startPhoneCall(intl, serverUrl, getTelNumber(href));
                    }}
                    testID='markdown_link.bottom_sheet.call_with_mattermost'
                    text={intl.formatMessage(messages.callWithMattermost)}
                />
                <SlideUpPanelItem
                    leftIcon='phone-outline'
                    onPress={() => {
                        dismissBottomSheet();
                        openLink(href, serverUrl, siteURL ?? '', intl);
                    }}
                    testID='markdown_link.bottom_sheet.call_with_phone'
                    text={intl.formatMessage(messages.callWithPhone)}
                />
                <SlideUpPanelItem
                    destructive={true}
                    leftIcon='cancel'
                    onPress={dismissBottomSheet}
                    testID='markdown_link.bottom_sheet.cancel'
                    text={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                />
            </View>
        );

        bottomSheet(renderContent, [1, bottomSheetSnapPoint(3, ITEM_HEIGHT)]);
    }, [href, intl, serverUrl, siteURL]));

    const handleLongPress = useCallback(() => {
        if (managedConfig?.copyAndPasteProtection !== 'true') {
            if (onLinkLongPress) {
                onLinkLongPress(href);
                return;
            }

            const cleanHref = href.replace(/^(mailto:|tel:)/i, '');
            const copyMessage = getCopyLinkMessage(href);

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
                            text={intl.formatMessage(copyMessage)}
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

            bottomSheet(renderContent, [1, bottomSheetSnapPoint(2, ITEM_HEIGHT)]);
        }
    }, [managedConfig?.copyAndPasteProtection, onLinkLongPress, href, intl]);

    const renderedChildren = useMemo(() => {
        if (!experimentalNormalizeMarkdownLinks) {
            return children;
        }

        return Children.map(children, (c) => {
            const child = c as ReactElement<any>;
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
    }, [children, experimentalNormalizeMarkdownLinks]);

    return (
        <Text
            onPress={handlePress}
            onLongPress={handleLongPress}
            testID='markdown_link'
        >
            {renderedChildren}
        </Text>
    );
};

export default MarkdownLink;
