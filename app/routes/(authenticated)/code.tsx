// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useAppNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import CodeScreen, {type CodeScreenProps} from '@screens/code';

export default function CodeRoute() {
    const {code, title, ...props} = usePropsFromParams<CodeScreenProps & {title: string}>();

    // Scoped back testID: the channel header stays mounted under expo-router, so the
    // default one is not unique.
    useAppNavigationHeader(title, false, 0, false, 'code.screen.title', 'code.screen.back');

    return (
        <CodeScreen
            {...props}
            code={code}
        />
    );
}
