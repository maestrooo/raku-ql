import { FieldBuilder } from "./field-builder";
import { Connection } from "./types";

/**
 * Extend FieldBuilder with connection-specific methods.
 */
export type ConnectionBuilder<T extends Connection> = FieldBuilder<T> & {
  nodes(callback: (node: FieldBuilder<T["nodes"][number]>) => void): ConnectionBuilder<T>;
  withPageInfo(callback?: (pageInfo: FieldBuilder<any>) => void): ConnectionBuilder<T>;
};

/**
 * Factory function to create a ConnectionBuilder.
 */
export function createConnectionBuilder<T extends Connection>(): ConnectionBuilder<T> {
  const builder = new FieldBuilder<T>() as ConnectionBuilder<T>;

  builder.nodes = function (callback) {
    this.object("nodes", callback);
    return this;
  };

  builder.withPageInfo = function (callback?: (pageInfo: FieldBuilder<any>) => void): ConnectionBuilder<T> {
    if (callback) {
      this.object("pageInfo", callback);
    } else {
      this.object("pageInfo", (pageInfo: FieldBuilder<any>) => {
        pageInfo.fields("hasNextPage", "hasPreviousPage", "startCursor", "endCursor");
      });
    }
    return this;
  };

  return builder;
}
