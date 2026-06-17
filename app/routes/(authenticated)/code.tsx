// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useLocalSearchParams} from 'expo-router';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import CodeScreen, {type CodeScreenProps} from '@screens/code';

export default function CodeRoute() {
    const theme = useTheme();

    // `code` is read directly so it is never run through safeParseJSON: a code
    // block whose text is valid JSON (e.g. "42", "{...}") would otherwise be
    // coerced to a non-string and crash the Highlighter (MM-69330).
    const {code} = useLocalSearchParams<{code: string}>();
    const {title, ...props} = usePropsFromParams<Omit<CodeScreenProps, 'code'> & {title: string}>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title,
            ...getHeaderOptions(theme),
        },
    });

    return (
        <CodeScreen
            {...props}
            code={code}
        />
    );
}
