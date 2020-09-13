// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    TouchableOpacity,
    Text,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {paddingHorizontal as padding} from '@components/safe_area_view/iphone_x_spacing';
import {makeStyleSheetFromTheme} from '@utils/theme';

const ITEM_HEIGHT = 45;

export default class SelectTimezoneRow extends PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        timezone: PropTypes.string.isRequired,
        selectedTimezone: PropTypes.string,
        onPress: PropTypes.func.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    timezoneSelected = () => {
        const {timezone, onPress} = this.props;
        onPress(timezone);
    };

    render() {
        const {theme, timezone, selectedTimezone, isLandscape} = this.props;
        const styles = getStyleSheet(theme);

        const selected = timezone === selectedTimezone && (
            <CompassIcon
                name='check'
                size={24}
                color={theme.linkColor}
            />
        );

        return (
            <TouchableOpacity
                style={[styles.itemContainer, padding(isLandscape)]}
                key={timezone}
                onPress={this.timezoneSelected}
            >
                <View style={styles.item}>
                    <Text style={styles.itemText}>
                        {timezone}
                    </Text>
                </View>
                {selected}
            </TouchableOpacity>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        itemContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            paddingHorizontal: 15,
            height: ITEM_HEIGHT,
        },
        item: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
        },
        itemText: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
    };
});
