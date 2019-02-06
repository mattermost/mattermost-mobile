// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text, TouchableHighlight, TouchableOpacity, View} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export const RECENT_LABEL_HEIGHT = 42;

export default class RecentItem extends PureComponent {
    static propTypes = {
        item: PropTypes.object.isRequired,
        removeSearchTerms: PropTypes.func.isRequired,
        setRecentValue: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    handlePress = () => {
        const {item, setRecentValue} = this.props;

        setRecentValue(item);
    };

    handleRemove = () => {
        const {item, removeSearchTerms} = this.props;
        removeSearchTerms(item);
    };

    render() {
        const {item, theme} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <TouchableHighlight
                key={item.terms}
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={this.handlePress}
            >
                <View
                    style={style.recentItemContainer}
                >
                    <Text
                        style={style.recentItemLabel}
                    >
                        {item.terms}
                    </Text>
                    <TouchableOpacity
                        onPress={this.handleRemove}
                        style={style.recentRemove}
                    >
                        <IonIcon
                            name='ios-close-circle-outline'
                            size={20}
                            color={changeOpacity(theme.centerChannelColor, 0.6)}
                        />
                    </TouchableOpacity>
                </View>
            </TouchableHighlight>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        recentItemContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: RECENT_LABEL_HEIGHT,
        },
        recentItemLabel: {
            color: theme.centerChannelColor,
            fontSize: 14,
            height: 20,
            flex: 1,
            paddingHorizontal: 16,
        },
        recentRemove: {
            alignItems: 'center',
            height: RECENT_LABEL_HEIGHT,
            justifyContent: 'center',
            width: 50,
        },
    };
});
