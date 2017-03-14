// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {
    TouchableOpacity,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';

import {getTheme} from 'app/selectors/preferences';

function CreateButton(props) {
    return (
        <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1}}>
            <TouchableOpacity
                onPress={() => props.emitter('new_channel')}
                style={{paddingHorizontal: 15}}
            >
                <FormattedText
                    id='mobile.create_channel'
                    defaultMessage='Create'
                    style={{color: props.theme.sidebarHeaderTextColor}}
                />
            </TouchableOpacity>
        </View>
    );
}

CreateButton.propTypes = {
    emitter: PropTypes.func.isRequired,
    theme: PropTypes.object
};

CreateButton.defaultProps = {
    theme: {}
};

function mapStateToProps(state) {
    return {
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(CreateButton);
