---
title: "三目运算符"
date: 2026-10-28T19:38:00+08:00
draft: false
description: "条件运算符的写法、用它简化求最大值的函数，以及三个容易踩的坑"
tags: ["C", "C++", "语法"]
categories: ["编程学习"]
---

## 三目运算符（条件运算符）

C++ 唯一的三目运算符，用来在**一个表达式里**完成 if-else 的选择。

**原型**

```
条件 ? 条件成立时的值 : 条件不成立时的值
 ↑            ↑                  ↑
判断        true 分支          false 分支
```

先判断，再二选一：条件为真取 `?` 后面那个，为假取 `:` 后面那个。

### 典型用法：求最大值

```cpp
int myMax(int x, int y) {
    return x > y ? x : y;
}
```

等价于：

```cpp
int myMax(int x, int y) {
    if (x > y) return x;
    else       return y;
}
```

### 比 if-else 强在哪

表达式能直接嵌进别的地方，if-else 不行：

```cpp
int big = x > y ? x : y;        // 直接赋值
cout << (x > y ? x : y);        // 直接输出
a[x > y ? 1 : 0]++;             // 直接当下标
```

### 三个坑

| 坑 | 错误写法 | 正确写法 |
|---|---|---|
| 优先级低，嵌算式要加括号 | `x > y ? x : y + 1`（实际是 `x > y ? x : (y + 1)`） | `(x > y ? x : y) + 1` |
| 嵌套太深看不懂 | `x > y ? (x > z ? x : z) : (y > z ? y : z)` | 三个数以上用 if 或数组 |
| 两边类型不一致 | `flag ? 1 : 2.5`（结果变 double） | 两边保持同类型 |

### 标准库替代

```cpp
#include <algorithm>
max(x, y);   // 求较大值
min(x, y);   // 求较小值
```

刷题用 `max()` 完全没问题，但要知道它等价于 `x > y ? x : y`。

上一篇：[函数的设计](../c-function/)
