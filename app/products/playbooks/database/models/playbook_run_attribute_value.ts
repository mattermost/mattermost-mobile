// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookRunModel from './playbook_run';
import type PlaybookRunAttributeModel from './playbook_run_attribute';
import type {Relation} from '@nozbe/watermelondb';
import type PlaybookRunAttributeValueModelInterface from '@playbooks/types/database/models/playbook_run_attribute_value';

const {PLAYBOOK_RUN, PLAYBOOK_RUN_ATTRIBUTE, PLAYBOOK_RUN_ATTRIBUTE_VALUE} = PLAYBOOK_TABLES;

/**
 * The PlaybookRunAttributeValue model represents a playbook run attribute value in the Mattermost app.
 */
export default class PlaybookRunAttributeValueModel extends Model implements PlaybookRunAttributeValueModelInterface {
    /** table (name) : PlaybookRunAttributeValue */
    static table = PLAYBOOK_RUN_ATTRIBUTE_VALUE;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A PLAYBOOK_RUN_ATTRIBUTE is associated to a PLAYBOOK_RUN_ATTRIBUTE_VALUE (relationship is 1:1) */
        [PLAYBOOK_RUN_ATTRIBUTE]: {type: 'belongs_to', key: 'attribute_id'},

        /** A PLAYBOOK_RUN is associated to a PLAYBOOK_RUN_ATTRIBUTE (relationship is 1:1) */
        [PLAYBOOK_RUN]: {type: 'belongs_to', key: 'run_id'},
    };

    /** attributeId : The ID of the attribute this attribute value belongs to */
    @field('attribute_id') attributeId!: string;

    /** runId : The ID of the playbook run this attribute belongs to */
    @field('run_id') runId!: string;

    /** value : The value of the attribute */
    @field('value') value!: string;

    /** attribute : The attribute this attribute value belongs to */
    @immutableRelation(PLAYBOOK_RUN_ATTRIBUTE, 'attribute_id') attribute!: Relation<PlaybookRunAttributeModel>;

    /** run : The playbook run this attribute belongs to */
    @immutableRelation(PLAYBOOK_RUN, 'run_id') run!: Relation<PlaybookRunModel>;
}
