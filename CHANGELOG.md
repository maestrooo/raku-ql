## 1.2.6

* Fixed serialization of boolean parameters.

## 1.2.5

* Fixed an issue with incorrect parameter serialization when it started by a $ character.

## 1.2.4

* Ensure that undefined parameters are removed.

## 1.2.3

* Ensure that numbers and floats parameters are not converted as string.

## 1.2.2

* Fix bad release

## 1.2.1

* Ensures that arguments are properly rendered as string.

## 1.2.0

* Export the `FieldBuilder` and `OperationBuilder` so that they can be typed in consuming applications.

## 1.1.0

* Ensure that field builder always "unarray" type so that autocompletion works. Now, while the field `fields` is of
type `MetaobjectField[]`, the type is unarrayed to ensure that auto-completion still works.

```ts
QueryBuilder.query<Metaobject>()
  .object('fields', metaobjectFields => {
    metaobjectFields.fields('key', 'value')
  });
```