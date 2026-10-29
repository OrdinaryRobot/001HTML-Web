---
title: "数组（一维与二维）"
date: 2026-10-29T19:49:00+08:00
draft: false
description: "一维/二维数组的创建与初始化、字符数组与 \\0、strlen 和 sizeof 的区别"
tags: ["C", "语法", "数组"]
categories: ["编程学习"]
---

## 一维数组的创建和初始化

创建一维数组，需要规定数据类型、数组名、数组大小：

```c
type arr_name[常量];

int a[1001];
```

初始化：

```c
int a1[5] = {1, 2, 3, 4, 5};  // 完全初始化
int a2[5] = {1, 2, 3};        // 不完全初始化，剩余位置由 0 填充
int a3[5] = {0};              // 首个元素初始化为 0，剩下的默认为 0
```

由字符构建数组：

```c
char ch[] = {'a', 'b', 'c'};
char ch2[] = "CNWU";

printf("%c", ch[1]);   // 输出数组里面想要的某一位字符
printf("%s", ch2);     // 输出字符串
```

> 注意：
> 1. 字符串尾部隐藏了结束符 `\0`，所以数组里每个字符串会有（看到的字符数 + 1）个位置。也就是说，如果给每个字符串设置了 20 个字符位置，那么最多只能输入 19 个字符。
> 2. `%s` 打印字符串时，直到 `\0` 才结束。

## 求字符串长度：strlen 与 sizeof

`strlen` 求字符串长度时会一直数，直到遇到 `\0` 结束。
所以形如 `char ch2[] = "CNWU"` 的字符串可以得出正确的值，而 `char ch[] = {'a', 'b', 'c'}` 会越界访问，出现乱码。

![sizeof 与 strlen 的区别](https://ordinaryrobot.github.io/001HTML-Web/images/uploads/20261023-sizeof-vs-strlen.png)

`sizeof` 得出的值单位为**字节**，它是操作符而非函数，算的是操作数所占内存大小，什么类型都适用；
`strlen` 是库函数，需要包含头文件 `string.h`，只针对字符串，统计的是 `\0` 之前字符的个数。

![用 sizeof 计算数组元素个数](https://ordinaryrobot.github.io/001HTML-Web/images/uploads/20261023-sizeof-array-count.png)

```c
int arr[10] = {0};

printf("%zu\n", sizeof(arr));                 // 10*4=40，数组的总大小，单位字节
printf("%zu\n", sizeof(arr[0]));              // 4，第一个元素的大小，单位字节
printf("%zu\n", sizeof(arr) / sizeof(arr[0])); // 10，元素个数
```

输出：`40` / `4` / `10`。

## 二维数组

二维数组的创建与一维相同：

```c
int a[][5];
```

左边为行，右边为列，**列不可省略**。

初始化：

```c
int arr1[3][5] = {1, 2, 3, 4, 5, 2, 3, 4, 5, 6, 3, 4, 5, 6, 7};
int arr2[3][5] = {{1, 2}, {3, 4}, {5, 6}};
```

下一篇：[函数的设计](../c-function/)
