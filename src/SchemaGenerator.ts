import * as ts from "typescript";
import {
    BaseType,
    Context,
    Definition,
    DefinitionType,
    Map,
    NodeParser,
    NoRootTypeError,
    TypeFormatter,
} from "typescript-to-json-schema/dist";
import {ExtSchema} from "./Schema/ExtSchema";

export class SchemaGenerator {
    public constructor(private program: ts.Program,
                       private nodeParser: NodeParser,
                       private typeFormatter: TypeFormatter) {
    }

    public createSchemas(filter: (fileName: string) => boolean): Map<ExtSchema> {
        const rootNodes: Map<ts.Node> = this.findRootNodes(filter);
        const schemas: Map<ExtSchema> = {};
        for (let name in rootNodes) {
            if (rootNodes.hasOwnProperty(name)) {
                schemas[name] = this.createSchemaFromNode(rootNodes[name]);
            }
        }
        return schemas;
    }

    public createSchema(fullName: string): ExtSchema {
        return this.createSchemaFromNode(this.findRootNode(fullName));
    }

    private createSchemaFromNode(node: ts.Node): ExtSchema {
        const rootType: BaseType = this.nodeParser.createType(node, new Context());
        const schema: ExtSchema = {
            $schema: "http://json-schema.org/draft-04/schema#",
            definitions: this.getRootChildDefinitions(rootType),
            extra: {
                filename: node.getSourceFile().path,
            },
            ...this.getRootTypeDefinition(rootType),
        };
        if (node.kind === ts.SyntaxKind.EnumDeclaration) {
            schema.extra.members = (node as ts.EnumDeclaration).members.map((m: ts.EnumMember) => m.name.getText());
        }
        return schema;
    }

    private findRootNode(fullName: string): ts.Node {
        const allTypes: Map<ts.Node> = this.findRootNodes((fileName: string) => true);
        const rootNode: ts.Node = allTypes[fullName];
        if (!rootNode) {
            throw new NoRootTypeError(fullName);
        }

        return rootNode;
    }

    private findRootNodes(filter: (fileName: string) => boolean): Map<ts.Node> {
        const typeChecker: ts.TypeChecker = this.program.getTypeChecker();
        const allTypes: Map<ts.Node> = {};

        this.program.getSourceFiles().forEach((sourceFile: ts.SourceFile) => {
            if (filter(sourceFile.fileName)) {
                this.inspectNode(sourceFile, typeChecker, allTypes);
            }
        });

        return allTypes;
    }

    private inspectNode(node: ts.Node, typeChecker: ts.TypeChecker, allTypes: Map<ts.Node>): void {
        if (
            node.kind === ts.SyntaxKind.InterfaceDeclaration ||
            node.kind === ts.SyntaxKind.EnumDeclaration ||
            node.kind === ts.SyntaxKind.TypeAliasDeclaration
        ) {
            if (!this.isExportType(node)) {
                return;
            } else if (this.isGenericType(node as ts.TypeAliasDeclaration)) {
                return;
            }

            allTypes[this.getFullName(node, typeChecker)] = node;
        } else {
            ts.forEachChild(
                node,
                (subnode: ts.Node) => this.inspectNode(subnode, typeChecker, allTypes),
            );
        }
    }

    private isExportType(node: ts.Node): boolean {
        const localSymbol: ts.Symbol = (node as any).localSymbol;
        return localSymbol ? (localSymbol.flags & ts.SymbolFlags.Export) !== 0 : false;
    }

    private isGenericType(node: ts.TypeAliasDeclaration): boolean {
        return (
            node.typeParameters &&
            node.typeParameters.length > 0
        );
    }

    private getFullName(node: ts.Node, typeChecker: ts.TypeChecker): string {
        const symbol: ts.Symbol = (node as any).symbol;
        return typeChecker.getFullyQualifiedName(symbol).replace(/".*"\./, "");
    }

    private getRootTypeDefinition(rootType: BaseType): Definition {
        return this.typeFormatter.getDefinition(rootType);
    }

    private getRootChildDefinitions(rootType: BaseType): Map<Definition> {
        return this.typeFormatter.getChildren(rootType)
            .filter((child: BaseType) => child instanceof DefinitionType)
            .reduce((result: Map<Definition>, child: DefinitionType) => ({
                ...result,
                [child.getId()]: this.typeFormatter.getDefinition(child.getType()),
            }), {});
    }
}
