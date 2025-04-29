import { QueryBuilder } from '../src/query-builder';

describe('GraphQL Generation', () => {
  it('should generate a valid GraphQL query', () => {
    const query = QueryBuilder.query('GetCollection')
      .operationDirective('country', { code: 'FR' })
      .variables({ productsCount: 'Int!', imageFormat: { type: 'String!', defaultValue: 'JPG' } })
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
      .object({ 'field': 'fieldAlias' }, { key: 'value' }, field => {
        field.fields('title')
      })
      .connection('products', { first: "$productsCount" }, connection => {
        connection.nodes(node => {
          node.useFragment('ProductFragment')
        })
      })
      .connection('collections', { first: 50 }, connection => {
        connection.nodes(node => {
          node.fields('id')
        })
      })
      .connection('orders', { first: 50, type: undefined }, connection => {
        connection.nodes(node => {
          node.fields('id')
        })
      })
      .fragment('ProductFragment', 'Product', fragment => {
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
    
    // Check that the query contains the "query" keyword and the name
    expect(query).toMatch(`
query GetCollection($productsCount: Int!, $imageFormat: String! = JPG) @country(code: "FR") {
  id
  aliasDescription: description
  price @inCurrency(currency: "EUR")
  image {
    alt
    url(format: $imageFormat)
  }
  aliasFeedback: feedback {
    rating
    comment
  }
  fieldAlias: field(key: "value") {
    title
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
  collections(first: 50) {
    nodes {
      id
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
  orders(first: 50) {
    nodes {
      id
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
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
    `.trim());
  });

  it('should generate a valid GraphQL query with operation name', () => {
    const query = QueryBuilder.query('GetMetaobject')
      .variables({ id: 'ID!' })
      .operation('metaobject', { id: '$id' }, metaobject => {
        metaobject.fields('id', 'handle')
      })
      .build({ pretty: true });
    
    // Check that the query contains the "query" keyword and the name
    expect(query).toMatch(`
query GetMetaobject($id: ID!) {
  metaobject(id: $id) {
    id
    handle
  }
}
    `.trim());
  });

  it('should honor type of parameters', () => {
    const connectionParameters = {
      type: "$app:foo",
      first: 250
    }

    const query = QueryBuilder.query('GetMetaobject')
      .connection('metaobjects', connectionParameters, (connection) => {
        connection.object('nodes', (nodes) => {
          nodes.fields('id')
        });
      })
      .build({ pretty: true });
    
    // Check that the query contains the "query" keyword and the name
    expect(query).toMatch(`
query GetMetaobjects {
  metaobjects(type: "$app:foo", first: 250) {
    nodes {
      id
    }
  }
  pageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
}
    `.trim());
  });
});
