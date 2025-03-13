## 1.1.0

* Ensure that field builder always "unarray" type so that autocompletion works. Now, while the field `fields` is of
type `MetaobjectField[]`, the type is unarrayed to ensure that auto-completion still works.

```ts
QueryBuilder.query<Metaobject>()
  .object('fields', metaobjectFields => {
    metaobjectFields.fields('key', 'value')
  });
```