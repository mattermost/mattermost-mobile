// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';
import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';

import {savePreferences} from '@mm-redux/actions/preferences';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {getAllowCustomThemes, getOsColorScheme} from '@mm-redux/selectors/entities/general';
import {
    getDarkTheme,
    getDefaultLightTheme,
    isThemeSyncEnabled,
    getLightTheme,
    getTheme,
    isThemeSyncWithOsAvailable,
} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {ActionFunc, GenericAction} from '@mm-redux/types/actions';
import {GlobalState} from '@mm-redux/types/store';
import {isLandscape, isTablet} from '@selectors/device';
import {getAllowedThemes} from '@selectors/theme';

import Theme, {Actions} from './theme';

const mapStateToProps = (state: GlobalState) => ({
    theme: getTheme(state),
    allowedThemes: getAllowedThemes(state),
    defaultLightTheme: getDefaultLightTheme(state),
    lightTheme: getLightTheme(state),
    darkTheme: getDarkTheme(state),
    userId: getCurrentUserId(state),
    isThemeSyncWithOsAvailable: isThemeSyncWithOsAvailable(state),
    isThemeSyncEnabled: isThemeSyncEnabled(state),
    teamId: getCurrentTeamId(state),
    isLandscape: isLandscape(state),
    isTablet: isTablet(state),
    allowCustomThemes: getAllowCustomThemes(state),
    osColorScheme: getOsColorScheme(state),
});

const mapDispatchToProps = (dispatch: Dispatch<GenericAction>) => ({
    actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
        savePreferences,
    }, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(Theme);
