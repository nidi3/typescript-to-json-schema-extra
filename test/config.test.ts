import * as Ajv from "ajv";
import * as ts from "typescript";

import {assert} from "chai";
import {readFileSync} from "fs";
import {resolve} from "path";

import {createParser} from "typescript-to-json-schema/dist/factory/parser";
import {createFormatter} from "typescript-to-json-schema/dist/factory/formatter";
import {Map, Schema} from "typescript-to-json-schema/dist";

import {ExtConfig} from "../src/ExtConfig";
import {SchemaGenerator} from "../src/SchemaGenerator";
import {createProgram} from "../factory/program";

const validator: Ajv.Ajv = new Ajv();
const basePath: string = "test/config";

type PartialConfig = {
    [Key in keyof ExtConfig]?: ExtConfig[Key];
    };

function assertSchema(name: string, partialConfig: PartialConfig): void {
    it(name, () => {
        const generator: SchemaGenerator = createGenerator(name, partialConfig);

        const expected: any = JSON.parse(readFileSync(resolve(`${basePath}/${name}/schema.json`), "utf8"));
        const actual: any = generator.createSchema(partialConfig.type);

        assertSchemaEqual(actual, expected);
    });
}

describe("all schemas", () => {
    it("should find all types in the selected files", () => {
        const generator: SchemaGenerator = createGenerator("all-schemas", {topRef: true});
        let count: number = 0;
        const schemas: Map<Schema> = generator.createSchemas((fileName: string) => {
            count++;
            return !!fileName.match("main.ts$");
        });
        assert.isAbove(count, 1);

        // tslint:disable-next-line:no-string-literal
        assertSchemaEqual(schemas["SimpleObject"], json("all-schemas", "SimpleObject"));
        // tslint:disable-next-line:no-string-literal
        assertSchemaEqual(schemas["MyObject"], json("all-schemas", "MyObject"));
        // tslint:disable-next-line:no-string-literal
        assertSchemaEqual(schemas["MyEnum"], json("all-schemas", "MyEnum"));
    });
});

describe("file list", () => {
    it("should parse all given files", () => {
        const generator: SchemaGenerator = createGenerator("file-list", {
            paths: [`${basePath}/file-list/main.ts`, `${basePath}/file-list/sub/sub.ts`],
            topRef: true,
        });

        assertSchemaEqual(generator.createSchema("MyObject"), json("file-list", "MyObject"));
        assertSchemaEqual(generator.createSchema("SimpleObject"), json("file-list", "SimpleObject"));
    });
});

describe("compiler options", () => {
    it("should use additional compiler options", () => {
        const generator: SchemaGenerator = createGenerator("compiler-options", {topRef: true},
            {baseUrl: `${basePath}/compiler-options/lib`});
        assertSchemaEqual(generator.createSchema("SimpleObject"), json("compiler-options", "schema"));
    });
});

describe("line comment", () => {
    it("should also treat // comments", () => {
        const generator: SchemaGenerator = createGenerator("line-comment", {
            topRef: true,
            jsDoc: "extended",
            lineComment: true,
        });
        assertSchemaEqual(generator.createSchema("SimpleObject"), json("line-comment", "schema"));
    });
});

function createGenerator(name: string, partialConfig: PartialConfig, options?: ts.CompilerOptions): SchemaGenerator {
    const config: ExtConfig = createConfig(name, partialConfig);
    const program: ts.Program = createProgram(config, options);
    return new SchemaGenerator(program, createParser(program, config), createFormatter(config));
}

function createConfig(name: string, partialConfig: PartialConfig): ExtConfig {
    return {
        path: partialConfig.path || resolve(`${basePath}/${name}/*.ts`),
        paths: partialConfig.paths,
        type: partialConfig.type,

        expose: partialConfig.expose,
        topRef: partialConfig.topRef,
        jsDoc: partialConfig.jsDoc,
        lineComment: partialConfig.lineComment,
    };
}

function assertSchemaEqual(actual: any, expected: any): void {
    assert.isObject(actual);
    expected.extra.filename = resolve(expected.extra.filename).toLowerCase().replace(/\\/g, "/");
    assert.deepEqual(actual, expected);

    validator.validateSchema(actual);
    assert.equal(validator.errors, null);
}

function json(path: string, name: string): any {
    return JSON.parse(readFileSync(resolve(`${basePath}/${path}/${name}.json`), "utf8"));
}
