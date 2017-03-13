import * as Ajv from "ajv";
import * as ts from "typescript";

import { assert } from "chai";
import { readFileSync } from "fs";
import { resolve } from "path";

import { createProgram } from "typescript-to-json-schema/dist/factory/program";
import { createParser } from "typescript-to-json-schema/dist/factory/parser";
import { createFormatter } from "typescript-to-json-schema/dist/factory/formatter";
import { Config } from "typescript-to-json-schema/dist";

import { SchemaGenerator } from "../src/SchemaGenerator";

const validator: Ajv.Ajv = new Ajv();
const basePath: string = "test/config";

type PartialConfig = {
    [Key in keyof Config]?: Config[Key];
};

function assertSchema(name: string, partialConfig: PartialConfig): void {
    it(name, () => {
        const config: Config = {
            path: resolve(`${basePath}/${name}/*.ts`),
            type: partialConfig.type,

            expose: partialConfig.expose,
            topRef: partialConfig.topRef,
            jsDoc: partialConfig.jsDoc,
        };

        const program: ts.Program = createProgram(config);
        const generator: SchemaGenerator = new SchemaGenerator(
            program,
            createParser(program, config),
            createFormatter(config),
        );

        const expected: any = JSON.parse(readFileSync(resolve(`${basePath}/${name}/schema.json`), "utf8"));
        const actual: any = JSON.parse(JSON.stringify(generator.createSchema(config.type)));

        assert.isObject(actual);
        assert.deepEqual(actual, expected);

        validator.validateSchema(actual);
        assert.equal(validator.errors, null);
    });
}

describe("config", () => {
    // assertSchema("expose-all-topref-true", {type: "MyObject", expose: "all", topRef: true, jsDoc: "none"});
});
