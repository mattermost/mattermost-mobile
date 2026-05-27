// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigationHeader} from '@hooks/navigation_header';
import SelectTeamScreen from '@screens/select_team';

export default function SelectTeamRoute() {
    useNavigationHeader({
        showWhenPushed: false,
        animation: 'fade',
    });

    return (<SelectTeamScreen/>);
}
