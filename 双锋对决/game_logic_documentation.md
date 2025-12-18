# 游戏逻辑说明文档

## 1. 游戏概述

这是一款本地多人对战游戏，需要两名玩家在同一台电脑上使用不同按键控制各自的角色进行战斗。游戏包含6个不同的关卡，每个关卡都有独特的背景和战斗环境。

### 1.1 游戏核心机制
- 角色对战系统：两名玩家分别控制魔法师和机械师进行战斗
- 关卡递进系统：从城镇广场到冰雪要塞，共6个不同主题的关卡
- 技能系统：每个角色拥有多种攻击和防御技能
- 能量系统：通过战斗积累能量，释放终极技能
- 生命值管理：战斗中需要平衡攻击和防御策略

## 2. 关卡系统与背景切换

### 2.1 关卡列表
游戏包含6个关卡，每个关卡对应不同的背景主题：

| 关卡索引 | 关卡名称 | 背景图片 |
|---------|---------|---------|
| 0       | 城镇广场 | background.png |
| 1       | 峭壁之战 | background2.png |
| 2       | 地下矿井 | background3.png |
| 3       | 天空之城 | background4.png |
| 4       | 火山熔岩 | background5.png |
| 5       | 冰雪要塞 | background6.png |

### 2.2 背景切换机制
在游戏中，背景图片会根据当前关卡动态切换：

```javascript
// 关卡开始时设置背景
function round() {
    // 根据当前关卡设置背景图
    if(currentLevel === 1) { // 第二关卡（索引1）
        $("#back").css("background-image", "url(img/steve.art/background2.png)");
    } else if(currentLevel === 2) { // 第三关卡（索引2）
        $("#back").css("background-image", "url(img/steve.art/background3.png)");
    } else if(currentLevel === 3) { // 第四关卡（索引3）
        $("#back").css("background-image", "url(img/steve.art/background4.png)");
    } else if(currentLevel === 4) { // 第五关卡（索引4，火山）
        $("#back").css("background-image", "url(img/steve.art/background5.png)");
    } else if(currentLevel === 5) { // 第六关卡（索引5，冰雪城堡）
        $("#back").css("background-image", "url(img/steve.art/background6.png)");
    } else { // 默认背景
        $("#back").css("background-image", "url(img/steve.art/background.png)");
    }
}
```

### 2.3 背景图片处理
- 所有背景图片都被统一重命名为`background.png`至`background6.png`
- 图片尺寸：原始图片尺寸可能不同，但通过CSS样式`background-size: 100% 100%`自适应容器
- 容器尺寸：背景容器`#back`的固定尺寸为1670x700像素

## 3. 角色控制系统

游戏包含两个可操控角色：魔法师和机械师，每个角色都有独特的属性和技能。

### 3.1 魔法师（Control1）

#### 3.1.1 基本属性
- 初始位置：x=300, y=100
- 生命值：3800点
- 移动速度：4（步行）/ 19（跳跃）
- 攻击力：基础183点

#### 3.1.2 控制按键
| 按键 | 功能 |
|------|------|
| A | 向左移动 |
| D | 向右移动 |
| W | 跳跃 |
| B | 基础攻击（发射魔法弹） |
| C | 护盾技能（增加400点护盾值） |
| X | 囚禁技能（使机械师短暂无法移动） |
| V | 流星技能（蓄力释放强力攻击） |
| Q | 终极技能（召唤仆人协助战斗） |

#### 3.1.3 核心技能实现

**基础攻击（shoot函数）**：
```javascript
this.shoot = function() {
    $("#bulletBox").append("<div id='mageBullet'></div>");
    let bullet = $("#mageBullet"),
        loopTime = 0,
        dir = 1,
        speed = 20;
    // 设置子弹方向和速度
    if (self.dir === "left") {
        speed *= -1;
        dir = -1;
    }
    bullet.css("bottom", self.y + 40 + "px");
    // 子弹移动和碰撞检测
    function draw() {
        bullet.css("left", self.x + 25 + loopTime * speed);
        if (collisionCheak(mechanician.man, bullet, 202) === "coli") {
            bullet.remove();
            mechanician.health -= self.damage;
            self.energy += 4;
            // 播放受伤音效
            // 显示伤害效果
            return;
        }
        loopTime += 1;
        if (loopTime >= 30) {
            bullet.remove();
            return;
        }
        setTimeout(draw, 10);
    }
    draw();
};
```

**流星技能（meteor函数）**：
- 蓄力期间移动速度减半，无法跳跃
- 伤害随蓄力时间增加（最高1775点）
- 技能范围随蓄力时间增大
- 释放后有7秒冷却时间

**护盾技能**：
- 增加400点护盾值
- 8秒冷却时间

**囚禁技能**：
- 使机械师在1.2秒内无法移动
- 8秒冷却时间

**终极技能（Servant）**：
- 消耗100点能量
- 召唤仆人协助战斗
- 仆人会自动攻击敌人

### 3.2 机械师（Control2）

#### 3.2.1 基本属性
- 初始位置：x=1200, y=100
- 生命值：4000点
- 移动速度：5（步行）/ 20（跳跃）
- 攻击力：基础200点

#### 3.2.2 控制按键
| 按键 | 功能 |
|------|------|
| ← | 向左移动 |
| → | 向右移动 |
| ↑ | 跳跃 |
| / | 基础攻击（近战攻击） |
| , | 闪现技能（快速移动一段距离） |
| M | 疯狂模式（短时间增强属性） |
| . | 榴弹技能（蓄力发射强力榴弹） |
| L | 终极技能（召唤杀戮机器） |

#### 3.2.3 核心技能实现

**基础攻击（hit函数）**：
```javascript
function hit() {
    var dam = you.damage;
    if(collisionCheak(mage.man, you.line, 400) === "coli") {
        // 根据距离计算实际伤害
        if(you.dir === "left") {
            dam -= Math.ceil(you.x - mage.x);
        } else {
            dam -= Math.ceil(mage.x - you.x - 50);
        }
        // 造成伤害并增加能量
        you.energy += Math.ceil(dam / 20);
        // 显示伤害效果和播放音效
        mage.shield -= dam;
        if(mage.shield < 0) {
            mage.health += mage.shield;
            mage.shield = 0;
        }
    }
}
```

**闪现技能（flash函数）**：
- 向当前面向的方向瞬移180像素
- 1.2秒冷却时间

**疯狂模式（crazy函数）**：
- 持续3秒
- 攻击力、移动速度、跳跃速度提升50%
- 攻击间隔减半
- 消耗20%当前生命值

**榴弹技能（ComboShoot）**：
- 蓄力期间显示速度提示
- 蓄力时间越长，发射速度越快
- 8秒冷却时间

**终极技能（KillerMachine）**：
- 消耗100点能量
- 连续召唤5个杀戮机器
- 每个机器有独立的攻击逻辑

## 4. 战斗与技能系统

### 4.1 能量系统
- 初始能量：100点
- 能量获取：通过攻击敌人获得
- 能量上限：100点
- 终极技能：当能量满时可以释放终极技能

### 4.2 伤害计算机制
- 基础伤害：根据角色属性计算
- 距离衰减：某些技能（如机械师的近战攻击）会根据距离减少伤害
- 护盾系统：魔法师可以使用护盾技能吸收伤害
- 伤害反馈：受到伤害时显示血液效果和播放音效

### 4.3 碰撞检测系统

游戏使用`collisionCheak`函数进行碰撞检测：

```javascript
function collisionCheak(obj1, obj2, coliNumber) {
    // 获取对象尺寸
    var obj1_wid = obj1.width(),
        obj1_hei = obj1.height(),
        obj2_wid = obj2.width(),
        obj2_hei = obj2.height(),
        xDis = parseInt(obj2.css("left"), 10) - parseInt(obj1.css("left"), 10),
        yDis = parseInt(obj2.css("top"), 10) - parseInt(obj1.css("top"), 10),
        result = "";
    
    // 碰撞逻辑判断
    if (xDis >= -obj2_wid && xDis <= obj1_wid) {
        if (yDis >= -obj2_hei && yDis <= obj1_hei) {
            return "coli"; // 发生碰撞
        }
    }
    // 返回碰撞方向或空
    return result;
}
```

### 4.4 技能冷却系统

所有技能都有冷却时间，通过`Cd`类实现冷却效果的显示：

```javascript
function Cd(time, target, press) {
    var timer;
    target.css("background-color", "silver");
    target.html(time);
    // 倒计时显示
    function clock() {
        timer = setInterval(function() {
            if(time != 0.1) {
                time = (time -= 0.1).toFixed(1);
                target.html(time);
            } else {
                target.html(press);
                target.css("background-color", "aqua");
                clearInterval(timer);
            }
        }, 100);
    }
    clock();
}
```

## 5. 游戏机制与物理系统

### 5.1 重力系统
游戏实现了简单的重力系统，角色会自然下落：

```javascript
function gravity(obj) {
    // 应用重力加速度
    obj.y -= obj.fallSpeed;
    // 限制最大下落速度
    if(obj.fallSpeed < 15) {
        obj.fallSpeed += 1;
    }
    // 地面碰撞检测
    if(obj.y <= 0) {
        obj.y = 0;
        obj.fallTrue = false;
        obj.jumpChance = 2;
        obj.fallSpeed = 0;
    }
}
```

### 5.2 跳跃机制
- 双段跳：每个角色可以连续跳跃两次
- 跳跃高度：由角色的跳跃速度决定
- 跳跃控制：通过按键触发，受重力影响

### 5.3 地图边界检查
确保角色不会移动出地图边界：

```javascript
function mapChecker(obj) {
    // 左侧边界检查
    if(obj.x < 0) {
        obj.x = 0;
    }
    // 右侧边界检查（根据地图宽度调整）
    if(obj.x > 1600 - obj.man.width()) {
        obj.x = 1600 - obj.man.width();
    }
}
```

## 6. UI与状态显示

### 6.1 生命值显示
- 血条颜色变化：当生命值低于30%时，血条显示为危险状态（红色闪烁）
- 护盾显示：魔法师的护盾值在生命值上方显示
- 生命值计算：生命值通过CSS宽度动态调整

### 6.2 能量条显示
- 能量条满时，显示为黄色并闪烁
- 能量通过战斗积累，上限为100%
- 能量条宽度根据当前能量值动态调整

### 6.3 技能冷却显示
- 技能按钮在冷却期间显示倒计时
- 冷却结束后恢复原始颜色和图标

### 6.4 伤害反馈
- 受到伤害时显示血液效果
- 根据伤害类型播放不同音效
- 伤害数值随伤害量变化

## 7. 音频系统

游戏为不同角色和技能配备了独立的音效：
- MageAudio：魔法师相关音效（攻击、受伤、技能等）
- MechAudio：机械师相关音效（攻击、技能、疯狂模式等）

音效播放示例：
```javascript
playAudio(MageAudio[8]); // 播放魔法师终极技能音效
```

## 8. 游戏初始化与流程

### 8.1 游戏启动
游戏通过`game()`函数初始化，创建角色实例并设置游戏环境。

### 8.2 关卡循环
每个关卡的开始通过`round()`函数设置背景和初始化战斗环境。

### 8.3 战斗流程
1. 玩家选择关卡
2. 角色进入战斗区域
3. 战斗开始，玩家使用技能攻击对方
4. 一方生命值耗尽，战斗结束
5. 胜利方获得积分，进入下一关卡

## 9. 代码结构与文件组织

### 9.1 核心文件
- `control.js`：游戏核心逻辑，包含角色控制、技能系统、碰撞检测等
- `new.css`：游戏样式，包含背景、角色、UI元素的样式定义
- `index.html`：游戏主页面，包含DOM结构和资源引用

### 9.2 资源文件
- `img/steve.art/`：背景图片资源
- `img/`：角色、技能效果、UI元素图片
- 音频文件：音效和背景音乐

## 10. 游戏特色与亮点

1. **双角色差异化设计**：魔法师远程攻击vs机械师近战攻击，提供不同的游戏体验
2. **丰富的技能系统**：每个角色拥有多种技能组合，支持多样化的战斗策略
3. **动态关卡系统**：6个不同主题的关卡，提升游戏趣味性和重玩价值
4. **能量积累机制**：鼓励积极战斗，同时增加战术选择
5. **本地多人对战**：支持两名玩家在同一电脑上实时对战，增强社交互动性

## 11. 技术实现要点

### 11.1 前端技术栈
- HTML5：游戏页面结构
- CSS3：游戏样式和动画效果
- JavaScript：游戏核心逻辑
- jQuery：DOM操作和事件处理

### 11.2 关键技术
- 面向对象编程：角色和技能的类设计
- 碰撞检测算法：像素级精确碰撞检测
- 动画帧控制：通过setTimeout和setInterval实现流畅动画
- 事件驱动编程：基于键盘输入的实时响应
- CSS3变换：角色移动、缩放和旋转效果

---

**文档版本**：1.0
**创建时间**：2025-12-18
**适用游戏版本**：当前版本
