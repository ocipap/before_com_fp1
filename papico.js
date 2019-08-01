const L = {}
const C = {}

const curry = f =>
  (a, ..._) => _.length ? f(a, ..._) : (..._) => f(a, ..._)

const Identity = v => v

const nop = Symbol('nop')

const noop = () => {}

const catchNoop = ([...arr]) => 
  (arr.forEach(a => a instanceof Promise ? a.catch(noop) : a) , arr);

const isIterable = iter => iter && iter[Symbol.iterator]

const go1 = (a, f) => a instanceof Promise ? a.then(f) : f(a)

const reduceF = (acc, a, f) =>
  a instanceof Promise ?
  a.then(a => f(acc, a), e => e == nop ? acc : Promise.reject(e)) :
  f(acc, a)

const head = iter => go1(take(1, iter), ([h]) => h)

const reduce = curry((f, acc, iter) => {
  if (!iter) return reduce(f, head(iter = acc[Symbol.iterator]()), iter)
  iter = iter[Symbol.iterator]()

  return go1(acc, function recur(acc) {
    let cur
    while (!(cur = iter.next()).done) {
      acc = reduceF(acc, cur.value, f)
      if (acc instanceof Promise) return acc.then(recur)
    }
    return acc
  })
})

const go = (...args) => reduce((a, f) => f(a), args)

const pipe = (f, ...fs) => (...as) => go(f(...as), ...fs)

const take = curry((l, iter) => {
  let res = []
  iter = iter[Symbol.iterator]()

  return function recur() {
    let cur
    while (!(cur = iter.next()).done) {
      const a = cur.value
      if (a instanceof Promise) return a
        .then(a => {
          return (res.push(a), res).length == l ? res : recur()
        })
        .catch(e => e == nop ? recur() : Promise.reject(e))

      res.push(a)
      if (res.length == l) return res
    }
    return res
  }()
})

const takeAll = take(Infinity)

L.range = function* (l) {
  let i = -1
  while (++i < l) {
    yield i;
  }
}

L.map = curry(function* (f, iter) {
  for (const a of iter) {
    yield go1(a, f)
  }
})

L.filter = curry(function* (f, iter) {
  for (const a of iter) {
    const b = go1(a, f)
    if (b instanceof Promise) yield b.then(b => b ? a : Promise.reject(nop))
    if (f(a)) yield a
  }
})

L.entries = function* (obj) {
  for (const k in obj) yield [k, obj[k]]
}

L.flatten = function* (iter) {
  for (const a of iter) {
    if (isIterable(a)) yield* a
    else yield a
  }
}

L.deepFlat = function* f(iter) {
  for (const a of iter) {
    if (isIterable(a)) yield* f(a)
    else yield a
  }
}

L.flatMap = curry(pipe(L.map, L.flatten))

C.reduce = curry((f, acc, iter) => iter ?
    reduce(f, acc, catchNoop(iter)) :
    reduce(f, catchNoop(acc)))

C.take = curry((l, iter) => take(l, catchNoop(iter)))

C.takeAll = C.take(Infinity)

C.map = curry(pipe(L.map, C.takeAll))

C.filter = curry(pipe(L.filter, C.takeAll))

const range = l => {
  let i = -1
  let res = []
  while (++i < l) {
    res.push(i)
  }
  return res
}

const join = curry((sep = ",", iter) => reduce((str, a) => `${str}${sep}${a}`, "", iter))

const map = curry(pipe(L.map, takeAll))

const filter = curry(pipe(L.filter, takeAll))

const find = curry((f, iter) => pipe(
  L.filter(f),
  take(1),
  ([a]) => a
))

const flatten = pipe(L.flatten, takeAll)

const deepFlat = pipe(L.deepFlat, takeAll)

const flatMap = curry(pipe(L.map, flatten))