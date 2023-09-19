export default function flatten(
  obj: { [key: string]: any },
  roots = [],
  sep = "."
) {
  return Object.keys(obj).reduce(
    (res, curr) =>
      Object.assign(
        {},
        res,
        Object.prototype.toString.call(obj[curr]) === "[object Object]"
          ? flatten(obj[curr], roots.concat([curr]))
          : { [roots.concat([curr]).join(sep)]: obj[curr] }
      ),
    {}
  );
}
