import * as ts from "typescript";
import * as glob from "glob";
import * as path from "path";

import {DiagnosticError, LogicError} from "typescript-to-json-schema/dist";
import {ExtConfig} from "../src/ExtConfig";


const readFile: (path: string, encoding?: string) => string = ts.sys.readFile;

function createProgramFromConfig(configFile: string): ts.Program {
    const config: {config?: any; error?: ts.Diagnostic} = ts.parseConfigFileTextToJson(
        configFile,
        ts.sys.readFile(configFile),
    );
    if (config.error) {
        throw new DiagnosticError([config.error]);
    } else if (!config.config) {
        throw new LogicError(`Invalid parsed config file "${configFile}"`);
    }

    const parseResult: ts.ParsedCommandLine = ts.parseJsonConfigFileContent(
        config.config,
        ts.sys,
        path.dirname(configFile),
        {},
        configFile,
    );
    parseResult.options.noEmit = true;
    delete parseResult.options.out;
    delete parseResult.options.outDir;
    delete parseResult.options.outFile;
    delete parseResult.options.declaration;

    return ts.createProgram(parseResult.fileNames, parseResult.options);
}

function createProgramFromGlob(fileGlob: string|string[], options?: ts.CompilerOptions): ts.Program {
    const opts: ts.CompilerOptions = Object.assign({
        noEmit: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
        strictNullChecks: false,
    }, options);
    const names: string[] = Array.isArray(fileGlob) ? fileGlob : glob.sync(path.resolve(fileGlob));
    return ts.createProgram(names, opts);
}

export function createProgram(config: ExtConfig, options?: ts.CompilerOptions): ts.Program {
    ts.sys.readFile = (name: string, encoding?: string) => {
        const content: string = readFile(name, encoding);
        if (config.lineComment && /\.ts$/.test(name) && !/\.d\.ts$/.test(name)) {
            return content.replace(/^([ \t]*\w[^\/\n]+)\/\/([^\n]+)$/gm,
                (match: string, p1: string, p2: string) => "/**\n* " + p2.replace(/@/g, "\n* @") + "\n*/\n" + p1);
        }
        return content;
    };

    const program: ts.Program = !config.paths && path.extname(config.path) === ".json" ?
        createProgramFromConfig(config.path) :
        createProgramFromGlob(config.paths || config.path, options);

    const diagnostics: ts.Diagnostic[] = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length) {
        throw new DiagnosticError(diagnostics);
    }

    return program;
}


