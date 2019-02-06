// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity,
} from 'react-native';

import Emoji from 'app/components/emoji';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import FormattedText from 'app/components/formatted_text';

import {ALL_EMOJIS} from 'app/constants/emoji';

export default class ReactionHeaderItem extends PureComponent {
    static propTypes = {
        count: PropTypes.number.isRequired,
        emojiName: PropTypes.string.isRequired,
        highlight: PropTypes.bool.isRequired,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    handleOnPress = () => {
        const {emojiName, highlight, onPress} = this.props;
        onPress(emojiName, highlight);
    };

    renderContent = () => {
        const {count, emojiName, theme} = this.props;
        const styles = getStyleSheet(theme);

        if (emojiName === ALL_EMOJIS) {
            return (
                <React.Fragment>
                    <FormattedText
                        id='mobile.reaction_header.all_emojis'
                        defaultMessage={'All'}
                        style={styles.text}
                    />
                    <Text style={styles.text}>{count}</Text>
                </React.Fragment>
            );
        }

        return (
            <React.Fragment>
                <Emoji
                    emojiName={emojiName}
                    size={16}
                    padding={5}
                />
                <Text style={styles.text}>{count}</Text>
            </React.Fragment>
        );
    };

    render() {
        const {emojiName, highlight, theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <TouchableOpacity
                onPress={this.handleOnPress}
                style={[styles.reaction, (highlight ? styles.highlight : styles.regular), (emojiName === ALL_EMOJIS && styles.allText)]}
            >
                {this.renderContent()}
            </TouchableOpacity>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        allText: {
            marginLeft: 7,
        },
        text: {
            color: theme.buttonBg,
            marginLeft: 4,
            fontSize: 16,
        },
        highlight: {
            borderColor: theme.buttonBg,
            borderBottomWidth: 2,
        },
        regular: {
            borderColor: 'transparent',
            borderBottomWidth: 2,
        },
        reaction: {
            alignItems: 'center',
            flexDirection: 'row',
            height: 35,
            marginRight: 6,
            marginBottom: 5,
            marginTop: 3,
            paddingVertical: 2,
            paddingHorizontal: 6,
        },
    };
});
