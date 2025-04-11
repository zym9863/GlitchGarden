import p5 from 'p5';

// 渲染系统
class PlantSystem {
  constructor(p) {
    this.p = p;
    this.branches = [];
    this.growthRate = 0.02;
    this.maxDepth = 5;
  }

  generateBranch(x, y, angle, depth) {
    const p = this.p;
    const length = p.map(depth, 0, this.maxDepth, 100, 20);
    const endX = x + p.cos(angle) * length;
    const endY = y + p.sin(angle) * length;
    
    return {
      start: { x, y },
      end: { x: endX, y: endY },
      depth,
      angle,
      growth: 0
    };
  }

  grow() {
    if (this.branches.length === 0) {
      this.branches.push(this.generateBranch(this.p.width/2, this.p.height, -this.p.PI/2, 0));
    }

    for (let i = this.branches.length - 1; i >= 0; i--) {
      const branch = this.branches[i];
      if (branch.growth < 1 && branch.depth < this.maxDepth) {
        branch.growth += this.growthRate;
        if (branch.growth >= 1 && branch.depth < this.maxDepth - 1) {
          const newAngle1 = branch.angle - this.p.PI/4 + this.p.random(-0.2, 0.2);
          const newAngle2 = branch.angle + this.p.PI/4 + this.p.random(-0.2, 0.2);
          this.branches.push(this.generateBranch(branch.end.x, branch.end.y, newAngle1, branch.depth + 1));
          this.branches.push(this.generateBranch(branch.end.x, branch.end.y, newAngle2, branch.depth + 1));
        }
      }
    }
  }

  draw(buffer) {
    // 使用渐变色彩绘制植物
    this.branches.forEach(branch => {
      const growth = branch.growth;
      if (growth > 0) {
        const currentEndX = this.p.lerp(branch.start.x, branch.end.x, growth);
        const currentEndY = this.p.lerp(branch.start.y, branch.end.y, growth);
        
        // 根据深度使用不同的颜色，创建渐变效果
        const colorDepth = this.p.map(branch.depth, 0, this.maxDepth, 0, 1);
        const r = this.p.lerp(180, 100, colorDepth); // 从浅青色到深青色
        const g = this.p.lerp(230, 180, colorDepth);
        const b = this.p.lerp(220, 255, colorDepth);
        
        buffer.stroke(r, g, b, 180);
        buffer.strokeWeight(this.p.map(branch.depth, 0, this.maxDepth, 5, 1.5));
        
        // 添加发光效果
        buffer.drawingContext.shadowBlur = 8;
        buffer.drawingContext.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
        
        buffer.line(branch.start.x, branch.start.y, currentEndX, currentEndY);
        buffer.drawingContext.shadowBlur = 0; // 重置阴影效果
        
        // 在枝干末端添加粒子效果
        if (branch.depth > 2 && growth > 0.8) {
          buffer.noStroke();
          buffer.fill(r, g, b, 120);
          buffer.ellipse(currentEndX, currentEndY, 3, 3);
        }
      }
    });
  }
}

class RenderSystem {
  constructor() {
    this.glitchParams = {
      pixelOffset: 0,
      colorSplit: 0,
      waveDistortion: 0,
      scanlineOffset: 0,
      noiseAmount: 0.2,
      vignette: 0.8
    };
    this.noiseScale = 0.01;
    this.noiseOffset = 0;
  }

  applyPixelOffset(buffer, amount) {
    buffer.loadPixels();
    for (let i = 0; i < buffer.pixels.length; i += 4) {
      if (Math.random() < amount * 0.1) {
        const offset = Math.floor(Math.random() * 50) * 4;
        if (i + offset < buffer.pixels.length) {
          [buffer.pixels[i], buffer.pixels[i+1], buffer.pixels[i+2]] =
          [buffer.pixels[i+offset], buffer.pixels[i+offset+1], buffer.pixels[i+offset+2]];
        }
      }
    }
    buffer.updatePixels();
  }

  applyColorSplit(buffer, amount) {
    const splitBuffer = buffer.get();
    buffer.push();
    buffer.blendMode(buffer.ADD);
    
    // 使用更艺术化的颜色通道分离
    // 青色通道 (更冷调的色彩)
    buffer.tint(0, 220, 255);
    buffer.image(splitBuffer, amount * 5, 0);
    
    // 绿色通道 (中性色调)
    buffer.tint(80, 220, 100);
    buffer.image(splitBuffer, 0, 0);
    
    // 紫色通道 (暖色调)
    buffer.tint(180, 100, 255);
    buffer.image(splitBuffer, -amount * 5, 0);
    
    buffer.pop();
  }

  applyWaveDistortion(buffer, amount) {
    const waveBuffer = buffer.get();
    buffer.clear();
    
    // 使用更小的瓦片尺寸，创造更精细的波纹效果
    const tileSize = 8;
    const cols = buffer.width / tileSize;
    const rows = buffer.height / tileSize;
    
    this.noiseOffset += 0.005; // 随时间缓慢变化的噪声
    
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const sx = i * tileSize;
        const sy = j * tileSize;
        
        // 使用多层正弦波创造更复杂的波纹效果
        const dx = sx + Math.sin(j * 0.1 + amount + this.noiseOffset) * amount * 6 + 
                   Math.sin(j * 0.05 - this.noiseOffset) * amount * 3;
        const dy = sy + Math.cos(i * 0.1 + amount - this.noiseOffset) * amount * 6 + 
                   Math.cos(i * 0.05 + this.noiseOffset * 2) * amount * 3;
        
        buffer.copy(
          waveBuffer,
          sx, sy, tileSize, tileSize,
          dx, dy, tileSize, tileSize
        );
      }
    }
  }
}

// 交互系统
class InteractionSystem {
  constructor() {
    this.mousePos = { x: 0, y: 0 };
    this.isDragging = false;
  }

  handleClick(x, y) {
    // 处理点击事件
    return { x, y, radius: 50 }; // 影响区域
  }

  handleDrag(x, y) {
    // 处理拖拽事件
    this.mousePos = { x, y };
  }
}

// 环境系统
class EnvironmentSystem {
  constructor() {
    this.time = new Date();
    this.weather = 'sunny'; // 模拟天气状态
  }

  update() {
    this.time = new Date();
    // 根据时间更新故障参数
    const hour = this.time.getHours();
    const isNight = hour < 6 || hour > 18;
    return {
      glitchIntensity: isNight ? 1.5 : 0.5,
      colorSplitIntensity: isNight ? 2.0 : 0.3,
      noiseIntensity: this.weather === 'rainy' ? 2.0 : 0.5
    };
  }
}

// 主应用
const sketch = (p) => {
  let renderSystem;
  let interactionSystem;
  let environmentSystem;
  let plantSystem;
  let mainBuffer;

  p.setup = () => {
    p.createCanvas(window.innerWidth, window.innerHeight);
    p.pixelDensity(1);
    mainBuffer = p.createGraphics(p.width, p.height);
    
    renderSystem = new RenderSystem();
    interactionSystem = new InteractionSystem();
    environmentSystem = new EnvironmentSystem();
    plantSystem = new PlantSystem(p);
    
    // 设置更平滑的动画
    p.frameRate(60);
  };

  p.draw = () => {
    // 更新环境参数
    const envParams = environmentSystem.update();
    
    // 使用渐变背景替代纯黑色
    mainBuffer.push();
    const c1 = p.color(10, 15, 30); // 深蓝黑色
    const c2 = p.color(30, 10, 40); // 深紫黑色
    
    // 创建渐变背景
    for(let y = 0; y < mainBuffer.height; y++){
      const inter = p.map(y, 0, mainBuffer.height, 0, 1);
      const c = p.lerpColor(c1, c2, inter);
      mainBuffer.stroke(c);
      mainBuffer.line(0, y, mainBuffer.width, y);
    }
    mainBuffer.pop();
    
    // 添加微妙的背景噪点
    mainBuffer.push();
    mainBuffer.noStroke();
    for (let i = 0; i < 100; i++) {
      const x = p.random(mainBuffer.width);
      const y = p.random(mainBuffer.height);
      const size = p.random(1, 2);
      mainBuffer.fill(200, 220, 255, p.random(5, 20));
      mainBuffer.ellipse(x, y, size, size);
    }
    mainBuffer.pop();
    
    // 更新和绘制植物系统
    plantSystem.grow();
    plantSystem.draw(mainBuffer);
    
    // 应用故障效果
    renderSystem.applyPixelOffset(mainBuffer, envParams.glitchIntensity);
    renderSystem.applyColorSplit(mainBuffer, envParams.colorSplitIntensity);
    renderSystem.applyWaveDistortion(mainBuffer, envParams.noiseIntensity);
    
    // 添加扫描线效果
    mainBuffer.push();
    mainBuffer.noFill();
    
    // 使用渐变色扫描线
    for (let y = 0; y < mainBuffer.height; y += 4) {
      // 根据位置变化颜色
      const scanlineAlpha = p.map(p.sin(y * 0.01 + p.frameCount * 0.02), -1, 1, 15, 35);
      const scanlineColor = p.map(p.sin(p.frameCount * 0.01), -1, 1, 180, 220);
      mainBuffer.stroke(scanlineColor, scanlineColor + 20, 255, scanlineAlpha);
      mainBuffer.line(0, y + renderSystem.glitchParams.scanlineOffset, mainBuffer.width, y + renderSystem.glitchParams.scanlineOffset);
    }
    
    // 添加噪点纹理
    mainBuffer.loadPixels();
    for (let i = 0; i < mainBuffer.pixels.length; i += 4) {
      if (Math.random() < renderSystem.glitchParams.noiseAmount) {
        const noiseValue = Math.random() * 255;
        mainBuffer.pixels[i] = mainBuffer.pixels[i] * 0.8 + noiseValue * 0.2;
        mainBuffer.pixels[i+1] = mainBuffer.pixels[i+1] * 0.8 + noiseValue * 0.2;
        mainBuffer.pixels[i+2] = mainBuffer.pixels[i+2] * 0.8 + noiseValue * 0.2;
      }
    }
    mainBuffer.updatePixels();
    
    // 添加暗角效果
    mainBuffer.noFill();
    for (let i = 0; i < 20; i++) {
      const alpha = p.map(i, 0, 20, 0, 80 * renderSystem.glitchParams.vignette);
      mainBuffer.stroke(0, alpha);
      mainBuffer.ellipse(mainBuffer.width/2, mainBuffer.height/2, 
                        mainBuffer.width - i * 10, mainBuffer.height - i * 10);
    }
    
    mainBuffer.pop();
    
    // 显示最终结果
    p.image(mainBuffer, 0, 0);
  };

  p.mousePressed = () => {
    const area = interactionSystem.handleClick(p.mouseX, p.mouseY);
    // 增加更明显的故障效果
    renderSystem.glitchParams.pixelOffset += 1.5;
    renderSystem.glitchParams.noiseAmount += 0.3;
    
    // 添加更强烈的点击视觉反馈
    mainBuffer.push();
    // 创建多层发光效果
    for (let i = 0; i < 3; i++) {
      const size = 120 - i * 20;
      const alpha = 150 - i * 30;
      mainBuffer.noStroke();
      mainBuffer.fill(200, 220, 255, alpha);
      mainBuffer.drawingContext.shadowBlur = 30;
      mainBuffer.drawingContext.shadowColor = 'rgba(150, 200, 255, 0.9)';
      mainBuffer.ellipse(p.mouseX, p.mouseY, size, size);
    }
    
    // 添加爆炸式粒子效果
    for (let i = 0; i < 20; i++) {
      const angle = p.random(p.TWO_PI);
      const distance = p.random(30, 100);
      const x = p.mouseX + Math.cos(angle) * distance;
      const y = p.mouseY + Math.sin(angle) * distance;
      mainBuffer.fill(255, 255, 255, p.random(100, 200));
      mainBuffer.ellipse(x, y, p.random(2, 8), p.random(2, 8));
    }
    mainBuffer.pop();
    
    // 添加临时故障效果，并在短时间后恢复
    setTimeout(() => {
      renderSystem.glitchParams.noiseAmount = Math.max(0.2, renderSystem.glitchParams.noiseAmount - 0.3);
      renderSystem.glitchParams.pixelOffset = Math.max(0, renderSystem.glitchParams.pixelOffset - 1);
    }, 500);
  };

  p.mouseDragged = () => {
    interactionSystem.handleDrag(p.mouseX, p.mouseY);
    renderSystem.glitchParams.waveDistortion += 0.1;
    
    // 添加拖拽视觉反馈 - 创建轨迹效果
    mainBuffer.push();
    mainBuffer.noStroke();
    mainBuffer.fill(180, 100, 255, 40);
    mainBuffer.drawingContext.shadowBlur = 15;
    mainBuffer.drawingContext.shadowColor = 'rgba(180, 100, 255, 0.5)';
    mainBuffer.ellipse(p.mouseX, p.mouseY, 30, 30);
    mainBuffer.pop();
    
    // 增加随机故障效果
    if (p.random() < 0.2) {
      renderSystem.glitchParams.colorSplit = p.random(0.5, 1.5);
      setTimeout(() => {
        renderSystem.glitchParams.colorSplit = 0;
      }, 300);
    }
  };

  // 响应窗口调整
  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
    mainBuffer = p.createGraphics(p.width, p.height);
  };
};

// 启动应用
new p5(sketch);