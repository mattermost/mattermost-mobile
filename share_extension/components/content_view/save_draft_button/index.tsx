// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {usePreventDoubleTap} from '@hooks/utils';
import {useShareExtensionSubmit} from '@share/hooks/use_share_extension_submit';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    theme: Theme;
}

const hitSlop = {top: 10, left: 10, right: 10, bottom: 10};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        buttonContainer: {
            alignSelf: 'center',
            marginTop: 'auto',
            flexDirection: 'row',
            marginBottom: 40,
            alignItems: 'center',
        },
        draftIcon: {
            color: theme.linkColor,
            ...typography('Body', 500),
        },
        buttonText: {
            marginLeft: 10,
            color: theme.linkColor,
            ...typography('Body', 200, 'SemiBold'),
        },
    };
});

const SaveDraftButton = ({theme}: Props) => {
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const {submit, disabled} = useShareExtensionSubmit();
    const onPress = usePreventDoubleTap(() => submit({isDraft: true}));

    const iconStyle = useMemo(() => {
        const iconColor = changeOpacity(styles.draftIcon.color, disabled ? 0.5 : 1);
        return [styles.draftIcon, {color: iconColor}];
    }, [styles.draftIcon, disabled]);

    const buttonTextStyle = useMemo(() => {
        const textColor = changeOpacity(styles.buttonText.color, disabled ? 0.5 : 1);
        return [styles.buttonText, {color: textColor}];
    }, [styles.buttonText, disabled]);

    return (
        <TouchableWithFeedback
            onPress={onPress}
            type='opacity'
            hitSlop={hitSlop}
            style={styles.buttonContainer}
            disabled={disabled}
        >
            <CompassIcon
                name='pencil-outline'
                style={iconStyle}
            />
            <Text style={buttonTextStyle}>
                {intl.formatMessage({id: 'share_extension.save_draft', defaultMessage: 'Save as draft'})}
            </Text>
        </TouchableWithFeedback>
    );
};

export default SaveDraftButton;
