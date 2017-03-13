import {Config} from "typescript-to-json-schema/dist";

export interface ExtConfig extends Config {
    paths: string[];
    lineComment: boolean;
}
