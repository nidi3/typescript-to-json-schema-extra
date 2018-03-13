# typescript-to-json-schema-extra

Provides some extras for [typescript-to-json-schema](https://github.com/xiag-ag/typescript-to-json-schema).

- Generate schemas for all types: `SchemaGenerator.createSchemas(filter: (fileName: string) => boolean): Map<Schema>`.
- Create a program from a list of files: `ExtConfig.paths`.
- Provide custom compiler options for a program: `createProgram(config: Config, options?: ts.CompilerOptions): ts.Program`.
- Treat line comments `//` the same as jsDoc comments `/** */`: `ExtConfig.lineComment`. _Warning: This is not very stable, use on your own risk!_
- Add `extra: { filename: string; members?: string[] }` property to the schema containing the typescript filename and the member names of enums. 

### Development
The development is done in the `develop` branch.
Releasing is done by updating the version with `npm version patch|minor|major` and by rebasing the develop branch onto the master branch.
[Travis CI](https://travis-ci.org) will then pick this up and perform the release.
To publish to npmjs.com, the environment variable `NPM_TOKEN` must be set. Do this by executing
`npm login` locally and the take the corresponding value out of `~/.nmprc`.

