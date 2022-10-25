// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Animated, useWindowDimensions} from 'react-native';
import Button from 'react-native-button';

import CompassIcon from '@app/components/compass_icon';
import FormattedText from '@app/components/formatted_text';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    data: any;
    theme: Theme;
    scrollX: any;
    nextSlideHandler: any;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    dot: {
        height: 8,
        borderRadius: 5,
        backgroundColor: theme.buttonBg,
        marginHorizontal: 8,
        width: 8,

        // shadow
        shadowOffset: {width: 0, height: 13},
        shadowOpacity: 0.7,
        shadowColor: theme.buttonBg,
        shadowRadius: 6,
        elevation: 3,
    },
    button: {
        marginTop: 5,
    },
    rowIcon: {
        color: theme.buttonColor,
        fontSize: 12,
        marginLeft: 5,
    },
}));

const Paginator = ({theme, data, scrollX, nextSlideHandler}: Props) => {
    const styles = getStyleSheet(theme);
    const {width} = useWindowDimensions();

    return (
        <View style={{flexDirection: 'column', height: 150}}>
            <View style={{flexDirection: 'row', height: 5}}>
                {data.map((item: any, i: number) => {
                    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.3, 1, 0.3],
                        extrapolate: 'clamp',
                    });

                    return (
                        <Animated.View
                            style={[styles.dot, {
                                shadowOffset: {width: 0, height: 13},
                                shadowOpacity: 0.7,
                                shadowColor: theme.buttonBg,
                                shadowRadius: 6,
                                elevation: 3,
                                opacity,
                            }]}
                            key={item.id}
                        />
                    );
                })}
            </View>
            <View style={{marginTop: 15}}>
                <Button
                    testID='mobile.onboaring.next'
                    onPress={() => nextSlideHandler()}
                    containerStyle={[styles.button, buttonBackgroundStyle(theme, 'm', 'primary', 'default')]}
                >
                    <FormattedText
                        id='mobile.onboarding.next'
                        defaultMessage='Next'
                        style={buttonTextStyle(theme, 'm', 'primary', 'default')}
                    />
                    <CompassIcon
                        name='arrow-forward-ios'
                        style={styles.rowIcon}
                    />
                </Button>
            </View>
        </View>
    );
};

export default Paginator;
