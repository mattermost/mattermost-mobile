// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

import CustomListRow from 'app/components/custom_list/custom_list_row';

export default class ChannelListRow extends React.PureComponent {
    static propTypes = {
        id: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        channel: PropTypes.object.isRequired,
        ...CustomListRow.propTypes,
    };

    onPress = () => {
        this.props.onPress(this.props.id);
    };

    render() {
        const style = getStyleFromTheme(this.props.theme);

        let purpose;
        if (this.props.channel.purpose) {
            purpose = (
                <Text
                    style={style.purpose}
                    ellipsizeMode='tail'
                    numberOfLines={1}
                >
                    {this.props.channel.purpose}
                </Text>
            );
        }

        return (
            <CustomListRow
                id={this.props.id}
                theme={this.props.theme}
                onPress={this.props.onPress ? this.onPress : null}
                enabled={this.props.enabled}
                selectable={this.props.selectable}
                selected={this.props.selected}
            >
                <View style={style.container}>
                    <View style={style.titleContainer}>
                        <Icon
                            name='globe'
                            style={style.icon}
                        />
                        <Text style={style.displayName}>
                            {this.props.channel.display_name}
                        </Text>
                    </View>
                    {purpose}
                </View>
            </CustomListRow>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        titleContainer: {
            alignItems: 'center',
            flexDirection: 'row',
        },
        displayName: {
            fontSize: 16,
            color: theme.centerChannelColor,
            marginLeft: 5,
        },
        icon: {
            fontSize: 16,
            color: theme.centerChannelColor,
        },
        container: {
            flex: 1,
            flexDirection: 'column',
        },
        purpose: {
            marginTop: 7,
            fontSize: 13,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});
