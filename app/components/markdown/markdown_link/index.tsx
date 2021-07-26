// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {Children, memo, ReactElement} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Text} from 'react-native';
import urlParse from 'url-parse';

import DeepLinkTypes from '@constants/deep_linking';
import {useServerUrl} from '@context/server_url';
import {DeepLinkWithData} from '@typings/launch';
import {dismissAllModals, popToRoot} from '@screens/navigation';
import {matchDeepLink, normalizeProtocol, tryOpenURL} from '@utils/url';
import {preventDoubleTap} from '@utils/tap';

type MarkdownLinkProps = {
    config: Partial<ClientConfig>;
    children: ReactElement;
    href: string;
}

//todo: Add observable to monitor the current team value

const MarkdownLink = ({children, config, href}: MarkdownLinkProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const {formatMessage} = intl;
    const {SiteURL: siteURL = ''} = config;

    // const currentTeamName = currentTeam.name;

    const handlePress = preventDoubleTap(async () => {
        //todo:  to implement the redux actions handleSelectChannelByName and  showPermalink
        const url = normalizeProtocol(href);

        if (!url) {
            return;
        }

        const match: DeepLinkWithData | null = matchDeepLink(url, serverUrl, siteURL);

        if (match) {
            if (match.type === DeepLinkTypes.CHANNEL) {
                // await handleSelectChannelByName((match?.data as DeepLinkChannel).channelName, match?.data?.teamName, errorBadChannel, intl);
                await dismissAllModals();
                await popToRoot();
            } else if (match.type === DeepLinkTypes.PERMALINK) {
                // const teamName = match.data?.teamName === PERMALINK_GENERIC_TEAM_NAME_REDIRECT ? currentTeamName : match.data?.teamName;
                // showPermalink(intl, teamName, (match.data as DeepLinkPermalink).postId);
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

    const handleLongPress = async () => {
        //todo: Use new slide-up-panel component to handleLinkCopy()

    };

    // const handleLinkCopy = () => {
    //     Clipboard.setString(href);
    // };

    const renderChildren = config.ExperimentalNormalizeMarkdownLinks ? parseChildren() : children;

    return (
        <Text
            onPress={handlePress}
            onLongPress={handleLongPress}
        >
            {renderChildren}
        </Text>
    );
};

export default memo(MarkdownLink);
