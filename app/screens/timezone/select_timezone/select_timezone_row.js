// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    TouchableOpacity,
    Text,
    View,
} from 'react-native';

import CheckMark from 'app/components/checkmark';

const ITEM_HEIGHT = 45;

export default class SelectTimezoneRow extends PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        timezone: PropTypes.string.isRequired,
        selectedTimezone: PropTypes.string,
        onPress: PropTypes.func.isRequired,
    };

    timezoneSelected = () => {
        const {timezone, onPress} = this.props;
        onPress(timezone);
    };

    render() {
        const {theme, timezone, selectedTimezone} = this.props;

        const selected = timezone === selectedTimezone && (
            <CheckMark
                width={12}
                height={12}
                color={theme.linkColor}
            />
        );

        return (
            <TouchableOpacity
                style={styles.itemContainer}
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

const styles = StyleSheet.create({
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
    },
});
