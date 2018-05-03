// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Children, PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Clipboard, Linking, Text} from 'react-native';
import urlParse from 'url-parse';
import {intlShape} from 'react-intl';

import CustomPropTypes from 'app/constants/custom_prop_types';
import mattermostManaged from 'app/mattermost_managed';

import Config from 'assets/config';

import {escapeRegex} from 'app/utils/markdown';
import {preventDoubleTap} from 'app/utils/tap';
import {normalizeProtocol} from 'app/utils/url';

export default class MarkdownLink extends PureComponent {
    static propTypes = {
        children: CustomPropTypes.Children.isRequired,
        href: PropTypes.string.isRequired,
        onLongPress: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        serverURL: PropTypes.string.isRequired,
        siteURL: PropTypes.string.isRequired,
    };

    static defaultProps = {
        onLongPress: () => true,
        onPermalinkPress: () => true,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    handlePress = preventDoubleTap(() => {
        const {href, onPermalinkPress, serverURL, siteURL} = this.props;
        const url = normalizeProtocol(href);

        if (!url) {
            return;
        }

        const match = this.matchPermalink(url, serverURL) || this.matchPermalink(url, siteURL);

        if (match) {
            const teamName = match[1];
            const postId = match[2];
            onPermalinkPress(postId, teamName);
        } else {
            Linking.canOpenURL(url).then((supported) => {
                if (supported) {
                    Linking.openURL(url);
                }
            });
        }
    });

    matchPermalink = (link, rootURL) => {
        if (!rootURL) {
            return null;
        }

        return new RegExp('^' + escapeRegex(rootURL) + '\\/([^\\/]+)\\/pl\\/(\\w+)').exec(link);
    }

    parseLinkLiteral = (literal) => {
        let nextLiteral = literal;

        const WWW_REGEX = /\b^(?:www.)/i;
        if (nextLiteral.match(WWW_REGEX)) {
            nextLiteral = literal.replace(WWW_REGEX, 'www.');
        }

        const parsed = urlParse(nextLiteral, {});

        return parsed.href;
    };

    parseChildren = () => {
        return Children.map(this.props.children, (child) => {
            if (!child.props.literal || typeof child.props.literal !== 'string' || (child.props.context && child.props.context.length && !child.props.context.includes('link'))) {
                return child;
            }

            const {props, ...otherChildProps} = child;
            const {literal, ...otherProps} = props;

            const nextProps = {
                literal: this.parseLinkLiteral(literal),
                ...otherProps,
            };

            return {
                props: nextProps,
                ...otherChildProps,
            };
        });
    }

    handleLongPress = async () => {
        const {formatMessage} = this.context.intl;

        const config = await mattermostManaged.getLocalConfig();

        let action;
        if (config.copyAndPasteProtection !== 'true') {
            action = {
                text: formatMessage({id: 'mobile.markdown.link.copy_url', defaultMessage: 'Copy URL'}),
                onPress: this.handleCopyURL,
            };
        }

        this.props.onLongPress(action);
    }

    handleCopyURL = () => {
        Clipboard.setString(this.props.href);
    }

    render() {
        const children = Config.ExperimentalNormalizeMarkdownLinks ? this.parseChildren() : this.props.children;

        return (
            <Text
                onPress={this.handlePress}
                onLongPress={this.handleLongPress}
            >
                {children}
            </Text>
        );
    }
}
