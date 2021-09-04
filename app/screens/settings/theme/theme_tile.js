// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {changeOpacity} from '@mm-redux/utils/theme_utils';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ThemeThumbnail from './theme_thumbnail';

const ThemeTile = (props) => {
    const {
        action,
        actionValue,
        isLandscape,
        isTablet,
        label,
        selected,
        activeTheme,
        tileTheme,
        testID,
    } = props;

    const style = getStyleSheet(activeTheme);

    const labelComponent = React.cloneElement(
        label,
        {style: style.label},
    );

    const tilesPerLine = isLandscape || isTablet ? 4 : 2;

    return (
        <View style={{width: (100 / tilesPerLine) + '%'}}>
            <TouchableOpacity
                style={style.touchable}
                onPress={() => action(actionValue)}
                testID={testID}
            >
                <View style={style.imageWrapper}>
                    <ThemeThumbnail
                        borderColorBase={selected ? activeTheme.sidebarTextActiveBorder : activeTheme.centerChannelBg}
                        borderColorMix={selected ? activeTheme.sidebarTextActiveBorder : changeOpacity(activeTheme.centerChannelColor, 0.16)}
                        sidebarBg={tileTheme.sidebarBg}
                        sidebarText={changeOpacity(tileTheme.sidebarText, 0.48)}
                        sidebarUnreadText={tileTheme.sidebarUnreadText}
                        sidebarTextActiveBorder={activeTheme.sidebarTextActiveBorder}
                        onlineIndicator={tileTheme.onlineIndicator}
                        awayIndicator={tileTheme.awayIndicator}
                        dndIndicator={tileTheme.dndIndicator}
                        centerChannelColor={changeOpacity(tileTheme.centerChannelColor, 0.16)}
                        centerChannelBg={tileTheme.centerChannelBg}
                        newMessageSeparator={tileTheme.newMessageSeparator}
                        buttonBg={tileTheme.buttonBg}
                    />
                    {selected && (
                        <CompassIcon
                            name='check-circle'
                            size={31.2}
                            style={style.check}
                            {...testID && {testID: `${testID}.selected`}}
                        />
                    )}
                </View>
                {labelComponent}
            </TouchableOpacity>
        </View>
    );
};

ThemeTile.propTypes = {
    action: PropTypes.func,
    actionValue: PropTypes.string,
    isLandscape: PropTypes.bool.isRequired,
    isTablet: PropTypes.bool.isRequired,
    label: PropTypes.node.isRequired,
    selected: PropTypes.bool,
    activeTheme: PropTypes.object.isRequired,
    tileTheme: PropTypes.object.isRequired,
    testID: PropTypes.string,
};

ThemeTile.defaultProps = {
    action: () => true,
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        touchable: {
            padding: 8,
            marginTop: 8,
        },
        imageWrapper: {
            flexDirection: 'row',
            position: 'relative',
            marginBottom: 12,
        },
        check: {
            position: 'absolute',
            right: 5,
            bottom: 5,
            color: theme.sidebarTextActiveBorder,
        },
        label: {
            color: theme.centerChannelColor,
            fontSize: 15,
        },
    };
});

export default ThemeTile;
