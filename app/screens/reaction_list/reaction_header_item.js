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

        return (
            <React.Fragment>
                <Emoji
                    emojiName={emojiName}
                    textStyle={styles.emojiText}
                    size={16}
                    padding={5}
                />
                <Text style={styles.text}>{count}</Text>
            </React.Fragment>
        );
    };

    render() {
        const {highlight, theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <TouchableOpacity
                onPress={this.handleOnPress}
                style={[styles.reaction, (highlight ? styles.highlight : styles.regular)]}
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
        emojiText: {
            color: '#000',
            fontWeight: 'bold',
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
