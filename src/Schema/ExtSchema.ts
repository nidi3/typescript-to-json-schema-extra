import {Schema} from 'typescript-to-json-schema';

export interface ExtSchema extends Schema {
    extra: ExtraSchemaData;
}

export interface ExtraSchemaData {
    filename: string;
    members?: string[];
}
