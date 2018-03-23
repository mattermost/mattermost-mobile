// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text, TouchableOpacity, View} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';

import {emptyFunction} from 'app/utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ExtensionNavBar extends PureComponent {
    static propTypes = {
        authenticated: PropTypes.bool,
        backButton: PropTypes.bool,
        leftButtonTitle: PropTypes.string,
        onLeftButtonPress: PropTypes.func,
        onRightButtonPress: PropTypes.func,
        rightButtonTitle: PropTypes.string,
        theme: PropTypes.object.isRequired,
        title: PropTypes.string,
    };

    static defaultProps = {
        backButton: false,
        onLeftButtonPress: emptyFunction,
        title: 'Mattermost',
    };

    renderLeftButton = (styles) => {
        const {backButton, leftButtonTitle, onLeftButtonPress} = this.props;
        let backComponent;
        if (backButton) {
            backComponent = (
                <IonIcon
                    name='ios-arrow-back'
                    style={styles.backButton}
                />
            );
        } else if (leftButtonTitle) {
            backComponent = (
                <Text
                    ellipsisMode='tail'
                    numberOfLines={1}
                    style={styles.leftButton}
                >
                    {leftButtonTitle}
                </Text>
            );
        }

        if (backComponent) {
            return (
                <TouchableOpacity
                    onPress={onLeftButtonPress}
                    style={styles.backButtonContainer}
                >
                    {backComponent}
                </TouchableOpacity>
            );
        }

        return <View style={styles.backButtonContainer}/>;
    };

    renderRightButton = (styles) => {
        const {authenticated, onRightButtonPress, rightButtonTitle} = this.props;

        if (rightButtonTitle && authenticated) {
            return (
                <TouchableOpacity
                    onPress={onRightButtonPress}
                    style={styles.rightButtonContainer}
                >
                    <Text
                        ellipsisMode='tail'
                        numberOfLines={1}
                        style={styles.rightButton}
                    >
                        {rightButtonTitle}
                    </Text>
                </TouchableOpacity>
            );
        }

        return <View style={styles.rightButtonContainer}/>;
    };

    render() {
        const {theme, title} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <View style={styles.container}>
                {this.renderLeftButton(styles)}
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>
                        {title}
                    </Text>
                </View>
                {this.renderRightButton(styles)}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
            flexDirection: 'row',
            height: 45,
        },
        backButtonContainer: {
            justifyContent: 'center',
            paddingHorizontal: 15,
            width: '30%',
        },
        titleContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
        },
        backButton: {
            color: theme.linkColor,
            fontSize: 34,
        },
        leftButton: {
            color: theme.linkColor,
            fontSize: 16,
        },
        title: {
            fontSize: 17,
            fontWeight: '600',
        },
        rightButtonContainer: {
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingHorizontal: 15,
            width: '30%',
        },
        rightButton: {
            color: theme.linkColor,
            fontSize: 16,
            fontWeight: '600',
        },
    };
});
