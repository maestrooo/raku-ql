# raku-ql

Raku-QL is a fully-typed TypeScript GraphQL query builder.

## What is Raku-QL?

Raku-QL is a GraphQL query builder, supporting most of the GraphQL spec.

## Why using this library?

This library has little to no values if you have a set of fixed GraphQL queries that rarely change. Directly hardcodding the queries is easier and require less typing. This library is useful, however, if you need to programmatically generate queries.

## Installation

Run the command `npm i raku-ql` to add the package.

## Queries

To create a query, use the `query` static method of the query builder. The example below shows most of the supported features, including fields, objects, operation-level directive, field level directive, field parameters, alias, connections or fragments.

To have field auto-completion, use the object type as the generic type.

```ts
const query = QueryBuilder.query('GetCollection')
  .operationDirective('country', { code: 'FR' })
  .variables({ collectionId: 'String!', productsCount: 'Int!', imageFormat: { type: 'String!', defaultValue: 'JPG' } })
  .operation<Collection>('collection', { id: '$collectionId' } collection => {
    .fields(
      'id', 
      { 'description': 'aliasDescription' }, 
      { field: 'price', directive: { inCurrency: { currency: "EUR" } } },
    )
    .object('image', image => {
      image.fields('alt', { field: 'url', args: { format: '$imageFormat' }})
    })
    .object({ 'feedback': 'aliasFeedback' }, feedback => {
      feedback.fields('rating', 'comment')
    })
    .connection('products', { first: "$productsCount" }, connection => {
      connection.nodes(node => {
        node.useFragment('ProductFragment')
      })
    })
  })
  .fragment<Product>('ProductFragment', 'Product', fragment => {
    fragment.fields('title')
      .connection('media', { first: '$productsCount' }, connection => {
        connection.nodes(media => {
          media.fields('alt')
            .inlineFragment('Image', image => {
              image.fields('width', 'height')
            })
            .inlineFragment('Model3d', model3d => {
              model3d.fields('boundingBox')
            })
        })
      })
  })
  .build({ pretty: true });
```

This will generate the following GraphQL query:

```graphql
query GetCollection($collectionId: String!, $productsCount: Int!, $imageFormat: String! = JPG) @country(code: FR) {
  collection(id: $collectionId) {
    id
    aliasDescription: description
    price @inCurrency(currency: EUR)
    image {
      alt
      url(format: $imageFormat)
    }
    aliasFeedback: feedback {
      rating
      comment
    }
    products(first: $productsCount) {
      nodes {
        ...ProductFragment
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
}
fragment ProductFragment on Product {
  title
  media(first: $productsCount) {
    nodes {
      alt
      ... on Image {
        width
        height
      }
      ... on Model3d {
        boundingBox
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

You can create operation with parameters, or create multiple operations in a single query, by using the `operation` method. The operation
can optionally be typed with the return type:

```ts
const query = QueryBuilder.query('GetMetaobject')
  .variables({ id: 'ID!' })
  .operation<Metaobject>('metaobject', { id: '$id' }, metaobject => {
    metaobject.fields('id', 'handle')
  })
  .build({ pretty: true });
```

Will generate:

```graphql
query GetMetaobject($id: ID!) {
  metaobject(id: $id) {
    id
    handle
  }
}
```

## Mutations

To use mutations, use the `mutation` static method, along the `operation` method. The operation can be typed with the return type.

```ts
const query = QueryBuilder.mutation('CreateMetaobject')
  .variables({ metaobject: 'CreateMetaobjectInput!' })
  .operation<MetaobjectCreatePayload>('metaobjectCreate', { metaobject: '$metaobject' }, metaobjectPayload => {
    metaobjectPayload.object('metaobject', metaobject => {
      metaobject.fields('handle')
      .object({ 'field': 'season' }, { key: 'season' }, season => {
        season.fields('value')
      })
    })
    .object('userErrors', userErrors => {
      userErrors.fields('field', 'message', 'code')
    })
  })
  .build({ pretty: true });
```

Will generate:

```graphql
mutation CreateMetaobject($metaobject: CreateMetaobjectInput!) {
  metaobjectCreate(metaobject: $metaobject) {
    metaobject {
      handle
      season: field(key: season) {
        value
      }
    }
    userErrors {
      field
      message
      code
    }
  }
}
```

You can create multiple operations, and optionally alias them:

```ts
const query = QueryBuilder.mutation('UpdateData')
  .variables({ product: 'CreateProductInput!', variant: 'CreateVariantInput' })
  .operation('productCreate', { product: '$product' }, productPayload => {
    productPayload.object('product', product => {
      product.fields('id')
    })
  })
  .operation({ 'variantCreate': 'aliasVariantCreate' }, { variant: '$variant' }, variantPayload => {
    variantPayload.object('variant', variant => {
      variant.fields('id')
    })
  })
  .build({ pretty: true });
```

Will generate:

```graphql
mutation UpdateData($product: CreateProductInput!, $variant: CreateVariantInput) {
  productCreate(product: $product) {
    product {
      id
    }
  }
  aliasVariantCreate: variantCreate(variant: $variant) {
    variant {
      id
    }
  }
}
```