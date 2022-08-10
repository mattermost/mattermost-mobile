// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ScaledSize} from 'react-native';
import {EdgeInsets} from 'react-native-safe-area-context';

import {ITEM_HEIGHT} from '@components/team_sidebar/add_team/team_list_item/team_list_item';
import {PADDING_TOP_MOBILE} from '@screens/bottom_sheet';
import {TITLE_HEIGHT, TITLE_SEPARATOR_MARGIN} from '@screens/bottom_sheet/content';
import {bottomSheetSnapPoint} from '@utils/helpers';

import type TeamModel from '@typings/database/models/servers/team';

type TeamsSnapProps = {
    teams: TeamModel[];
    dimensions: ScaledSize;
    insets: EdgeInsets;
}

const NO_TEAMS_HEIGHT = 392;
export const getTeamsSnapHeight = ({dimensions, teams, insets}: TeamsSnapProps) => {
    let height = NO_TEAMS_HEIGHT;
    if (teams.length) {
        const itemsHeight = bottomSheetSnapPoint(teams.length, ITEM_HEIGHT, 0);
        const heightWithHeader = PADDING_TOP_MOBILE +
            TITLE_HEIGHT + (TITLE_SEPARATOR_MARGIN * 2) +
            itemsHeight + insets.bottom;
        const maxHeight = Math.round((dimensions.height * 0.9));
        height = Math.min(maxHeight, heightWithHeader);
    }
    return height;
};
