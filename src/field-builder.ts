import { createConnectionBuilder, ConnectionBuilder } from "./connection-builder-factory";
import { FieldNode, Directive, Connection, Unarray } from "./types";

export class FieldBuilder<T = any> {
  private _fields: FieldNode[] = [];

  /**
   * Adds one or more fields (or aliases) with full autocompletion for keys of T.
   * Supports nested arguments and an optional `directive` property.
   */
  public fields(...fields: (
    | keyof T 
    | Partial<Record<keyof T, string>> 
    | { field: keyof T | Partial<Record<keyof T, string>>, args?: { [key: string]: any }, directive?: any }
  )[]): this {
    fields.forEach(field => {
      if (typeof field === "object" && "field" in field) {
        this.handleFieldObject(field);
      } else if (typeof field === "string") {
        this._fields.push({ kind: "field", name: field.toString() });
      } else {
        // field is a mapping: Partial<Record<keyof T, string>>
        for (const key in field as any) {
          if (Object.prototype.hasOwnProperty.call(field, key)) {
            this._fields.push({
              kind: "field",
              name: key,
              alias: (field as Partial<Record<keyof T, string>>)[key as keyof T] as string,
            });
          }
        }
      }
    });
    return this;
  }

  // Helper to handle field objects with nested properties.
  private handleFieldObject(field: { field: any, args?: { [key: string]: any }, directive?: any }) {
    const { field: fieldDef, args, directive } = field;
    const directives = directive ? this.convertDirective(directive) : undefined;
    if (typeof fieldDef === "string") {
      this._fields.push({ 
        kind: "field", 
        name: fieldDef.toString(),
        args,
        directives,
      });
    } else {
      for (const key in fieldDef) {
        if (Object.prototype.hasOwnProperty.call(fieldDef, key)) {
          this._fields.push({
            kind: "field",
            name: key,
            alias: fieldDef[key] as string,
            args,
            directives,
          });
        }
      }
    }
  }

  /**
   * Converts a directive input (which can be an object mapping) into an array of Directive objects.
   * For example, { skip: { if: "$bar" } } becomes [{ name: "skip", args: { if: "$bar" } }].
   */
  private convertDirective(input: any): Directive[] {
    if (!input) return [];
    if (Array.isArray(input)) {
      // Assume input is already an array of Directive objects.
      return input;
    }
    if (typeof input === "object") {
      const directives: Directive[] = [];
      for (const key of Object.keys(input)) {
        const value = input[key];
        if (typeof value === "object" && value !== null) {
          directives.push({ name: key, args: value });
        } else {
          // Wrap a non-object value into an object with key "value"
          directives.push({ name: key, args: { value: String(value) } });
        }
      }
      return directives;
    }
    return [];
  }

  /**
   * Private helper to extract name and alias from a string or mapping.
   */
  private extractNameAndAlias<K extends keyof T>(nameOrMapping: K | Partial<Record<K, string>>): { name: K, alias?: string } {
    if (typeof nameOrMapping === "object") {
      const keys = Object.keys(nameOrMapping) as K[];
      if (keys.length !== 1) {
        throw new Error("Only one key is allowed in the alias mapping");
      }
      const name = keys[0];
      return { name, alias: nameOrMapping[name] };
    } else {
      return { name: nameOrMapping };
    }
  }

  /**
   * Adds a nested object field.
   * 
   * Overload 1 (without alias):
   *    .object("feedback", (feedback) => { feedback.fields("details", "summary") })
   * Overload 2 (with alias):
   *    .object({ feedback: "aliasedName" }, (feedback) => { feedback.fields("details", "summary") })
   * Overload 3 (with arguments, without alias):
   *    .object("feedback", { key: "value" }, (feedback) => { feedback.fields("details", "summary") })
   * Overload 4 (with arguments and alias):
   *    .object({ feedback: "aliasedName" }, { key: "value" }, (feedback) => { feedback.fields("details", "summary") })
   */
  public object<K extends keyof T>(
    name: K,
    callback: (builder: FieldBuilder<Unarray<NonNullable<T[K]>>>) => void
  ): this;
  public object<K extends keyof T>(
    nameMapping: Partial<Record<K, string>>,
    callback: (builder: FieldBuilder<Unarray<NonNullable<T[K]>>>) => void
  ): this;
  public object<K extends keyof T>(
    name: K,
    args: { [key: string]: any },
    callback: (builder: FieldBuilder<Unarray<NonNullable<T[K]>>>) => void
  ): this;
  public object<K extends keyof T>(
    nameMapping: Partial<Record<K, string>>,
    args: { [key: string]: any },
    callback: (builder: FieldBuilder<Unarray<NonNullable<T[K]>>>) => void
  ): this;
  public object<K extends keyof T>(
    nameOrMapping: K | Partial<Record<K, string>>,
    argsOrCallback: { [key: string]: any } | ((builder: FieldBuilder<Unarray<NonNullable<T[K]>>>) => void),
    maybeCallback?: (builder: FieldBuilder<Unarray<NonNullable<T[K]>>>) => void
  ): this {
    const { name, alias } = this.extractNameAndAlias(nameOrMapping);
    let args: { [key: string]: any } | undefined;
    let callback: (builder: FieldBuilder<Unarray<NonNullable<T[K]>>>) => void;
  
    if (typeof argsOrCallback === "function") {
      callback = argsOrCallback as (builder: FieldBuilder<Unarray<NonNullable<T[K]>>>) => void;
    } else {
      args = argsOrCallback;
      if (!maybeCallback) {
        throw new Error("Callback must be provided when arguments are supplied");
      }
      callback = maybeCallback;
    }
  
    const builder = new FieldBuilder<Unarray<NonNullable<T[K]>>>();
    callback(builder);
    const fieldNode: any = {
      kind: "object",
      name: name as string,
      fields: builder.getFields(),
    };
    if (alias) {
      fieldNode.alias = alias;
    }
    if (args) {
      fieldNode.args = Object.fromEntries(
        Object.entries(args).map(([k, v]) => [k, String(v)])
      );
    }
    this._fields.push(fieldNode);
    return this;
  }

  /**
   * Adds a connection field with the standard GraphQL connection pattern.
   * 
   * Overload 1 (without alias):
   *    .connection("users", { first: "$count" }, connection => { ... })
   * Overload 2 (with alias):
   *    .connection({ users: "aliasedName" }, { first: "$count" }, connection => { ... })
   */
  public connection<K extends keyof T>(
    name: K,
    args: { [key: string]: any },
    callback: (connection: ConnectionBuilder<NonNullable<T[K]> & Connection>) => void
  ): this;
  public connection<K extends keyof T>(
    nameMapping: Partial<Record<K, string>>,
    args: { [key: string]: any },
    callback: (connection: ConnectionBuilder<NonNullable<T[K]> & Connection>) => void
  ): this;
  public connection<K extends keyof T>(
    nameOrMapping: K | Partial<Record<K, string>>,
    args: { [key: string]: any },
    callback: (connection: ConnectionBuilder<NonNullable<T[K]> & Connection>) => void
  ): this {
    const { name, alias } = this.extractNameAndAlias(nameOrMapping);
    // Filter undefined values from args.
    const cleanedArgs = args
    ? Object.fromEntries(
        Object.entries(args).filter(([, v]) => v !== undefined)
      )
    : undefined;

    // Ensure arguments are strings.
    const stringArgs = cleanedArgs
      ? Object.fromEntries(
          Object.entries(cleanedArgs).map(([k, v]) => [k, String(v)])
        )
      : undefined;
    
    const connectionBuilder = createConnectionBuilder<NonNullable<T[K]> & Connection>();
    callback(connectionBuilder);
    
    // Ensure pageInfo is present.
    if (!connectionBuilder.getFields().some(f => f.kind === "object" && f.name === "pageInfo")) {
      connectionBuilder.withPageInfo();
    }
    
    const fieldNode: any = {
      kind: "object",
      name: name as string,
      args: stringArgs,
      fields: connectionBuilder.getFields(),
    };
    if (alias) {
      fieldNode.alias = alias;
    }
    this._fields.push(fieldNode);
    return this;
  }

  /**
   * Inserts a fragment spread.
   */
  public useFragment(fragmentName: string): this {
    if (!fragmentName || fragmentName.trim() === "") {
      throw new Error("Fragment name cannot be empty");
    }
    this._fields.push({ kind: "fragment", name: fragmentName });
    return this;
  }

  /**
   * Adds an inline fragment with a type condition.
   */
  public inlineFragment<TFragment>(
    type: string,
    callback: (builder: FieldBuilder<TFragment>) => void
  ): this {
    if (!type || type.trim() === "") {
      throw new Error("Type condition cannot be empty for inline fragment");
    }
    const builder = new FieldBuilder<TFragment>();
    callback(builder);
    this._fields.push({
      kind: "inlineFragment",
      type,
      fields: builder.getFields(),
    });
    return this;
  }

  public getFields(): FieldNode[] {
    return this._fields;
  }
}
