// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    Dimensions,
    TouchableOpacity,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {changeOpacity} from '@mm-redux/utils/theme_utils';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ThemeThumbnail from './theme_thumbnail';

const tilePadding = 8;

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
    } = props;

    const style = getStyleSheet(activeTheme);

    const labelComponent = React.cloneElement(
        label,
        {style: style.label},
    );

    const tilesPerLine = isLandscape || isTablet ? 4 : 2;
    const {width: deviceWidth} = Dimensions.get('window');
    const fullWidth = isLandscape ? deviceWidth - 40 : deviceWidth;
    const layoutStyle = {
        container: {
            width: (fullWidth / tilesPerLine) - tilePadding,
        },
        thumbnail: {
            width: (fullWidth / tilesPerLine) - (tilePadding + 16),
        },
    };

    return (
        <TouchableOpacity
            style={[style.container, layoutStyle.container]}
            onPress={() => action(actionValue)}
        >
            <View style={[style.imageWrapper, layoutStyle.thumbnail]}>
                <ThemeThumbnail
                    width={layoutStyle.thumbnail.width}
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
                    />
                )}
            </View>
            {labelComponent}
        </TouchableOpacity>
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
};

ThemeTile.defaultProps = {
    action: () => true,
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'column',
            padding: tilePadding,
            marginTop: 8,
        },
        imageWrapper: {
            position: 'relative',
            alignItems: 'flex-start',
            marginBottom: 12,
        },
        thumbnail: {
            resizeMode: 'stretch',
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
