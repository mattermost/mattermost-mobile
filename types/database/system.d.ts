import { Model } from '@nozbe/watermelondb';
export default class System extends Model {
    static table: string;
    name: string;
    value: string;
}
