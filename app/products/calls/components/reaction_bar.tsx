// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Pressable, StyleSheet, useWindowDimensions, View} from 'react-native';

import {raiseHand, unraiseHand} from '@calls/actions';
import {sendReaction} from '@calls/actions/calls';
import EmojiButton from '@calls/components/emoji_button';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        width: '100%',
        height: 64,
        paddingLeft: 16,
        paddingRight: 16,
    },
    containerInLandscape: {
        paddingBottom: 6,
        justifyContent: 'center',
    },
    button: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
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
        backgroundColor: 'rgba(245, 171, 0, 0.24)',
    },
    unPressed: {
        color: 'white',
    },
    pressed: {
        color: '#F5AB00',
    },
    buttonText: {
        marginLeft: 8,
    },
});

const predefinedReactions = [['+1', '1F44D'], ['clap', '1F44F'], ['joy', '1F602'], ['heart', '2764-FE0F']];

interface Props {
    raisedHand: number;
}

const ReactionBar = ({raisedHand}: Props) => {
    const {width, height} = useWindowDimensions();
    const isLandscape = width > height;

    const LowerHandText = (
        <FormattedText
            id={'mobile.calls_lower_hand'}
            defaultMessage={'Lower hand'}
            style={[styles.buttonText, raisedHand ? styles.pressed : styles.unPressed]}
        />);
    const RaiseHandText = (
        <FormattedText
            id={'mobile.calls_raise_hand'}
            defaultMessage={'Raise hand'}
            style={[styles.buttonText, raisedHand ? styles.pressed : styles.unPressed]}
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
        <View style={[styles.container, isLandscape && styles.containerInLandscape]}>
            <Pressable
                style={[styles.button, isLandscape && styles.buttonLandscape, Boolean(raisedHand) && styles.buttonPressed]}
                onPress={toggleRaiseHand}
            >
                <CompassIcon
                    name={raisedHand ? 'hand-right-outline-off' : 'hand-right-outline'}
                    size={24}
                    style={[raisedHand ? styles.pressed : styles.unPressed]}
                />
                {raisedHand ? LowerHandText : RaiseHandText}
            </Pressable>
            {
                predefinedReactions.map(([name, unified]) => (
                    <EmojiButton
                        key={name}
                        emojiName={name}
                        style={[styles.button, isLandscape && styles.buttonLandscape]}
                        onPress={() => sendReaction({name, unified})}
                    />
                ))
            }
        </View>
    );
};

export default ReactionBar;
