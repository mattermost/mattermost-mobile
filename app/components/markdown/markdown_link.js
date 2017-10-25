// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Children, PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Clipboard, Linking, Text} from 'react-native';
import urlParse from 'url-parse';
import {injectIntl, intlShape} from 'react-intl';

import CustomPropTypes from 'app/constants/custom_prop_types';
import Config from 'assets/config';

class MarkdownLink extends PureComponent {
    static propTypes = {
        children: CustomPropTypes.Children.isRequired,
        href: PropTypes.string.isRequired,
        intl: intlShape.isRequired,
        onLongPress: PropTypes.func
    };

    static defaultProps = {
        onLongPress: () => true
    }

    handlePress = () => {
        // Android doesn't like the protocol being upper case
        const url = this.props.href;

        Linking.canOpenURL(url).then((supported) => {
            if (supported) {
                Linking.openURL(url);
            }
        });
    };

    parseLinkLiteral = (literal) => {
        let nextLiteral = literal;

        const WWW_REGEX = /\b^(?:www.)/i;
        if (nextLiteral.match(WWW_REGEX)) {
            nextLiteral = literal.replace(WWW_REGEX, 'www.');
        }

        const parsed = urlParse(nextLiteral, {});

        return parsed.href;
    }

    parseChildren = () => {
        return Children.map(this.props.children, (child) => {
            if (!child.props.literal || typeof child.props.literal !== 'string' || (child.props.context && child.props.context.length && !child.props.context.includes('link'))) {
                return child;
            }

            const {props, ...otherChildProps} = child;
            const {literal, ...otherProps} = props;

            const nextProps = {
                literal: this.parseLinkLiteral(literal),
                ...otherProps
            };

            return {
                props: nextProps,
                ...otherChildProps
            };
        });
    }

    handleLongPress = () => {
        const {formatMessage} = this.props.intl;

        const action = {
            text: formatMessage({id: 'mobile.markdown.link.copy_url', defaultMessage: 'Copy URL'}),
            onPress: this.handleCopyURL
        };

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

export default injectIntl(MarkdownLink);