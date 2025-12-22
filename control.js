/*global $*/
/*jshint browser:true, esnext:true*/
//AI mode
// ===== 联机改造：操作执行器 =====

// 安全音频播放函数
//测试提交
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
//AI mode

function game(){
    var world,trun = 1;
    
    // ===== 全局基础定义（强制） =====
    var ws;               // WebSocket 实例
    var isHost = false;   // 房主 = true，其他 = false
    var st = false;       // 战斗状态（由主机控制）
    
    // WebSocket 连接
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        ws = new WebSocket('ws://localhost:3001');
        
        ws.onopen = function() {
            console.log('✅ WebSocket 连接已建立 to ws://localhost:3001');
        };
        
        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            console.log("📡 收到消息:", data);
            
            // ===== 主机结算层（Host Only）=====
            // 非主机 → 主机请求
            if (data.type === "action" && data.role === "mage" && data.action === "jump") {
                if (!isHost) return; // 非主机忽略
                
                // 主机只同步状态，不执行跳跃（跳跃已在输入层执行过）
                if (mage && mage.cD[5] && st) {
                    console.log("🏠 主机收到跳跃请求，同步状态");
                    
                    // 主机广播结果给所有人（包含当前跳跃次数）
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "sync",
                            role: "mage",
                            action: "jump",
                            jumpChance: mage.jumpChance // 同步跳跃次数状态
                        }));
                        console.log("📢 主机广播跳跃同步消息，跳跃次数:", mage.jumpChance);
                    }
                }
                return;
            }
            
            // ===== 同步播放层（sync）=====
            // 主机 → 所有人同步
            if (data.type === "sync" && data.role === "mage" && data.action === "jump") {
                // 非主机执行跳跃（主机已在输入层执行过）
                if (!isHost && mage && mage.cD[5] && st) {
                    // 同步跳跃次数状态
                    if (data.jumpChance !== undefined) {
                        mage.jumpChance = data.jumpChance;
                        console.log("🔄 同步跳跃次数:", mage.jumpChance);
                    }
                    // ✅ 非主机真正执行跳跃
                    jumping(mage);
                    console.log("🎮 非主机执行跳跃（同步）");
                }
                return;
            }
            
            // 跳跃次数恢复同步
            if (data.type === "sync" && data.role === "mage" && data.action === "jump_restore") {
                if (mage && data.jumpChance !== undefined) {
                    mage.jumpChance = data.jumpChance;
                    console.log("🔄 收到跳跃次数恢复同步，跳跃次数:", mage.jumpChance);
                }
                return;
            }
            
            // 保持原有的移动和技能同步逻辑
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
                        
                        // 初始化火球发射计数器（如果不存在）
                        if (!mage.fireBallCount) {
                            mage.fireBallCount = 0;
                        }
                        mage.fireBallCount++;
                        console.log("🔥 火球发射次数:", mage.fireBallCount);
                        
                        mage.timer[3] = setInterval(function(){
                            if(mage.fireDamage < 1500){  // 降低最大伤害到1500
                                mage.fireDamage += 75;   // 降低每次增长量到75
                                mage.fireSize += 0.04;   // 降低火球大小增长
                            } else {
                                mage.fireDamage = 1500;  // 设置最大伤害为1500
                            }
                            console.log("🔥 V技能伤害增长:", mage.fireDamage);
                        },200);
                        
                        // 1秒后自动发送 v_fire
                        setTimeout(function(){
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    type: "action",
                                    role: "mage",
                                    action: "skill",
                                    skill: "v_fire"
                                }));
                            }
                        },1000);
                    }
                } else if (data.action === "skill" && data.skill === "v_fire") {
                    if (mage && mage.cD[4]) {
                        mage.cD[4] = false;
                        mage.cD[0] = true;
                        mage.walkSpeed *= 2;
                        mage.jumpChance = 2;
                        
                        // 使用缓存的参数生成火球，并应用伤害递减
                        if (mage._vCache) {
                            let finalDamage = mage._vCache.damage;
                            let finalSize = mage._vCache.size;
                            
                            // 应用伤害递减机制
                            if (mage.fireBallCount === 2) {
                                // 第二次火球伤害减少20%
                                finalDamage = Math.floor(mage._vCache.damage * 0.8);
                                finalSize = mage._vCache.size * 0.9;  // 稍微减小火球大小
                                console.log("🔥 第二次火球: 伤害减少20% ->", finalDamage);
                            } else if (mage.fireBallCount >= 3) {
                                // 第三次及以后火球伤害减少30%
                                finalDamage = Math.floor(mage._vCache.damage * 0.7);
                                finalSize = mage._vCache.size * 0.85;  // 进一步减小火球大小
                                console.log("🔥 第三次火球: 伤害减少30% ->", finalDamage);
                            }
                            
                            spawnFireBall(
                                mage,
                                mage._vCache.dir,
                                finalDamage,
                                finalSize
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
    function Control1() {
        this.x = 300;
        this.y = 100;
        this.health = 3800;
        this.healthMax = 3800;
        this.dir = "right";
        this.xspeed = 0;
        this.yspeed = 0;
        this.xacce = 0;
        this.yacce = 0;
        this.press = [false, false];//right left
        this.timer = [];
        this.walkSpeed = 4;
        this.jumpSpeed = 19;
        this.fallSpeed = 0;
        this.jumpChance = 2;
        this.fallTrue = false;
        this.cD = [true,true,true,true,true,true];//H J K L move
        this.damage = 183;
        this.shield = 0;
        this.fireDamage = 25;
        this.drone = 0;//how many drones you distroy by fire
        this.fireSize = 1;
        this.energy = 100;
        this.final = false;
        this.servant = false;
        this.name = "mage";
        this.prisoner = false;
        this.win = 0;
        this.man = $(".one");
        this.line = $(".oo");
        this.meteor = $(".meteor");
        this.shielding = $(".shielding");
        this.health0 = $(".h10");
        this.health1 = $(".h11");
        this.shield0 = $(".shield");
        this.cD1 = $(".q");
        this.cD2 = $(".v");
        this.cD3 = $(".e");
        this.cD4 = $(".r");
        this.enLine = $(".En1");
        var self = this;

        function control() {
        $(document).keydown(function (e) {
             //a,w,d,s      65,87,68,83
             //q,c,v,e,r      81,67,68,69,82
            //console.log(e.keyCode);
            
            // 初始化音频上下文避免浏览器拦截
            if (window.AudioContext && !window.audioContextInitialized) {
                var audioContext = new AudioContext();
                audioContext.resume();
                window.audioContextInitialized = true;
            }
            
        if(self.cD[5] && st){
            if (e.keyCode === 65) {//move left - WebSocket version
                if(!self.press[0]){
                    // 发送 WebSocket 消息而不是直接移动
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "action",
                            role: "mage",
                            action: "move",
                            dir: "left"
                        }));
                    }
                }
            } else if(e.keyCode === 87){//jump - WebSocket同步版本
                // ===== 输入层 =====
                // 本地预测：立即执行 + 发送网络消息
                if (!mage || !mage.cD[5] || !st) return;

                // 检查跳跃次数是否足够
                if (mage.jumpChance <= 0) {
                    console.log("⚠️ 跳跃次数不足，无法跳跃");
                    return;
                }

                // 主机：本地预测跳跃
                if (isHost) {
                    jumping(mage);
                    console.log("🏠 主机本地执行跳跃（输入层），跳跃次数:", mage.jumpChance);
                }

                // 非主机：发请求给主机（不执行本地跳跃）
                if (!isHost && ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "action",
                        role: "mage",
                        action: "jump"
                    }));
                    console.log("📤 非主机发送跳跃动作消息");
                }

                // 主机：直接广播最终结果（包含当前跳跃次数）
                if (isHost && ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "sync",
                        role: "mage",
                        action: "jump",
                        jumpChance: mage.jumpChance // 同步跳跃次数状态
                    }));
                    console.log("📢 主机广播跳跃同步消息，跳跃次数:", mage.jumpChance);
                }
            } else if(e.keyCode === 68){//move right - WebSocket version
                if(!self.press[1]){
                    // 发送 WebSocket 消息而不是直接移动
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "action",
                            role: "mage",
                            action: "move",
                            dir: "right"
                        }));
                    }
                }
            } else if(e.keyCode === 66){//attack C
                if(self.cD[1]){
                    self.cD[1] = false;
                    self.man.css("background-image","url(img/mageAttack.png)");
                    self.shoot();
                    setTimeout(function(){self.cD[1] = true;},850);
                }
            } else if(e.keyCode === 67){//shield V
                if(self.cD[2]){
                    self.cD[2] = false;
                    self.shield += 400;
                    new Cd(8.00,self.cD2,"C");
                    setTimeout(function(){self.cD[2] = true;},8000);
                }
            } else if(e.keyCode === 88){//prisoner X
                if(self.cD[0]){
                    self.cD[0] = false;
                    self.man.css("background-image","url(img/magePrisoner.gif)");
                    safePlay(MageAudio[11]);
                    self.prisoner = true;
                    new Cd(8,self.cD1,"X");
                    setTimeout(function(){
                        if (!self.alive) return;
                        self.prisoner = false;
                        if (typeof mechanician !== "undefined" && mechanician) mechanician.cD[5] = true;
                        },1200);
                    setTimeout(function(){if (!self.alive) return; self.cD[0] = true;},8000);
                    setTimeout(function(){
                        if (!self.alive) return;
                        self.man.css("background-image","url(img/mage.png)");
                        },500);
                }
            } else if(e.keyCode === 86){//Meteor b
                if(self.cD[3]){
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "action",
                            role: "mage",
                            action: "skill",
                            skill: "v_start"
                        }));
                    }
                }
            } else if(e.keyCode === 81 && self.final) {//Servant
                safePlay(MageAudio[8]);
                setTimeout(function(){
                    safePlay(MageAudio[9]);
                },1700);
                self.final = false;
                self.servant = true;
                self.energy = 0;
                en = new Enemy();
                en.createEle();
                enymyMonster();
            }
        }
        });
        $(document).keyup(function(e){
            if(self.cD[5] && st){
                if(e.keyCode === 65){//stop left - WebSocket version
                    // 发送 WebSocket 停止消息而不是直接停止
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "action",
                            role: "mage",
                            action: "stop",
                            dir: "left"
                        }));
                    }
                } else if(e.keyCode === 68){//stop right - WebSocket version
                    // 发送 WebSocket 停止消息而不是直接停止
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "action",
                            role: "mage",
                            action: "stop",
                            dir: "right"
                        }));
                    }
                } else if(e.keyCode === 86){
                    // V键释放后等待网络消息处理
                } else if(e.keyCode === 66){
                    self.man.css("background-image","url(img/mage.png)");

                }
            }
        });
    }
    
    this.play = function(){
        if(self.dir === "left"){
            self.man.css("transform","scaleX(-1)");
        } else {
            self.man.css("transform","");
        }
        
        if(!self.cD[3] && self.cD[4]){
             self.man.css("background-image","url(img/mageFire.gif)");
        } else {
             self.man.css("background-image","url(img/mage.png)");
        }
        
        if(self.fallTrue){
            gravity(mage);
        }
        
        if(self.shield > 0){
            self.shielding.css("left", self.x + "px");
            self.shielding.css("bottom", self.y + "px");
        } else {
            self.shielding.css("bottom", "-500px");
        }
        

        if(self.energy >= 100){
            self.final = true;
            self.cD4.css("background-color", "yellow");
        } else {
            self.cD4.css("background-color", "silver");
        }

        self.man.css("left", self.x + "px");
        self.man.css("bottom", self.y + "px");
        self.health0.css("width",(self.health /10) + "px");
        self.health1.css("width",(self.health /10) - (self.shield /10) + "px");
        self.shield0.css("width",(self.health /10)+ "px");
        self.enLine.css("width",self.energy * 4  + "px");
        mapChecker(mage);
    };
        
    this.shoot = function() {
        $("#bulletBox").append("<div id='mageBullet'></div>");
        let bullet = $("#mageBullet"),
            loopTime = 0,
            dir = 1,
            speed = 20;
        if (self.dir === "left") {
            speed *= -1;
            dir = -1;
        }
        bullet.css("bottom", self.y + 40 + "px");
        function draw() {
            bullet.css("left", self.x + 25 + loopTime * speed);
            if (typeof mechanician === "undefined" || !mechanician) return;
            if (collisionCheak(mechanician.man, bullet, 202) === "coli") {//202 is the collision check number. the next shoot function can use 203
                bullet.remove();
                mechanician.health -= self.damage;
                self.energy += 4;
                let x = randomNumberAtoB(3);
                if(x === 1){
                    safePlay(MechAudio[7]);
                } else if(x === 2){
                    safePlay(MechAudio[8]);
                } else {
                    safePlay(MechAudio[9]);
                }
                if(mage.dir === mechanician.dir){
                    if (typeof mechanician !== "undefined" && mechanician) blood(mechanician, 1, 4, 5, -4);
                } else {
                    if (typeof mechanician !== "undefined" && mechanician) blood(mechanician, 1, 4, 5, 4);
                }
                return;
            }

            loopTime += 1;
            
            if (loopTime >= 30) {
                bullet.remove();
                return;
            }
            setTimeout(function() {
                draw();
            }, 10);//we can change this number as 1, to make it fastest. after that we can change the element color to be 透明 so that it will not effect. add another element if you want effect;
        }
        draw();
    };
    

    control();
    }

    function Control2() {
        this.x = 1200;
        this.y = 100;
        this.health = 4000;
        this.healthMax = 4000;
        this.dir = "left";
        this.xspeed = 0;
        this.yspeed = 0;
        this.xacce = 0;
        this.yacce = 0;
        this.press = [false, false];
        this.timer = [];
        this.walkSpeed = 5;
        this.jumpSpeed = 20;
        this.fallSpeed = 0;
        this.jumpChance = 2;
        this.fallTrue = false;
        this.cD = [true,true,true,true,true,true];//crazy attack flash grenade1 grenade2 move
        this.damage = 200;
        this.grenadeSpeed = 0;
        this.aS = 450;
        this.crazy = false;
        this.energy = 100;
        this.final = false;
        this.win = 0;
        this.name = "mechanician";
        this.man = $(".two");
        this.line = $(".tt");
        this.health0 = $(".h20");
        this.health1 = $(".h21");
        this.cD1 = $(".u");
        this.cD2 = $(".o");
        this.cD3 = $(".p");
        this.cD4 = $(".l");
        this.enLine = $(".En2");
        var you = this;

        function control() {
        $(document).keydown(function (e) {
             //left up right down   37,38,39,40
            //u,i,o,p,l   85,73,79,80,76
        if(you.cD[5] && st){
            if (e.keyCode === 37) {//move left
                if(!you.press[0]) {
                    you.dir = "left";
                    you.press[0] = true;
                    clearInterval(you.timer[1]);
                    you.timer[0] = setInterval(function(){you.x -= you.walkSpeed;},20);
                }
            } else if(e.keyCode === 38){//jump
                jumping(mechanician);
            } else if(e.keyCode === 39){//move right
                if(!you.press[1]){
                    you.dir = "right";
                    you.press[1] = true;
                    clearInterval(you.timer[0]);
                    you.timer[1] = setInterval(function(){you.x += you.walkSpeed;},20);
                }
            } else if(e.keyCode === 191){//attack ,
                if(you.cD[1]){
                    you.cD[1] = false;
                    you.line.css("bottom",you.y + 15 + "px");  
                    if(you.dir === "right"){
                        you.line.css("left",you.x + 60 +"px");    
                        you.line.css("transform","scaleX(-1)");
                    }  else {
                        you.line.css("left",(you.x - 200) +"px");   
                        you.line.css("transform","scaleX(1)");
                    }
                    if(you.crazy){
                        MechAudio[12].play();
                    } else {
                        MechAudio[11].play();
                    }
                    setTimeout(function(){you.line.css("bottom", "0px");},10);
                    hit();
                    setTimeout(function(){you.cD[1] = true;},you.aS);
                }
            } else if(e.keyCode === 188){//flash .
                if(you.cD[2]){
                    safePlay(MechAudio[4]);
                    you.cD[2] = false;
                    flash();
                    new Cd(1.2,you.cD2,",");
                    setTimeout(function(){you.cD[2] = true;},1200);
                }
            } else if(e.keyCode === 77){//crazy
                if(you.cD[0]){
                    you.cD[0] = false;
                    safePlay(MechAudio[1]);
                    crazy();
                    new Cd(6,you.cD1,"M");
                    setTimeout(function(){you.cD[0] = true;},6000);
                }
            } else if(e.keyCode === 76 && you.final) {//machineKiller
                safePlay(MechAudio[2]);
                you.final = false;
                you.energy = 0;
                killerMachineArr[killerMachineArr[killerMachineArr.length]] = new KillerMachine(you.x, 500 - you.y);
                setTimeout(function() {
                    killerMachineArr[killerMachineArr[killerMachineArr.length]] = new KillerMachine(you.x, 500 - you.y);
                }, 500);setTimeout(function() {
                    killerMachineArr[killerMachineArr[killerMachineArr.length]] = new KillerMachine(you.x, 500 - you.y);
                }, 1000);setTimeout(function() {
                    killerMachineArr[killerMachineArr[killerMachineArr.length]] = new KillerMachine(you.x, 500 - you.y);
                }, 1500);
                setTimeout(function() {
                    killerMachineArr[killerMachineArr[killerMachineArr.length]] = new KillerMachine(you.x, 500 - you.y);
                }, 2000);
            } else if(e.keyCode === 190){//Grenade
                if(you.cD[3]){
                    you.cD[3] = false;
                    you.timer[2] = setInterval(function(){
                        let x = you.grenadeSpeed;
                        if(you.dir === "left" && x > 0){
                            x *= -1;
                        }
                        x *= 9;
                        x += you.man.offset().left -70;
                        you.grenadeSpeed += 1;
                        if (you.grenadeSpeed >= 120) {
                            you.grenadeSpeed = 120;
                        }//finalchange
                        $("#speedTip").css("left", x);
                    },20);
                }
            }
        }
        });
        $(document).keyup(function(e){
            if(you.cD[5] && st){
                if(e.keyCode === 37){
                    you.press[0] = false;
                    clearInterval(you.timer[0]);
                } else if(e.keyCode === 39){
                    you.press[1] = false;
                    clearInterval(you.timer[1]);
                    } else if(e.keyCode === 190){
                        if(you.cD[4]){
                            safePlay(MechAudio[5]);
                            you.cD[4] = false;
                            
                            console.log("💣 战士.技能: 投掷手雷");
                            
                            // 创建手雷元素
                            let grenade = $('<div class="grenade">').css({
                                position: 'absolute',
                                left: (you.dir === "left" ? you.x - 30 : you.x + you.man.width()) + 'px',
                                bottom: (you.y + you.man.height() * 0.5) + 'px',
                                width: '45px',
                                height: '45px',
                                backgroundImage: 'url(img/steve.art/grenade' + randomNumberAtoB(3) + '.png)',
                                backgroundSize: 'cover',
                                zIndex: 999
                            });
                            
                            $('body').append(grenade);
                            
                            // 手雷投掷动画
                            let grenadeX = parseInt(grenade.css('left'));
                            let grenadeY = parseInt(grenade.css('bottom'));
                            let throwSpeed = you.grenadeSpeed * 0.5 + 10; // 基础速度 + 蓄力加成
                            let throwDirection = you.dir === "left" ? -1 : 1;
                            let gravity = 2;
                            let velocityY = 15;
                            
                            let throwInterval = setInterval(function() {
                                grenadeX += throwSpeed * throwDirection;
                                grenadeY -= velocityY;
                                velocityY -= gravity;
                                
                                grenade.css({
                                    left: grenadeX + 'px',
                                    bottom: grenadeY + 'px'
                                });
                                
                                // 碰撞检测：魔法师
                                if (typeof mage !== "undefined" && mage && st) {
                                    let mageRect = mage.man[0].getBoundingClientRect();
                                    let grenadeRect = grenade[0].getBoundingClientRect();
                                    
                                    if (grenadeRect.left < mageRect.right &&
                                        grenadeRect.right > mageRect.left &&
                                        grenadeRect.top < mageRect.bottom &&
                                        grenadeRect.bottom > mageRect.top) {
                                        
                                        clearInterval(throwInterval);
                                        
                                        // 直接命中爆炸
                                        createExplosion(grenadeX, grenadeY + 30);
                                        grenade.remove();
                                        
                                        // 直接命中伤害
                                        let directHitDamage = 200 + you.grenadeSpeed * 2; // 蓄力越久伤害越高
                                        console.log("💥 手雷直接命中法师! 伤害:", directHitDamage);
                                        
                                        if (mage.shield > 0) {
                                            mage.shield -= directHitDamage;
                                        } else {
                                            mage.health -= directHitDamage;
                                        }
                                        
                                        // 击退效果
                                        blood(mage, 1, 5, 3, (mageRect.left < grenadeRect.left) ? -3 : 3);
                                        
                                        // 音效
                                        safePlay(MechAudio[0]);
                                        let sound = randomNumberAtoB(3);
                                        if (sound === 1) safePlay(MageAudio[2]);
                                        else if (sound === 2) safePlay(MageAudio[3]);
                                        else safePlay(MageAudio[4]);
                                        
                                        // 能量恢复
                                        you.energy += Math.ceil(directHitDamage / 25);
                                    }
                                }
                                
                                // 碰撞检测：地面或边界
                                if (grenadeY <= 100 || grenadeX < 0 || grenadeX > 1500) {
                                    clearInterval(throwInterval);
                                    
                                    // 地面爆炸效果
                                    createExplosion(grenadeX, grenadeY + 30);
                                    grenade.remove();
                                }
                            }, 30);
                            
                            you.grenadeSpeed = 0;
                            new Cd(8,you.cD3,".");
                            clearInterval(you.timer[2]);
                            setTimeout(function(){
                                $("#speedTip").css("left", "-500px");
                            },200);
                            setTimeout(function(){
                                you.cD[4] = true;
                                you.cD[3] = true;
                            },8000);
                        }
                }
            }
        });
    }
         
    function hit(){
        var dam = you.damage;
        if (typeof mechanician === "undefined" || !mechanician) return;
        if(collisionCheak(mage.man,you.line,400) === "coli"){
            if(you.dir === "left"){
                dam -= Math.ceil(you.x - mage.x);
            } else {
                dam -= Math.ceil(mage.x - you.x - 50);
            }

            you.energy += Math.ceil(dam / 20);
            if(mage.dir === mechanician.dir){
                blood(mage, 1, Math.ceil(dam / 40), Math.ceil(dam / 35), -Math.ceil(dam / 35));
            } else {
                blood(mage, 1, Math.ceil(dam / 40), Math.ceil(dam / 35), Math.ceil(dam / 35));
            }
            if(dam > 150){
                let x = randomNumberAtoB(3);
                if(x === 1){
                    safePlay(MageAudio[2]);
                } else if(x === 2){
                    safePlay(MageAudio[3]);
                } else {
                    safePlay(MageAudio[4]);
                }
            }
            mage.shield -= dam;
            if(mage.shield < 0){
                console.log(dam);
                mage.health += mage.shield;
                mage.shield = 0;
            }
        }
        if(mage.servant && collisionCheak(en.man,you.line,401) === "coli"){
            en.beDamaged(you.damage - Math.ceil(you.x - en.x));
            blood(en, 1, 5, 5, 5);
        }
    }
        
        this.play = function(){
            if(you.dir === "right"){
                you.man.css("transform","scaleX(-1)");
            } else {
                you.man.css("transform","");
            }
            
            if((you.press[0] || you.press[1]) && !you.fallTrue && !you.crazy){
                you.man.css("background-image","url(img/mechanicianMove.gif)");
            } else if(you.fallTrue && !you.crazy){
                you.man.css("background-image","url(img/mechanicianJump.gif)");
            } else if(!you.press[0] && !you.press[1] && !you.fallTrue && !you.crazy){
                you.man.css("background-image","url(img/mechanician.png)");
            }else if((you.press[0] || you.press[1]) && !you.fallTrue && you.crazy){
                you.man.css("background-image","url(img/crazy/mechanicianMove.gif)");
            } else if(you.fallTrue && you.crazy){
                you.man.css("background-image","url(img/crazy/mechanicianJump.gif)");
            } else if(!you.press[0] && !you.press[1] && !you.fallTrue && you.crazy){
                you.man.css("background-image","url(img/crazy/mechanician.png)");
            }
            
            if(mage.prisoner && !you.crazy){
                you.man.css("background-image","url(img/mechanicianPrisoner.png)");
                you.cD[5] = false;
                clearInterval(you.timer[0]);
                clearInterval(you.timer[1]);
            } else if(mage.prisoner && you.crazy){
                you.man.css("background-image","url(img/crazy/mechanicianPrisoner.png)");
                you.cD[5] = false;
                clearInterval(you.timer[0]);
                clearInterval(you.timer[1]);
            }
            
            if(you.fallTrue){
                gravity(mechanician);
            }
            
            if(you.energy >= 100){
                you.final = true;
                you.cD4.css("background-color", "yellow");
            } else {
                you.cD4.css("background-color", "silver");
            }
            
            you.man.css("left",you.x + "px");
            you.man.css("bottom",you.y + "px");
            you.health0.css("width",you.health /10 + "px");
            you.health1.css("width",you.health /10 + "px");
            you.enLine.css("width",you.energy * 4  + "px");
            mapChecker(mechanician);
        };
        
        function flash(){
            if(you.dir === "right"){
                you.x += 180;
            } else {
                you.x -= 180;
            }
        }
    
        function crazy(){
            if (window.mechanician) blood(mechanician, 2, 7, 6, 6);
            you.crazy = true;
        you.damage *= 1.5;
        you.jumpSpeed *= 1.5;
        you.walkSpeed *= 1.5;
        you.aS /= 2;
        you.health -= you.health * 0.2;
        setTimeout(function(){
            you.crazy = false;
            you.damage = 200;
            you.jumpSpeed = 20;
            you.walkSpeed = 10;
            you.aS =300;
        },3000);
    }
        control();
    }

    function Cd(time,target,press){
        var timer;
        target.css("background-color","silver");
        target.html(time);
        if(time > 10){
            timer = setInterval(function(){
            if(time > 10){
                time -= 1;
                target.html(time);
            } else {
                clearInterval(timer);
                clock();
            }},1000);
        } else {
            clock();
        }
        function clock(){
            timer = setInterval(function(){
                if(time != 0.1){
                    time = (time -= 0.1).toFixed(1);
                    target.html(time);
                } else {
                    target.html(press);
                    target.css("background-color","aqua");
                    clearInterval(timer);
                }
            },100);
        }
    }

    function jumping(check){
        if(check.jumpChance === 2){
            check.jumpChance -= 1;
            check.fallTrue = true;
            check.fallSpeed = check.jumpSpeed;
        } else if(check.jumpChance === 1){
            check.jumpChance -= 1;
            check.fallTrue = true; // 添加这一行，确保进入跳跃状态
            check.fallSpeed = check.jumpSpeed;
        }
    }

    function mapChecker(check){
        if(check.y == 350 && check.x >= 360 && check.fallSpeed === 0){
            check.fallTrue = true;
            check.jumpChance = 1;
        } else if(check.y == 450 && check.x <= 1020 && check.fallSpeed === 0 ){
            check.fallTrue = true;
            check.jumpChance = 1;
        } else if(check.y == 450 && check.x >= 1430 && check.fallSpeed === 0 ){
            check.fallTrue = true;
            check.jumpChance = 1;
        } else if(check.x <= -25){
            check.x = -25;
        } else if(check.x >= 1450){
            check.x = 1450;
        } else if(check.y >= 680){
            check.fallSpeed = -1;
        } else if(check.x >= 1260 && check.x <= 1320 && check.y >= 450 && check.y <= 600){
            medical(check,2);
        } else if(check.x >= 155 && check.x <= 210 && check.y >= 100 && check.y <= 150){
            medical(check,1);
        }
    }

    function gravity(jump){
            jump.fallSpeed -= 1;
            jump.y += jump.fallSpeed;
            if(jump.fallSpeed < 0){
                let jumpChanceRestored = false;
                
                if(jump.y <= 100){
                    jump.fallTrue = false;
                    if (jump.jumpChance !== 2) {
                        jump.jumpChance = 2;
                        jumpChanceRestored = true;
                    }
                    jump.fallSpeed = 0;
                    jump.y = 100;
                } else if(jump.y >= 320 && jump.y <= 350 && jump.x <= 360){
                    jump.fallTrue = false;
                    if (jump.jumpChance !== 2) {
                        jump.jumpChance = 2;
                        jumpChanceRestored = true;
                    }
                    jump.fallSpeed = 0;
                    jump.y = 350;
                } else if(jump.y >= 420 && jump.y <= 450 && jump.x > 1020 && jump.x < 1430){
                    jump.fallTrue = false;
                    if (jump.jumpChance !== 2) {
                        jump.jumpChance = 2;
                        jumpChanceRestored = true;
                    }
                    jump.fallSpeed = 0;
                    jump.y = 450;
                }
                
                // 如果跳跃次数被恢复，且是主机，则广播状态同步
                if (jumpChanceRestored && isHost && jump.name === "mage" && ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "sync",
                        role: "mage",
                        action: "jump_restore",
                        jumpChance: 2
                    }));
                    console.log("🔄 主机广播跳跃次数恢复同步");
                }
            }
    }
    
    function energy(){
        if(!mage.final && mage.energy !== 100 && !mage.servant && st){
            mage.energy += 1;
        }
        
        if(typeof mechanician !== "undefined" && mechanician && !mechanician.final && mechanician.energy !== 100 && st){
            mechanician.energy += 1;
        }
        setTimeout(function(){energy();},1500);
    }
    
    function medical(check,num){
        if(check.health !== check.healthMax){
            if(num === 1 && healing[0]){
                safePlay(healAudio[0]);
                healing[0] = false;
                $bottle.css("opacity","0");
                if(check.health + 400 > check.healthMax){
                    check.health = check.healthMax;
                } else {
                    check.health += 400;
                }
                setTimeout(function(){
                    healing[0] = true;
                    $bottle.css("opacity","1");
                },6000);
            } else if(num === 2 && healing[1]){
                safePlay(healAudio[0]);
                healing[1] = false;
                $kit.css("opacity","0");
                if(check.health + 800 > check.healthMax){
                    check.health = check.healthMax;
                } else {
                    check.health += 800;
                }
                setTimeout(function(){
                    healing[1] = true;
                    $kit.css("opacity","1");
                },15000);
            }
        }
    }

    function draw(){
        mage.play();
        if (typeof mechanician !== "undefined" && mechanician) {
            mechanician.play();
        }
        if(mage.servant){
            enymyMonster();
        }
        // 游戏结束检测 - 修复逻辑
        if(mage.health <= 0 && st){
            console.log("🎮 游戏结束: 魔法师失败");
            safePlay(MechAudio[10]);
            setTimeout(function(){
                safePlay(MageAudio[5]);
            },2500);
            death(mechanician);  // 魔法师死亡，战士胜利
        } else if(window.mechanician && mechanician && mechanician.health <= 0 && st){
            console.log("🎮 游戏结束: 战士失败");
            safePlay(MageAudio[6]);
            setTimeout(function(){
                safePlay(MechAudio[6]);
            },2500);
            death(mage);  // 战士死亡，魔法师胜利
        }
    }

    function death(who){
        bgm[0].pause();
        st = false;
        trun += 1;
        who.win += 1;
        mage.energy = 0;
        if (typeof mechanician !== "undefined" && mechanician) mechanician.energy = 0;
        if(who.name === "mage"){
            $(".Ma").css("display","inline-block");
        } else {
            $(".Me").css("display","inline-block");
        }
        clearInterval(world);
        if(mage.servant){
            en.alive = false;
        }
        $winner.html("<p>"+ who.name + " win!</p>");
        $gg.show();
        
        if(who.win !== 2){
             setTimeout(function(){
                $gg.hide();
                round();
            },5500);
        } else {
            $winner.css("color","red");
            $replay.show();
        }
    }

    function round(){
        safePlay(bgm[0]);
        comboShoot = new ComboShoot(0);
        // ComboShoot 内部已经有定时爆炸，不需要手动调用 boom()
        $start.show();
        safePlay(roundAudio[trun - 1]);
        $start.html("<p>Round " + trun + " </p>");
        setTimeout(function(){
            safePlay(roundAudio[3]);
            $start.html("<p>Fight!</p>");
        },2000);
        setTimeout(function(){
            $start.hide();
            mage.energy = 0;
            if (typeof mechanician !== "undefined" && mechanician) mechanician.energy = 0;
            st = true;
            world = setInterval(draw,15);
        },3000);
        if(trun === 3){
            mage.x = 300;
            mage.dir = "right";
            if (typeof mechanician !== "undefined" && mechanician) {
                mechanician.x = 1200;
                mechanician.dir = "left";
            }
        } else if(trun === 2){
            mage.x = 1200;
            mage.dir = "left";
            if (typeof mechanician !== "undefined" && mechanician) {
                mechanician.x = 300;
                mechanician.dir = "right";
            }
        }
        mage.health = mage.healthMax;
        if (typeof mechanician !== "undefined" && mechanician) mechanician.health = mechanician.healthMax;
        mage.shield = 0;
        mage.final = false;
        if (typeof mechanician !== "undefined" && mechanician) mechanician.final = false;
        if (typeof mechanician !== "undefined" && mechanician) mechanician.y = 100;
        if (typeof mechanician !== "undefined" && mechanician) mechanician.walkSpeed = 5;
        mage.y = 100;
    }
    
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
   
    // 火球生成函数
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
    
    energy();
    $gg.hide();
    $start.hide();
    $replay.hide();
    $replay.click(function(){
        location.reload();
    });
    round();
    
    $("#aiBox").append("<div id='iceShoot'></div>");
    $("#aiBox").append("<div id='boomShoot'></div>");
    var comboShoot;
    function ComboShoot(getSpeed) {//back3
        this.have = $("#iceShoot");
        this.valid = !!window.mechanician;
        if (!this.valid) {
            this.alive = false;
            return this;
        }
        if (typeof mechanician === "undefined" || !mechanician) {
            this.valid = false;
            this.alive = false;
            return this;
        }
        if (typeof mechanician === "undefined" || !mechanician) {
            this.x = 0;
            this.y = 0;
        } else {
            if (typeof mechanician === "undefined" || !mechanician) {
                this.x = 0;
                this.y = 0;
            } else {
                this.x = mechanician.man.offset().left - 90;
                this.y = mechanician.man.offset().top + 30;
            }
        }
        this.coliCheakNumber = 300;//use 300 to check ice, use 301 to check boom
        this.xspeed = getSpeed * 0.2;
        this.yspeed = -20;
        this.xacce = 0;
        this.yacce = 1;
        this.effectNumber = randomNumberAtoB(3);//effectNumber is a random number from 0 to 3 (inclusive);

        this.alive = true;
        this.degree = 0;
        this.hasHit = false;  // 防止重复伤害
        
        // 攻击类型数组映射
        this.attacks = [
            this.attack0,
            this.attack1,
            this.attack2,
            this.attack3
        ];
        
        // 统一生命周期管理
        this.destroy = function() {
            if (!self.alive) return;
            self.alive = false;
            self.x = 0;
            self.y = 0;
            self.have.hide();
        };
        
        var self = this;
        self.have.show();
        if (typeof mechanician !== "undefined" && mechanician && mechanician.dir === "left") {
            self.xspeed *= -1;
        }
        self.have.css("background-image", "url(img/steve.art/grenade" + self.effectNumber + ".png)");

        this.attack0 = function() {//bleeding 300 dmg
            blood(mage, 12, 5, 5, 5);
            let n = 0;
            let timer = setInterval(function() {
                //changed
                if (mage.shield > 0) {
                    mage.shield -= 2;
                } else {
                    mage.health -= 2;
                }
                //!
                n += 1;
                if (n === 300) {
                    clearInterval(timer);
                }
            }, 20);

        };

        this.boom = function() {
            if(st){
                safePlay(MechAudio[0]);
            }
            self.have.css("transition", "0.1s");
            self.have.css("filter", "opacity(0.5)");
            self.have.css("width", "200px");
            self.have.css("height", "200px");
            self.xspeed = 0;
            self.xacce = 0;
            self.x -= 100;
            self.y -= 100;
            self.have.css("left", self.x + "px");
            self.have.css("top", self.y + "px");
            
            // 爆炸时立即造成伤害
            if (collisionCheak(mage.man, self.have, 303) === "coli") {
                self.hit("mage");
            }
            
            setTimeout(function() {
                self.destroy();
                self.have.css("transition", "none");
                self.have.css("filter", "opacity(1)");
                //changed: 30px to 60px, 60 to 30, 30 to 45
                self.have.css("width", "45px");
                self.have.css("height", "45px");
            }, 100);
        };
        this.attack1 = function() {//ban jump 100 dmg
            blood(mage, 3, 10, 3, 3);
            if (mage.shield > 0) {
                mage.shield -= 500;
            } else {
                mage.health -= 500;
            }
            if (mage.shield < 0) {
                mage.health += mage.shield;
                mage.shield = 0;
            }
            if (typeof mechanician !== "undefined" && mechanician) {
                let no = mage.walkSpeed,
                    yes = mechanician.walkSpeed;
                mage.walkSpeed *= 0.5;
                mechanician.walkSpeed *= 1.8;
                mage.jumpChance = 0;
                setTimeout(function() {
                    mage.walkSpeed = no;
                    if (typeof mechanician !== "undefined" && mechanician) mechanician.walkSpeed = yes;
                    mage.jumpChance = 2;
                }, 3000);
            }
        };

        this.attack2 = function() {//-700 + 500
            blood(mage, 3, 10, 3, 3);
            if (mage.shield > 0) {
                mage.shield -= 1400;
            } else {
                mage.health -= 1400;
            }
            if (mage.shield < 0) {
                mage.health += mage.shield;
                mage.shield = 0;
            }

            setTimeout(function() {
                mage.health += 500;
                if (mage.health >= 3800) {
                    mage.health = 3800;
                }
            }, 6000);

        };

        this.attack3 = function() {//give out healing
            var atk3loopTime = 0;
            blood(mage, 5, 5, 5, 3);
            function atk3loop() {

                if (mage.shield > 0) {
                    mage.shield -= 60;
                } else {
                    mage.health -= 60;
                }
                if (mage.shield < 0) {
                    mage.health += mage.shield;
                    mage.shield = 0;
                }
                for (let n = 0; n <= randomNumberAtoB(3); n +=1) {
                    fireContainer[fireContainer.length] = new TinyFire(mage.x, 600 - mage.y, fireContainer.length, "B");
                }
                atk3loopTime += 1;
                if (atk3loopTime >= 10) {
                    return;
                }
                setTimeout(function() {
                    atk3loop();
                }, 100);
            }
            atk3loop();
        };
        
        this.hit = function(situation) {
            // 防止重复伤害
            if (situation === "mage" && self.hasHit) return;
            
            if (situation === "ground" && st) {
                for (let n = 0; n <= randomNumberAtoB(50); n +=1) {
                    fireContainer[fireContainer.length] = new TinyFire(self.x + 100, self.y + 70, fireContainer.length, "B");
                }
            }
            if (situation === "mage" && st) {
                self.hasHit = true;  // 标记已造成伤害
                
                // 使用数组映射执行攻击
                let attackFunc = self.attacks[self.effectNumber];
                if (attackFunc) attackFunc();
                
                if (st) {
                    safePlay(MechAudio[0]);
                }
                if (typeof mechanician !== "undefined" && mechanician) mechanician.energy += 23;
                self.destroy();
            }
            if (situation === "servant" && st) {
                if (typeof mechanician !== "undefined" && mechanician) mechanician.energy += 15;
                en.beDamaged(500);
                blood(en, 1, 10, 10, 9);
                self.x = 0;
                self.y = 0;
                self.have.hide();
                self.alive = false;
            }
            
        };
        
        this.draw = function() {
            if (self.xspeed > 0) {
                self.degree += 5;
            } else {
                self.degree -= 5;
            }
            
            self.have.css("transform", "rotate(" + self.degree + "deg)");
            if (collisionCheak(mage.man, self.have, 303) === "coli") {
                self.hit("mage");
            }
            if (collisionCheak($(".ground"), self.have, 304) === "wcoli") {
                self.xspeed *= 0.6;
                if (self.yspeed <= 5) {
                    self.yspeed = 0;
                    self.yacce = 0;
                    setTimeout(function() {
                        self.xacce = 0;
                        self.xspeed = 0;
                    }, 700);
                } else {
                    self.yspeed *= - 0.6;
                }
            }
            if (en !== undefined) {
                if (en.alive) {
                    if (collisionCheak(en.man, self.have, 305) === "coli") {
                        self.hit("servant");
                    }   
                }
            }
            self.x += self.xspeed;
            self.xspeed += self.xacce;
            self.y += self.yspeed;
            self.yspeed += self.yacce;
            self.have.css("left", self.x + "px");
            self.have.css("top", self.y + "px");
            
            if (self.x <= 10 || self.x >= 1450) {
                
                self.xspeed *= -1;
            }
        };
        function loop() {
            
            if (!self.alive) {
                return;
            }
            self.draw();
            setTimeout(function() {
                loop();
            }, 15);
        }
        loop();
        setTimeout(function() {
            if (!self.alive) return;
            self.boom();
            self.hit("ground");
        }, 2000);
    }
    
    //Mechanician L skill///////////////////////////////////////////////////////////////////////////
    var machinePopulation = 0;
    function KillerMachine(setx, sety) {
        var self = this;
        this.x = setx;
        this.y = sety;
        this.xspeed = 0;
        this.yspeed = 0;
        this.xacce = 0;
        this.yacce = 1;
        this.xMaxSpeed = 10;
        this.tarPlayer = mage;
        this.number = machinePopulation + 10000;
        this.air = true;
        this.jumpChance = 0;
        this.isStop = false;
        this.alive = true;
        this.health = 360;
        
        
        setTimeout(function() {
            if (!self.alive) return;
            self.disapare();
        }, 8000);
        
        this.createEle = function() {
            $("#aiBox").append("<div class = 'killerM killerM" + machinePopulation + "'></div>");//the class 'killerM' is used to mark every machines.
            $("#aiBox").append("<div class = 'machineHealth' id='machineHealth" +  machinePopulation + "'></div>");
            $("#aiBox").append("<div class = 'machHealContainer' id = 'machHealContainer" + machinePopulation + "'></div>");
            self.man = $($(".killerM" + machinePopulation));
            self.healthEle = $("#machineHealth" + machinePopulation);
            self.healthContainEle = $("#machHealContainer" + machinePopulation);
            machinePopulation += 1;
        };
        this.createEle();
        
        this.damage = function() {
            if (collisionCheak(self.tarPlayer.man, self.man, 50000 + self.number) === "coli") {
                mage.shield -= 800;
                if(mage.shield < 0){
                    self.tarPlayer.health += mage.shield;
                    mage.shield = 0;
                }
                self.disapare();
            }
        };
        
        this.beDamaged = function(getDamage) {
            self.health -= getDamage;
            self.healthEle.css("width", self.health / 3.6 + "px");
            if (self.health <= 0) {
                self.disapare();
            }
        };
        
        
        this.jump = function() {
            if (self.jumpChance === 0) {
                return "";
            }
            if (mage.y > 300) {
                self.yspeed = -35;
            } else {
                self.yspeed = -30;    
            }
            if (mage.y > 400) {
                self.yspeed = -40;
            }
            self.yacce = 2;
            self.jumpChance = 0;
        };
        
        this.disapare = function() {
            if(st){
                let x = randomNumberAtoB(3);
                if(x === 1){
                    safePlay(MageAudio[2]);
                } else if(x === 2){
                    safePlay(MageAudio[3]);
                } else {
                    safePlay(MageAudio[4]);
                }
                safePlay(MechAudio[3]);
                safePlay(MechAudio[13]);
            }
            self.healthEle.remove();
            self.man.remove();  
            self.healthContainEle.remove();
            self.alive = false;
        };
        
        this.stop = function() {
            if (self.jumpChance === 0) {
                return "";
            }
            self.jumpChance = 0;
            self.xMaxSpeed = 0;
            self.man.css("width", "40px");
            self.man.css("border-radius", "100px");
            self.man.css("transition", "0.5s");
            self.isStop = true;
            setTimeout(function() {
                self.jumpChance = 1;
                self.xMaxSpeed = 10;
                self.man.css("width", "80px");
                self.man.css("border-radius", "0px");
                self.man.css("transition", "none");
                self.isStop = true;
            }, 800);
        };
        
        
        this.fall = function() {
            if (collisionCheak($($(".ground")[0]), self.man, 201) === "wcoli") {
                self.yspeed = 0;
                self.yacce = 0;
                self.jumpChance = 1;
                self.y = parseInt($($(".ground")[0]).css("top"), 10) - self.man.height() - 1;
            }  
        };
        
        this.draw = function() {
            self.damage();
            self.fall();
            self.chase();
            self.x += self.xspeed;
            self.xspeed += self.xacce;
            self.y += self.yspeed;
            self.yspeed += self.yacce;
            if (self.x <= 10 || self.x >= 1450) {
                self.xspeed *= -1;
            }
            self.man.css("left", self.x + "px");
            self.man.css("top", self.y + "px");
            self.healthEle.css("left", self.x - 10 + "px");
            self.healthEle.css("top", self.y - 15 + "px");
            self.healthContainEle.css("left", self.x - 11 + "px");
            self.healthContainEle.css("top", self.y - 16 + "px");
        };
        this.chase = function() {
            if (self.x < self.tarPlayer.x) {
                self.xacce = 0.2;
            } else {
                self.xacce = -0.2;
            }
            if (self.xspeed > self.xMaxSpeed) {
                self.xspeed = self.xMaxSpeed;
            } else if (self.xspeed < -self.xMaxSpeed) {
                self.xspeed = -self.xMaxSpeed;
            }
        };
        
        this.beHitten = function() {
            if (collisionCheak(self.man, $("#mageBullet"), self.number + 10000)) {
                $("#mageBullet").remove();
                self.beDamaged(mage.damage);
            } else if(collisionCheak(self.man, mage.meteor, self.number + 700)){
                self.disapare();
                mage.drone += 1;
            }
        };
        
        function loop() {
            safePlay(MechAudio[13]);
            if (!self.alive) {
                return;
            }
            self.beHitten();
            if (randomNumberAtoB(50) === 1) {
                self.jump();
            }
            if (randomNumberAtoB(100) === 1) {
                self.stop();
            }
            
            self.draw();
            setTimeout(function() {
                loop();
            }, 15);
        }
        loop();
    }
    var killerMachineArr = [];
    
    //killerLoop();    
    
    //Mechanician L skill///////////////////////////////////////////////////////////////////////////
    
    
    
    
    //Mage R skill//////////////////////////////////////////////////////////////////////////////////
    var enymyPopulation = 0;//this variable is used to count the number of enymies
    var fireContainer = [];
    function TinyFire(getx, gety, fireNum, type) {
        if (type === "B") {
            this.x = getx;
            this.y = gety;
        } else {
            this.x = getx + en.man.width()/2;
            this.y = gety + en.man.height()/2;
        }
        
        if (typeof mechanician === "undefined" || !mechanician) {
            this.tarx = 0;
            this.tary = 0;
            this.xspeed = 0;
            this.yspeed = 0;
        } else {
            this.tarx = mechanician.x;
            this.tary = mechanician.y;
            this.xdis = this.tarx - this.x;
            this.ydis = this.tary - this.y;
            this.xspeed = this.xdis/40;
            this.yspeed = -randomNumberAtoB(40);
        }
        this.yacce = 1;
        this.damage = 200;
        var self = this,
            number = fireNum;
        
        $("#fireBox").append("<div class='fireBlock fire" + number + "'></div>");
        this.man = $($(".fire" + fireNum)[0]); 
        
        
        if (type === "B") {
            self.damage = -100;
            self.man.css("background-color", "green");
        }
        
        
        this.draw = function() {
            if (self.x <= 10 || self.x >= 1450) {
                self.man.css("transform","scaleX(-1)");
                self.man.css("transform","rotate(110deg)");
                self.xspeed *= -1;
            }
            self.yspeed += self.yacce;
            self.x += self.xspeed;
            self.y += self.yspeed;
            self.man.css("left", self.x + "px");
            self.man.css("top", self.y + "px");
        };
        
        this.boom = function() {
            safePlay(MageAudio[10]);
            self.man.css("transition", "0.3s");
            self.man.css("filter", "opacity(0.5)");
            self.man.css("background-image","none");
            self.man.css("background-color", "rgb(109, 103, 136)");
            self.man.css("width", "200px");
            self.man.css("height", "200px");
            self.x -= 100;
            self.y -= 100;
            self.draw();
            setTimeout(function() {
                self.man.remove();
            }, 300);
        };
        
        this.loop = function() {
            self.draw();
            if (typeof mechanician !== "undefined" && mechanician) {
                if (collisionCheak(mechanician.man, self.man, 300000 + number) === "coli") {
                    mechanician.health -= self.damage;
                    if (mechanician.health >= 4000) {
                        mechanician.health = 4000;
                    }
                    self.boom();
                    return;
                }
            }
            if (self.y > 570) {
                self.boom();
                return;
            }
            setTimeout(function() {self.loop();}, 15);
        };
        this.loop();
        
    }
    //Mage R skill//////////////////////////////////////////////////////////////////////////////////
    function Enemy() {
        var self = this;
        this.trun = trun;
        this.x = mage.man.offset().left - 100;
        this.y = mage.man.offset().top - 50;
        this.xspeed = 0;
        this.yspeed = 0;
        this.xacce = 0;
        this.yacce = 0;
        this.xMaxSpeed = 1;
        this.master = mage;
        this.chasePoint = self.master.x - 100;
        this.tarPlayer = typeof mechanician !== "undefined" && mechanician ? mechanician : null;
        this.shootTime = 10;
        this.reloadTime = 150;
        this.loopCount = 0;
        this.health = 1000;
        this.alive = true;
        this.dir = "left";
        
        mage.shield += 1000;
        $("#aiBox").append("<div id='servantHealth' class='servantData'></div>");
        $("#aiBox").append("<div id='servantHealthBox' class='servantData'></div>");
        this.containEle = $("#servantHealthBox");
        this.healthEle = $("#servantHealth");
        
        function heal() {
            if (!self.alive) {
                return;
            }
            mage.health += 180;
            if (mage.health > 3800) {
                mage.health = 3800;
            }
            setTimeout(function() {
                heal();
            }, 2000);
        }
        heal();
        
        this.beDamaged = function(getDamage) {
            self.health -= getDamage;
            self.healthEle.css("width", self.health / 10 + "px");
            if (self.health <= 0) {
                self.alive = false;
            }
        };
        
        this.chase = function() {
            if(self.master.dir === "left"){
                self.chasePoint = self.master.x + 150;
            } else {
                self.chasePoint = self.master.x - 100;
            }
            
            if(self.x <= self.chasePoint + 1 && self.x >= self.chasePoint - 1){
                self.xspeed = 0;
                if(self.x < self.tarPlayer.x){
                    self.man.css("transform","scaleX(1)");
                } else {
                    self.man.css("transform","scaleX(-1)");
                }
            } else if(self.x < self.chasePoint - 1){
                self.xspeed = 1;
                self.man.css("transform","scaleX(1)");
            } else if(self.x > self.chasePoint + 1){
                self.xspeed = -1;
                self.man.css("transform","scaleX(-1)");
            }
            if (self.xspeed > 0) {
                self.dir = "right";
            } else {
                self.dir = "left";
            }
        };
        
        
        
        this.damage = function() {
            if (self.tarPlayer && collisionCheak(self.tarPlayer.man, self.man, 100) === "coli") {
                self.tarPlayer.health -= 5;
            }
        };
        
        this.fall = function() {
            if (collisionCheak($($(".ground")[0]), self.man, 200) === "wcoli") {
                self.yspeed = 0;
                self.yacce = 0;
                self.y = parseInt($($(".ground")[0]).css("top"), 10) - self.man.height() - 1;
            }
        };
        
        this.jump = function() {
            this.yspeed = -15;
            this.yacce = 1;
        };
        
        
        this.createEle = function() {
            $("#aiBox").append("<div class = 'enemy ene" + enymyPopulation + "'></div>");//the class 'ene' is used to mark every enymies.
            self.man = $($(".ene" + enymyPopulation));
        };
        this.draw = function() {
            self.healthEle.css("left", self.x - 10 + "px");
            self.healthEle.css("top", self.y - 30 + "px");
            self.containEle.css("left", self.x - 10 + "px");
            self.containEle.css("top", self.y - 30 + "px");
            self.damage();
            self.chase();
            self.x += self.xspeed;
            self.y += self.yspeed;
            self.yspeed += self.yacce;
            self.man.css("left", self.x + "px");
            self.man.css("top", self.y + "px");
        };
        
        this.larch = function() {
            self.loopCount += 1;
            if (self.loopCount < self.shootTime) {
                fireContainer[fireContainer.length] = new TinyFire(self.x, self.y, fireContainer.length);    
            }
            if (self.loopCount === self.reloadTime) {
                this.loopCount = 0;
            }
        };
        this.jump();
    }
    //Mage R skill//////////////////////////////////////////////////////////////////////////////////
    
    var en;
    function enymyMonster() {
        if (!en.alive) {
            if(en.trun === trun){
                MageAudio[7].play();
            }
            en.man.remove();
            en.healthEle.remove();
            en.containEle.remove();
            mage.servant = false;
            return;
        }
        if (randomNumberAtoB(80) === 1) {
            en.jump();
        }
        
        
        en.larch();
        en.fall();
        en.draw();
    }
    //mage R skill//////////////////////////////////////////////////////////////////////////////////
    
    var bloodArr = [],
        bloodNumber = 0;
    function Blood(getx, gety, getheight, getdistance) {
        this.x = getx;
        this.y = gety;
        this.xacce = 0;
        this.yacce = -1;
        this.xspeed = getdistance + randomNumberAtoB(getdistance);
        this.yspeed = getheight + randomNumberAtoB(getheight);
        this.number = bloodNumber;
        bloodNumber += 1;
        var self = this;
        $("#bloodBox").append("<div class='blood" + self.number + "'></div>");
        this.man = $(".blood" + self.number);
        
        this.draw = function() {
            self.x += self.xspeed;
            self.y += self.yspeed;
            self.yspeed += self.yacce;
            self.xspeed += self.xacce;
            self.man.css("left", self.x);
            self.man.css("bottom", self.y);
        };
        
        function loop() {
            self.draw();
            if (self.y <= 50) {
                setTimeout(function() {
                    self.man.remove();
                }, 8000 + randomNumberAtoB(2000));
                return;
            }
            setTimeout(function() {
                loop();
            }, 15);
        }
        loop();
    }
    function blood(chara, time, value, ygo, xgo) {
        var count = 0;
        function loop() {
            for (let n = 0; n < value; n += 1) {
                let inputx = -xgo;
                if (chara.dir === "left") {
                    inputx *= -1;
                }
                let yn = chara.y;
                if (chara === en) {
                    console.log("enemy");
                    yn = 600 - yn;
                }
                bloodArr[bloodArr.length] = new Blood(chara.x + 25, yn, ygo, inputx);
            }
            
            count += 1;
            if (count >= time) {
                
                return;
            }
            setTimeout(function() {
                loop();
            }, 500);
        }
        loop();
    }
    comboShoot = new ComboShoot(0);
    // ComboShoot 内部已经有定时爆炸，不需要手动调用 boom()
}
$(window).ready(game());