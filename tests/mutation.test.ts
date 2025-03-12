import { QueryBuilder } from '../src/query-builder';

describe('GraphQL Generation', () => {
  it('should generate a valid GraphQL mutation', () => {
    const query = QueryBuilder.mutation('CreateMetaobject')
      .variables({ metaobject: 'CreateMetaobjectInput!' })
      .operation('metaobjectCreate', { metaobject: '$metaobject' }, metaobjectPayload => {
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
    
    // Check that the query contains the "query" keyword and the name
    expect(query).toMatch(`
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
}`.trim());
  });

  it('should support multiple mutations', () => {
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
    
    // Check that the query contains the "query" keyword and the name
    expect(query).toMatch(`
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
}`.trim());
  });
});
