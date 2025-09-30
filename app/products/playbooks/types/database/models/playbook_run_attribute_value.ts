// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookRunModel from './playbook_run';
import type PlaybookRunAttributeModel from './playbook_run_attribute';
import type {Relation} from '@nozbe/watermelondb';
import type Model from '@nozbe/watermelondb/Model';

/**
 * The PlaybookRunAttributeValue interface, which will have all the fields from the PLAYBOOK_RUN_ATTRIBUTE_VALUE table
 */
interface PlaybookRunAttributeValueModelInterface extends Model {

    /** attributeId : The ID of the attribute this attribute value belongs to */
    attributeId: string;

    /** runId : The ID of the playbook run this attribute belongs to */
    runId: string;

    /** value : The value of the attribute */
    value: string;

    /** attribute : The attribute this attribute value belongs to */
    attribute: Relation<PlaybookRunAttributeModel>;

    /** run : The playbook run this attribute belongs to */
    run: Relation<PlaybookRunModel>;
}

export type {PlaybookRunAttributeValueModelInterface as default};
