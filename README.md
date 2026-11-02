convex-hull-esm
===============

Modern ESM port of [Mikola Lysenko's](https://github.com/mikolalysenko) original [`convex-hull` package](https://github.com/mikolalysenko/convex-hull).

This port consolidates all the dependencies (and their sub-dependencies) into a one consolidated package, eliminating some dependencies that are not actually used by this package but still bundled.

It also upgrade some of the syntax to use some of the more modern ES features while still targeting Node 22+ and browsers.

Installation
------------

```shell
npm install convex-hull-esm
```

Usage Example
-------------

```javascript
import convexHull from `convex-hull-esm`

const polytope = convexHull(points)
```

Thanks
------

Big thanks to [Mikola Lysenko's](https://github.com/mikolalysenko) for his work on the original package(s).

License
-------

MIT
