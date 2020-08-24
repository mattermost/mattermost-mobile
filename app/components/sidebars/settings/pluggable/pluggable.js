// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import FastImage from 'react-native-fast-image';
import PropTypes from 'prop-types';
import {View, Text} from 'react-native';

import {doPluginAction} from '@actions/plugins';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import DrawerItem from '../drawer_item';

const Pluggable = (props) => {
    const {plugins, theme, closeSettingsSidebar} = props;
    if (plugins.length === 0) {
        return null;
    }

    const styles = getStyleSheet(theme)

    const options = plugins.map((p, i) => (
        <Option
            key={p.id + p.extra.text}
            plugin={p}
            theme={theme}
            styles={styles}
            hasSeparator={i !== plugins.length - 1}
            closeSettingsSidebar={closeSettingsSidebar}
        />
    ));

    return (
        <>
            <View style={styles.separator}/>
            <View style={styles.block}>
                {options}
            </View>
        </>
    );
}

Pluggable.propTypes = {
    plugins: PropTypes.array.isRequired,
    theme: PropTypes.object.isRequired,
    closeSettingsSidebar: PropTypes.func.isRequired,
};

export default Pluggable;

class Option extends PureComponent {
    static propTypes = {
        plugin: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        styles: PropTypes.object.isRequired,
        closeSettingsSidebar: PropTypes.func.isRequired,
        hasSeparator: PropTypes.bool.isRequired,
    }

    onPress = () => {
        const {id, request_url} = this.props.plugin;
        doPluginAction(id, request_url, {});
        this.props.closeSettingsSidebar();
    }

    render() {
        const {plugin, theme, styles, hasSeparator} = this.props;
        let leftComponent;
        if (plugin.extra.icon) {
            leftComponent = (
                <FastImage
                    source={{uri: plugin.extra.icon}}
                    style={styles.icon}
                />
            );
        }
        return (
            <DrawerItem
                labelComponent={
                    (
                        <Text
                            style={[styles.text]}
                        >
                            {plugin.extra.text}
                        </Text>
                    )
                }
                onPress={this.onPress}
                separator={hasSeparator}
                theme={theme}
                leftComponent={leftComponent}
            />
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        icon: {
            width: 45,
            height: 45,
        },
        text: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            flex: 1,
            fontSize: 17,
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
        block: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
        },
        separator: {
            marginTop: 35,
        },
    };
});
