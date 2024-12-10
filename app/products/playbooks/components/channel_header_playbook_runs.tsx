// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';
import {Svg, Path, G} from 'react-native-svg';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useActivePlaybookRunsCount} from '@playbooks/state';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    serverUrl: string;
    teamId: string;
    channelId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarTextHoverBg,
        width: '100%',
        height: 44,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingLeft: 20,
        paddingRight: 10,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    runsInProgressStyle: {
        flexDirection: 'row',
    },
    icon: {
        color: theme.centerChannelBg,
        marginRight: 14,
        opacity: 0.92,
    },
    text: {
        color: theme.centerChannelBg,
        fontSize: 14,
        fontFamily: 'OpenSans-SemiBold',
    },
    arrow: {
        color: 'white',
        opacity: 0.56,
    },
}));

const ClipboardSvg = () => (
    <Svg
        width='20'
        height='20'
        viewBox='0 0 20 20'
        fill='none'
    >
        <G opacity='0.92'>
            <Path
                d='M6.326 2.91202V4.27602H4.962C4.71267 4.27602 4.49267 4.37136 4.302 4.56202C4.126 4.73802 4.038 4.95069 4.038 5.20002V16.662C4.038 16.9114 4.126 17.124 4.302 17.3C4.49267 17.476 4.71267 17.564 4.962 17.564H15.038C15.2873 17.564 15.5 17.476 15.676 17.3C15.8667 17.124 15.962 16.9114 15.962 16.662V5.20002C15.962 4.95069 15.8667 4.73802 15.676 4.56202C15.5 4.37136 15.2873 4.27602 15.038 4.27602H13.674V2.91202H15.5C16.0133 2.91202 16.446 3.08802 16.798 3.44002C17.15 3.79202 17.326 4.22469 17.326 4.73802V17.124C17.326 17.6227 17.15 18.048 16.798 18.4C16.446 18.7667 16.0133 18.95 15.5 18.95H4.5C4.00133 18.95 3.56867 18.7667 3.202 18.4C2.85 18.048 2.674 17.6227 2.674 17.124V4.73802C2.674 4.22469 2.85 3.79202 3.202 3.44002C3.56867 3.08802 4.00133 2.91202 4.5 2.91202H6.326ZM9.076 1.52602H10.924C11.0413 1.52602 11.144 1.57736 11.232 1.68002C11.3347 1.76802 11.386 1.87069 11.386 1.98802V2.45002H12.75V4.73802H7.25V2.45002H8.636V1.98802C8.636 1.87069 8.68 1.76802 8.768 1.68002C8.856 1.57736 8.95867 1.52602 9.076 1.52602ZM8.636 14.374V15.276H14.576V14.374H8.636ZM5.886 14.132V15.518H7.25V14.132H5.886ZM8.636 10.7V11.624H14.576V10.7H8.636ZM5.886 10.48V11.844H7.25V10.48H5.886ZM8.636 7.02602V7.95002H14.576V7.02602H8.636ZM5.798 8.03802L6.26 8.50002L7.712 7.02602L7.25 6.56402L6.26 7.57602L5.798 7.11402L5.336 7.57602L5.798 8.03802Z'
                fill='white'
            />
        </G>
    </Svg>
);

const ArrowSvg = () => (
    <Svg
        width='32'
        height='32'
        viewBox='0 0 32 32'
        fill='none'
    >
        <Path
            d='M10.006 15.244H19.006L14.884 11.122L15.946 10.06L21.886 16L15.946 21.94L14.884 20.878L19.006 16.756H10.006V15.244Z'
            fill='white'
            fillOpacity='0.56'
        />
    </Svg>
);

const ChannelHeaderPlaybookRuns = ({serverUrl, teamId, channelId}: Props) => {
    const theme = useTheme();
    const defaultHeight = useDefaultHeaderHeight();
    const styles = getStyleSheet(theme);

    const containerStyle = useMemo(() => ({
        ...styles.container,
        top: defaultHeight,
        zIndex: 1,
    }), [defaultHeight, styles.container]);

    const count = useActivePlaybookRunsCount(serverUrl, teamId, channelId);

    if (!count) {
        return null;
    }

    return (
        <View style={containerStyle}>
            <View style={styles.runsInProgressStyle}>
                <View style={styles.icon}>
                    <ClipboardSvg/>
                </View>
                <FormattedText
                    id='playbook_runs.in_progress'
                    defaultMessage='{count} {count, plural, one {run} other {runs}} in progress'
                    values={{count}}
                    style={styles.text}
                />
            </View>
            <View style={styles.arrow}>
                <ArrowSvg/>
            </View>
        </View >
    );
};

export default ChannelHeaderPlaybookRuns;
