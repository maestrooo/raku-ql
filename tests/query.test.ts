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
      .connection('products', { first: "$productsCount" }, connection => {
        connection.nodes(node => {
          node.useFragment('ProductFragment')
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
query GetCollection($productsCount: Int!, $imageFormat: String! = JPG) @country(code: FR) {
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
});
