import { Model } from '@nozbe/watermelondb';
export default class Global extends Model {
    static table: string;
    name: string;
    value: Object;
}
