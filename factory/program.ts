import * as ts from "typescript";
import * as glob from "glob";
import * as path from "path";

import {Config, DiagnosticError, LogicError} from "typescript-to-json-schema/dist";

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

    return ts.createProgram(
        parseResult.fileNames,
        parseResult.options,
    );
}
function createProgramFromGlob(fileGlob: string|string[], options?: ts.CompilerOptions): ts.Program {
    const opts = Object.assign({
        noEmit: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
        strictNullChecks: false,
    }, options);
    const names = Array.isArray(fileGlob) ? fileGlob : glob.sync(path.resolve(fileGlob));
    return ts.createProgram(names, opts);
}

export function createProgram(config: Config, options?: ts.CompilerOptions): ts.Program {
    const program: ts.Program = typeof config.path ==='string' && path.extname(config.path) === ".json" ?
        createProgramFromConfig(config.path) :
        createProgramFromGlob(config.path, options);

    const diagnostics: ts.Diagnostic[] = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length) {
        throw new DiagnosticError(diagnostics);
    }

    return program;
}
