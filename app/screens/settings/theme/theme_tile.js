// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {Image, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {changeOpacity} from '@mm-redux/utils/theme_utils';
import {makeStyleSheetFromTheme} from '@utils/theme';

const ThemeTile = (props) => {
    const {
        action,
        actionValue,
        imageSrc,
        isLandscape,
        isTablet,
        label,
        selected,
        theme,
        testID,
    } = props;

    const style = getStyleSheet(theme);

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
                    {imageSrc && (
                        <Image
                            source={imageSrc}
                            style={[
                                style.thumbnail,
                                selected ? style.selectedThumbnail : null,
                            ]}
                        />
                    )}
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
    imageSrc: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.object,
    ]).isRequired,
    isLandscape: PropTypes.bool.isRequired,
    isTablet: PropTypes.bool.isRequired,
    label: PropTypes.node.isRequired,
    selected: PropTypes.bool,
    theme: PropTypes.object.isRequired,
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
        thumbnail: {
            borderRadius: 4,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            width: '100%',
            flex: 1,
            aspectRatio: 179 / 134,
        },
        selectedThumbnail: {
            borderWidth: 2,
            borderColor: theme.sidebarTextActiveBorder,
        },
        check: {
            position: 'absolute',
            right: 10,
            bottom: 10,
            color: theme.sidebarTextActiveBorder,
        },
        label: {
            color: theme.centerChannelColor,
            fontSize: 15,
        },
    };
});

export default ThemeTile;
