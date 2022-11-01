// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {useWindowDimensions, View} from 'react-native';
import Button from 'react-native-button';

import CompassIcon from '@app/components/compass_icon';
import FormattedText from '@app/components/formatted_text';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    theme: Theme;
    isLastSlide: boolean;
    nextSlideHandler: any;
    signInHandler: any;
    scrollX: any;

};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    button: {
        marginTop: 5,
    },
    rowIcon: {
        color: theme.buttonColor,
        fontSize: 12,
        marginLeft: 5,
        marginTop: 2,
    },
}));

const FooterButtons = ({
    theme,
    nextSlideHandler,
    signInHandler,
    isLastSlide,
    scrollX,
}: Props) => {
    const {width} = useWindowDimensions();
    const styles = getStyleSheet(theme);
    const inputRange = [-width, 0, width];

    useEffect(() => {
        if (isLastSlide) {
            console.log('is last slide');
        }
    }, [isLastSlide]);

    let mainButtonText = (
        <View style={{flexDirection: 'row'}}>
            <FormattedText
                id='mobile.onboarding.next'
                defaultMessage='Next'
                style={buttonTextStyle(theme, 'm', 'primary', 'default')}
            />
            <CompassIcon
                name='arrow-forward-ios'
                style={styles.rowIcon}
            />
        </View>
    );

    let mainButtonAction = nextSlideHandler;

    if (isLastSlide) {
        mainButtonText = (
            <FormattedText
                id='mobile.onboarding.sign_in_to_get_started'
                defaultMessage='Sign in to get started'
                style={buttonTextStyle(theme, 's', 'primary', 'default')}
            />
        );
        mainButtonAction = signInHandler;
    }

    return (
        <View style={{flexDirection: 'column', height: 150, marginTop: 15, width: '100%', marginHorizontal: 10, alignItems: 'center'}}>
            <Button
                testID='mobile.onboaring.next'
                onPress={() => mainButtonAction()}
                containerStyle={[styles.button, buttonBackgroundStyle(theme, 'm', 'primary', 'default'), {width: isLastSlide ? '90%' : 80}]}
            >
                {mainButtonText}
            </Button>
            <Button
                testID='mobile.onboaring.sign_in'
                onPress={() => signInHandler()}
                containerStyle={[styles.button, buttonBackgroundStyle(theme, 'm', 'link', 'default')]}
            >
                <FormattedText
                    id='mobile.onboarding.sign_in'
                    defaultMessage='Sign in'
                    style={buttonTextStyle(theme, 's', 'primary', 'inverted')}
                />
            </Button>
        </View>
    );
};

export default FooterButtons;
