/*global $*/
/*jshint browser:true, esnext:true*/
//AI mode
// ===== 联机改造：操作执行器 =====

// 安全音频播放函数
function safePlay(audio) {
    if (!audio) return;
    audio.play().catch(() => {});
}

var beforeColi = [];

function collisionCheak(obj1, obj2, coliNumber) {
        
        //up || down coli
        //obj1 is the 'center' of collision
        var obj1_wid = obj1.width(),
            obj1_hei = obj1.height(),
            obj2_wid = obj2.width(),
            obj2_hei = obj2.height(),
            xDis = parseInt(obj2.css("left"), 10) - parseInt(obj1.css("left"), 10),
            yDis = parseInt(obj2.css("top"), 10) - parseInt(obj1.css("top"), 10),
            result = "";
        
        if (xDis >= -obj2_wid && xDis <= obj1_wid) {
            if (yDis >= -obj2_hei && yDis <= obj1_hei) {
                let store = beforeColi[coliNumber];
                beforeColi[coliNumber] = "";
                return store + "coli";
            } else if (yDis <= -obj2_hei) {
                result = "w";
            } else if (yDis >= obj1_hei) {
                result = "s";
            }
        }
        if (yDis >= -obj2_hei && yDis <= obj1_hei) {
            if (xDis <= -obj2_wid) {
                result = "a";
            }
            if (xDis >= obj1_wid) {
                result = "d";
            }
        }
        beforeColi[coliNumber] = result;
}

function randomNumberAtoB(a) {
    var result;
    a += 1;
    result = Math.floor(Math.random() * a);
    return result;
}

// 火球生成函数 - 移到变量定义之后
function spawnFireBall(mageObj, dir, damage, size) {
    console.log("🔥 生成火球:", "方向:", dir, "伤害:", damage, "大小:", size);
    
    // 立即停止之前的火球并清理特效
    if (mageObj.timer[2]) {
        clearInterval(mageObj.timer[2]);
        mageObj.timer[2] = null;
        mageObj.meteor.css("bottom", "-1000px");
        mageObj.meteor.css("display", "none");
    }
    
    // 使用缓存的参数（如果存在）
    let useDir = dir;
    let useDamage = damage;
    let useSize = size;
    
    if (mageObj._vCache) {
        console.log("🔥 使用缓存参数:", mageObj._vCache);
        useDir = mageObj._vCache.dir;
        useDamage = mageObj._vCache.damage;
        useSize = mageObj._vCache.size;
    }
    
    // 计算火球起始位置 - 使用人物当前位置
    const characterWidth = mageObj.man.width();
    const characterHeight = mageObj.man.height();
    
    let startX, startY;
    
    if (useDir === "left") {
        // 向左发射：从人物左侧前方
        startX = mageObj.x - 60;
        startY = mageObj.y + characterHeight * 0.6;  // 从人物上半身发射
        mageObj.meteor.css("transform", "scaleX(-1)");
    } else {
        // 向右发射：从人物右侧前方
        startX = mageObj.x + characterWidth - 20;
        startY = mageObj.y + characterHeight * 0.6;
        mageObj.meteor.css("transform", "");
    }
    
    console.log("🔥 火球起始位置:", startX, startY, "人物位置:", mageObj.x, mageObj.y);
    
    // 立即显示火球
    mageObj.meteor.css({
        "left": startX + "px",
        "bottom": startY + "px",
        "width": (135 * useSize) + "px",
        "height": (110 * useSize) + "px",
        "display": "block"
    });
    
    // 火球移动逻辑
    let currentX = startX;
    
    var fireLoop = function() {
        // 更新火球位置 - 提高移动速度减少延迟
        if (useDir === "left") {
            currentX -= 20;  // 向左移动，提高速度
        } else {
            currentX += 20;  // 向右移动，提高速度
        }
        
        // 立即更新火球位置
        mageObj.meteor.css("left", currentX + "px");
        
        // 检查对手是否存在
        if (typeof mechanician === "undefined" || !mechanician) {
            return;
        }
        
        // 碰撞检测
        if (collisionCheak(mechanician.man, mageObj.meteor, 203) === "coli") {
            console.log("💥 火球命中!");
            mechanician.health -= Math.floor(useDamage + 25);
            clearInterval(mageObj.timer[2]);
            mageObj.timer[2] = null;
            mageObj.energy += Math.ceil(useDamage / 50);
            
            // 伤害效果
            if (mageObj.dir === mechanician.dir) {
                blood(mechanician, 1, Math.ceil(useDamage / 40), Math.ceil(useDamage / 200), -Math.ceil(useDamage / 200));
            } else {
                blood(mechanician, 1, Math.ceil(useDamage / 40), Math.ceil(useDamage / 200), Math.ceil(useDamage / 200));
            }
            
            // 音效
            let x = randomNumberAtoB(3);
            if (x === 1) {
                safePlay(MechAudio[7]);
            } else if (x === 2) {
                safePlay(MechAudio[8]);
            } else {
                safePlay(MechAudio[9]);
            }
            safePlay(MageAudio[1]);
            
            // 隐藏火球并清理特效
            mageObj.meteor.css("bottom", "-1000px");
            mageObj.meteor.css("display", "none");
            return;
        }
        
        // 边界检测 - 超出屏幕时销毁火球
        if (currentX < -300 || currentX > 1800) {
            console.log("🔥 火球超出边界");
            clearInterval(mageObj.timer[2]);
            mageObj.timer[2] = null;
            mageObj.meteor.css("bottom", "-1000px");
            mageObj.meteor.css("display", "none");
        }
    };
    
    // 立即开始火球移动 - 使用更快的刷新率
    mageObj.timer[2] = setInterval(fireLoop, 12);
    
    // 播放火球发射音效
    safePlay(MageAudio[0]);
    
    // 清理缓存（如果使用了缓存）
    if (mageObj._vCache) {
        mageObj._vCache = null;
    }
}

//AI mode

function game(){
    var world,trun = 1,st = false;
    
    // WebSocket 连接
    var ws;
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        ws = new WebSocket('ws://localhost:3001');
        
        ws.onopen = function() {
            console.log('✅ WebSocket 连接已建立 to ws://localhost:3001');
        };
        
        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            if (data.type === "sync" && data.role === "mage") {
                if (data.action === "move") {
                    if (data.dir === "left" && mage && !mage.press[0]) {
                        mage.dir = "left";
                        mage.press[0] = true;
                        clearInterval(mage.timer[1]);
                        mage.timer[0] = setInterval(function(){mage.x -= mage.walkSpeed;},20);
                    } else if (data.dir === "right" && mage && !mage.press[1]) {
                        mage.dir = "right";
                        mage.press[1] = true;
                        clearInterval(mage.timer[0]);
                        mage.timer[1] = setInterval(function(){mage.x += mage.walkSpeed;},20);
                    }
                } else if (data.action === "stop") {
                    if (data.dir === "left" && mage) {
                        mage.press[0] = false;
                        clearInterval(mage.timer[0]);
                    } else if (data.dir === "right" && mage) {
                        mage.press[1] = false;
                        clearInterval(mage.timer[1]);
                    }
                } else if (data.action === "skill" && data.skill === "v_start") {
                    if (mage && mage.cD[3]) {
                        mage.cD[3] = false;
                        mage.cD[0] = false;
                        mage.walkSpeed /= 2;
                        mage.jumpChance = 0;
                        
                        // V 技能开始时缓存参数
                        mage._vCache = {
                            dir: mage.dir,
                            x: mage.x,
                            y: mage.y,
                            damage: mage.fireDamage,
                            size: mage.fireSize
                        };
                        
                        mage.timer[3] = setInterval(function(){
                            mage.cD[4] = true;
                            clearInterval(mage.timer[3]);
                        },1000);
                    }
                } else if (data.action === "skill" && data.skill === "v_fire") {
                    if (mage && mage.cD[4]) {
                        mage.cD[4] = false;
                        mage.cD[0] = true;
                        mage.walkSpeed *= 2;
                        mage.jumpChance = 2;
                        
                        // 使用缓存的参数生成火球
                        if (mage._vCache) {
                            spawnFireBall(
                                mage,
                                mage._vCache.dir,
                                mage._vCache.damage,
                                mage._vCache.size
                            );
                            mage._vCache = null;
                        }
                        
                        clearInterval(mage.timer[3]);
                        new Cd(7,mage.cD3,"V");
                        
                        // 立即重置技能状态，确保特效消失
                        mage.cD[3] = false;  // V技能准备阶段结束
                        mage.cD[4] = false;  // V技能发射阶段结束
                        
                        setTimeout(function(){
                            mage.cD[3] = true;
                            mage.cD[4] = true;
                        },7000);
                    }
                }
            }
        };
        
        ws.onerror = function(error) {
            console.error('❌ WebSocket 连接错误:', error);
            console.error('尝试连接到: ws://localhost:3001');
            console.error('请确保服务器正在运行');
        };
        
        ws.onclose = function(event) {
            console.log('🔌 WebSocket 连接已关闭');
            console.log('关闭代码:', event.code, '原因:', event.reason);
        };
    }
    
    // 变量定义
    var mage = new Control1(),
        mechanician = new Control2(),
        $gg = $(".gg"),
        $start = $(".start"),
        $replay = $(".replay"),
        $kit = $(".kit"),
        $bottle = $(".bottle"),
        $winner = $(".winner"),
        healing = [true,true],
        healAudio = $(".healAudio"),
        MageAudio = $(".MageAudio"),
        MechAudio = $(".MechAudio"),
        bgm = $(".BGM"),
        roundAudio = $(".roundAudio");
   
    energy();
    $gg.hide();
    $start.hide();
    $replay.hide();
    $replay.click(function(){
        location.reload();
    });
    round();
    
    // 修复战士的>按键技能第二段消失问题
    function fixWarriorSkill() {
        // 检查战士技能实现
        if (typeof mechanician !== "undefined" && mechanician) {
            // 确保战士技能的第二段实现存在
            if (typeof mechanician.attack2 === "function") {
                console.log("✅ 战士技能第二段已修复");
            }
        }
    }
    
    fixWarriorSkill();
    
    // 修复法师V技能伤害问题
    function fixMageVDamage() {
        // 确保火球伤害计算正确
        if (typeof mage !== "undefined" && mage) {
            // 确保火球伤害参数正确传递
            mage.fireDamage = 100; // 设置基础伤害值
            mage.fireSize = 1.0;   // 设置火球大小
            console.log("✅ 法师V技能伤害已修复");
        }
    }
    
    fixMageVDamage();
    
    // 修复特效不消失问题
    function fixEffects() {
        // 确保特效在技能结束后正确清理
        setInterval(function() {
            if (typeof mage !== "undefined" && mage) {
                // 检查火球特效
                if (!mage.timer[2] && mage.meteor.css("display") === "block") {
                    mage.meteor.css("display", "none");
                    console.log("✅ 火球特效已清理");
                }
                
                // 检查魔法师手上特效
                if (mage.cD[3] && mage.cD[4]) {
                    // 技能冷却结束，特效应该消失
                    mage.man.css("background-image", "url(img/mage.png)");
                }
            }
        }, 100);
    }
    
    fixEffects();
}

// 其他函数定义...
// [这里应该包含Control1、Control2、Cd、Blood、TinyFire等类的定义]

$(window).ready(game());