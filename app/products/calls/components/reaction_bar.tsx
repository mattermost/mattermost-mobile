// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Pressable, StyleSheet, useWindowDimensions, View} from 'react-native';

import {raiseHand, unraiseHand} from '@calls/actions';
import {sendReaction} from '@calls/actions/calls';
import EmojiButton from '@calls/components/emoji_button';
import {makeCallsTheme} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import type {CallsTheme} from '@calls/types/calls';

const getStyleSheet = ((theme: CallsTheme) => StyleSheet.create({
    outerContainer: {
        flexDirection: 'row',
    },
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 64,
        paddingLeft: 16,
        paddingRight: 16,
    },
    containerLandscape: {
        height: 60,
        paddingBottom: 12,
        justifyContent: 'center',
    },
    button: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.buttonColor, 0.08),
        borderRadius: 30,
        height: 48,
        maxWidth: 160,
        paddingLeft: 10,
        paddingRight: 10,
    },
    buttonLandscape: {
        marginRight: 12,
        marginLeft: 12,
    },
    buttonPressed: {
        backgroundColor: theme.buttonColor,
    },
    unPressed: {
        color: changeOpacity(theme.buttonColor, 0.56),
    },
    pressed: {
        color: theme.callsBg,
    },
    buttonText: {
        marginLeft: 8,
        ...typography('Body', 200, 'SemiBold'),
    },
}));

const predefinedReactions = [['+1', '1F44D'], ['clap', '1F44F'], ['joy', '1F602'], ['heart', '2764-FE0F']];

interface Props {
    raisedHand: number;
}

const ReactionBar = ({raisedHand}: Props) => {
    const theme = useTheme();
    const callsTheme = useMemo(() => makeCallsTheme(theme), [theme]);
    const style = getStyleSheet(callsTheme);
    const {width, height} = useWindowDimensions();
    const isLandscape = width > height;

    const LowerHandText = (
        <FormattedText
            id={'mobile.calls_lower_hand'}
            defaultMessage={'Lower hand'}
            style={[style.buttonText, raisedHand ? style.pressed : style.unPressed]}
        />);
    const RaiseHandText = (
        <FormattedText
            id={'mobile.calls_raise_hand'}
            defaultMessage={'Raise hand'}
            style={[style.buttonText, raisedHand ? style.pressed : style.unPressed]}
        />);

    const toggleRaiseHand = useCallback(() => {
        const whenRaisedHand = raisedHand || 0;
        if (whenRaisedHand > 0) {
            unraiseHand();
        } else {
            raiseHand();
        }
    }, [raisedHand]);

    return (
        <View style={style.outerContainer}>
            <View style={[style.container, isLandscape && style.containerLandscape]}>
                <Pressable
                    style={[style.button, isLandscape && style.buttonLandscape, Boolean(raisedHand) && style.buttonPressed]}
                    onPress={toggleRaiseHand}
                >
                    <CompassIcon
                        name={raisedHand ? 'hand-right-outline-off' : 'hand-right'}
                        size={24}
                        style={[raisedHand ? style.pressed : style.unPressed]}
                    />
                    {raisedHand ? LowerHandText : RaiseHandText}
                </Pressable>
                {
                    predefinedReactions.map(([name, unified]) => (
                        <EmojiButton
                            key={name}
                            emojiName={name}
                            style={[style.button, isLandscape && style.buttonLandscape]}
                            onPress={() => sendReaction({name, unified})}
                        />
                    ))
                }
            </View>
        </View>
    );
};

export default ReactionBar;
