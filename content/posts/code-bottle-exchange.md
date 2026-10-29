---
title: "空瓶与瓶盖换酒（好题 2）"
date: 2026-10-18T17:26:00+08:00
draft: false
description: "资金买酒 + 2 空瓶换 1 瓶 + 4 瓶盖换 1 瓶的模拟题，含初版代码的四个逻辑漏洞与脏标记法正解"
tags: ["C", "做题", "模拟"]
categories: ["编程学习"]
---

## 一、题干背景与规则

**题目背景**：江月诗在酒馆喝酒，酒馆推出了兑换活动。已知江月诗拥有初始资金 $m$、初始空瓶 $k$、初始瓶盖 $g$，以及当前酒价 $p$。要求计算他最多能喝到多少瓶酒。

**兑换规则**

- **资金购买**：花费 $p$ 元可以购买 1 瓶酒。
- **空瓶兑换**：2 个空酒瓶可以兑换 1 瓶酒。
- **瓶盖兑换**：4 个瓶盖可以兑换 1 瓶酒。

**隐藏机制（核心考点）**：无论是用钱买到的酒，还是用空瓶、瓶盖兑换来的酒，只要喝完后，都会**额外产生 1 个空酒瓶和 1 个瓶盖**。这些新产生的资源可以继续参与下一轮的兑换。

---

## 二、初版代码的错误分析

```c
#include<stdio.h>
int main(){
    int m,k,g,p;

    scanf("%d %d %d %d",&m,&k,&g,&p);

    int n=0;    // 记录获得的酒数
    int buy=0;  // 买到的酒
    // 买到 m/p 瓶酒，得到 m/p 个盖子，可换 (m/p)/4 + (m/p)/2 酒
    buy=(int)m/p;
    int g1=buy+g;
    int k1=buy+k;
    while(k1>=2 || g1>=4){
        if(k1<=2 && g1>=4){
            n=n+buy+(int)(g1)/4;
        }else if(k1>=2 && g1<4){
            n=n+buy+(int)(k1)/2;
        }else{
            n=n+buy+(int)(g1)/4+(int)(k1)/2;
        }
        g1-=4;
        k1-=2;
    }
    printf("%d",n);

    return 0;
}
```

初版代码里主要存在四个逻辑漏洞：

1. **遗漏了「新资源」的产生（致命错误）**：在 `while` 循环内部，只扣减了用于兑换的空瓶和瓶盖（如 `g1 -= 4; k1 -= 2;`），却忘记加上喝掉新酒后产生的新空瓶和新瓶盖。这会导致资源越换越少，无法触发连锁反应，最终结果严重偏小。
2. **循环变量被重复累加**：把初始买酒的数量 `buy` 写在了 `while` 循环内部累加（`n = n + buy + ...`）。因为 `buy` 在循环外确定后不再改变，这会导致每一轮都把初始买的酒重新算一遍，结果呈指数级爆炸。
3. **互斥分支导致资源浪费**：用 `if-else if-else` 处理空瓶和瓶盖的兑换，当同时满足「空瓶 ≥ 2」且「瓶盖 ≥ 4」时，代码只执行最后一个 `else` 分支，浪费了同时兑换的机会。
4. **扣减逻辑不严谨**：使用固定值扣减（如 `g1 -= 4`），而不是用除法计算最大可兑换数量。资源较多时需要循环多次才能换完，效率低且容易出错。

---

## 三、正确做法与最优解法

针对这种「资源转换与状态机模拟」问题，最优解法是**贪心模拟法**配合**脏标记法（Dirty Flag）**。

**核心思路**

把买酒、换瓶、换盖作为三个**完全独立**的 `if` 判断。只要当前资源满足条件，就一次性计算能换多少瓶（用除法 `/`），并立即更新所有相关资源。

**核心技巧：脏标记法**

- 在循环开头定义一个标志位 `int changed = 0;`。
- 只要这一轮里买酒、换瓶、换盖中**有任何一个**被执行了，就把 `changed` 置为 `1`。
- 一轮循环结束若 `changed` 仍为 `0`，说明所有资源都已耗尽（没钱、空瓶 < 2、瓶盖 < 4），系统达到稳态，安全退出循环。

**防御性编程**

- 用 `if (scanf(...) != 4) { return 0; }` 防止输入格式错误导致程序异常。
- 用 `long long` 防止极端情况下的整数溢出。

**最终正确代码**

```c
#include <stdio.h>

int main() {
    long long m, k, g, p;
    if (scanf("%lld %lld %lld %lld", &m, &k, &g, &p) != 4) {
        return 0;
    }

    long long total = 0;

    while (1) {
        int changed = 0;

        // 1. 用钱买酒
        if (m >= p) {
            long long buy = m / p;
            m -= buy * p;
            total += buy;
            k += buy;
            g += buy;
            changed = 1;
        }

        // 2. 用空瓶换酒
        if (k >= 2) {
            long long exchange_bottle = k / 2;
            k -= exchange_bottle * 2;
            total += exchange_bottle;
            k += exchange_bottle;
            g += exchange_bottle;
            changed = 1;
        }

        // 3. 用瓶盖换酒
        if (g >= 4) {
            long long exchange_cap = g / 4;
            g -= exchange_cap * 4;
            total += exchange_cap;
            k += exchange_cap;
            g += exchange_cap;
            changed = 1;
        }

        // 如果这一轮没有任何操作，退出循环
        if (!changed) {
            break;
        }
    }

    printf("%lld\n", total);
    return 0;
}
```
